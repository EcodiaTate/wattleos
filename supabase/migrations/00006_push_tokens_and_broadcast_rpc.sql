-- supabase/migrations/00006_push_tokens_and_broadcast_rpc.sql
--
-- ============================================================
-- WattleOS V2 - Push Tokens + Broadcast RPC
-- ============================================================
-- 1. device_push_tokens — stores APNs/FCM tokens per user+device
-- 2. create_class_broadcast() — atomic thread+message+recipients
-- ============================================================

-- ============================================================
-- DEVICE PUSH TOKENS
-- ============================================================
-- WHY: Native push notifications require storing device tokens
-- per user per device. A user may have multiple devices (phone +
-- iPad), each with a unique token. Tokens expire and must be
-- refreshed — the UNIQUE constraint on (user_id, token) lets us
-- upsert on re-registration.
-- ============================================================

CREATE TABLE device_push_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id),
  user_id     UUID NOT NULL REFERENCES auth.users(id),
  token       TEXT NOT NULL,
  platform    TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, token)
);

CREATE INDEX idx_push_tokens_tenant_user ON device_push_tokens (tenant_id, user_id);

ALTER TABLE device_push_tokens ENABLE ROW LEVEL SECURITY;

-- Users can manage their own tokens
CREATE POLICY "Users manage own push tokens" ON device_push_tokens
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Service role can read tokens for sending notifications
-- (handled by admin client bypassing RLS)

SELECT apply_updated_at_trigger('device_push_tokens');

-- ============================================================
-- CREATE CLASS BROADCAST (Atomic RPC)
-- ============================================================
-- WHY: Creating a class broadcast requires 3 inserts (thread,
-- message, recipients). Without a transaction, partial failure
-- leaves orphaned records. This function wraps all 3 in a
-- single PostgreSQL transaction.
-- ============================================================

CREATE OR REPLACE FUNCTION create_class_broadcast(
  p_tenant_id UUID,
  p_class_id UUID,
  p_subject TEXT,
  p_initial_message TEXT,
  p_created_by UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_thread_id UUID;
  v_guardian_ids UUID[];
  v_all_recipient_ids UUID[];
BEGIN
  -- 1. Create the thread
  INSERT INTO message_threads (tenant_id, subject, thread_type, class_id, created_by)
  VALUES (p_tenant_id, p_subject, 'class_broadcast', p_class_id, p_created_by)
  RETURNING id INTO v_thread_id;

  -- 2. Create the initial message
  INSERT INTO messages (tenant_id, thread_id, sender_id, content, sent_at)
  VALUES (p_tenant_id, v_thread_id, p_created_by, p_initial_message, now());

  -- 3. Find guardian user_ids for all actively enrolled students in the class
  SELECT ARRAY_AGG(DISTINCT g.user_id)
  INTO v_guardian_ids
  FROM enrollments e
  JOIN guardians g ON g.student_id = e.student_id
    AND g.tenant_id = e.tenant_id
    AND g.deleted_at IS NULL
  WHERE e.class_id = p_class_id
    AND e.status = 'active'
    AND e.deleted_at IS NULL;

  -- Combine sender + guardians (deduplicated)
  v_all_recipient_ids := ARRAY(
    SELECT DISTINCT unnest(
      ARRAY[p_created_by] || COALESCE(v_guardian_ids, ARRAY[]::UUID[])
    )
  );

  -- 4. Create recipients
  INSERT INTO message_recipients (tenant_id, thread_id, user_id, read_at)
  SELECT p_tenant_id, v_thread_id, uid,
         CASE WHEN uid = p_created_by THEN now() ELSE NULL END
  FROM UNNEST(v_all_recipient_ids) AS uid;

  RETURN jsonb_build_object(
    'id', v_thread_id,
    'success', true,
    'recipient_count', array_length(v_all_recipient_ids, 1)
  );
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Broadcast creation failed: %', SQLERRM;
END;
$$;
