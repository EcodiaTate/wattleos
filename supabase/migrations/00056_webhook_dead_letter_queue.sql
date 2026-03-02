-- ============================================================
-- Migration 00056: Webhook Dead-Letter Queue
-- ============================================================
-- Adds:
--   1. webhook_events — stores all incoming webhooks before processing,
--      with retry tracking and dead-letter queue semantics.
--
-- Every webhook from every provider is logged here BEFORE processing.
-- On failure the row stays in 'pending'/'processing' with retry
-- metadata so the cron job can re-process it with exponential backoff.
-- After 5 failures the row is marked 'failed_permanent' and triggers
-- an admin alert.
--
-- Idempotency: event_id is UNIQUE per provider, preventing double-
-- processing even when Stripe/SMS providers retry delivery.
-- ============================================================

CREATE TABLE webhook_events (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- tenant_id is nullable because some webhooks (platform-level Stripe
  -- events like subscription.deleted) arrive before we can resolve the
  -- tenant from metadata. We resolve it during processing.
  tenant_id         UUID        REFERENCES tenants(id) ON DELETE SET NULL,

  -- Which external system sent this webhook
  provider          TEXT        NOT NULL
    CHECK (provider IN ('stripe', 'sms', 'google_drive', 'keypay')),

  -- Provider-specific event type string
  -- e.g. 'invoice.paid', 'delivery.status', 'share.complete'
  event_type        TEXT        NOT NULL,

  -- Provider-assigned unique ID used for deduplication.
  -- For Stripe: event.id. For SMS: message_id.
  -- UNIQUE per provider (not globally) — composite unique below.
  event_id          TEXT        NOT NULL,

  -- Raw request body as JSONB for replayability
  payload           JSONB       NOT NULL DEFAULT '{}',

  -- Processing lifecycle
  status            TEXT        NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'succeeded', 'failed_permanent')),

  processed_at      TIMESTAMPTZ,          -- set on success
  error_message     TEXT,                 -- last failure message
  retry_count       INTEGER     NOT NULL DEFAULT 0,
  next_retry_at     TIMESTAMPTZ,          -- null means not scheduled

  -- Standard metadata
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- One event_id per provider (Stripe reuses event IDs across webhooks
  -- but they are unique within a given Stripe account/endpoint).
  UNIQUE (provider, event_id)
);

-- Auto-update trigger (assumes apply_updated_at_trigger function exists)
SELECT apply_updated_at_trigger('webhook_events');

-- Index for the retry cron: find pending events due for retry
CREATE INDEX idx_webhook_pending_retry
  ON webhook_events (provider, next_retry_at)
  WHERE status IN ('pending', 'processing');

-- Index for dashboard queries: recent events per tenant
CREATE INDEX idx_webhook_tenant_created
  ON webhook_events (tenant_id, created_at DESC)
  WHERE tenant_id IS NOT NULL;

-- Index for success-rate chart (provider + status + created_at)
CREATE INDEX idx_webhook_provider_status_created
  ON webhook_events (provider, status, created_at DESC);

-- ============================================================
-- Row-Level Security
-- ============================================================
-- Only service role (cron jobs, webhook handlers) may insert/update.
-- Authenticated admins may SELECT for the dashboard.
-- No tenant isolation here because some events have no tenant_id
-- yet; the application layer handles filtering.
-- ============================================================

ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

-- Admins can read all webhook events for their tenant
CREATE POLICY "Admins can view webhook events for their tenant"
  ON webhook_events FOR SELECT
  USING (
    tenant_id = current_tenant_id()
    OR tenant_id IS NULL  -- platform-level events visible to super-admins
  );

-- Service role (SUPABASE_SERVICE_ROLE_KEY) bypasses RLS, so
-- webhook handlers and cron jobs can write without a policy.
GRANT SELECT ON webhook_events TO authenticated;
GRANT INSERT, UPDATE ON webhook_events TO service_role;
