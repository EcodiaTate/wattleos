P0 — CRITICAL (Fix before any deployment)
Prompt 1: RLS — fee_notice_deliveries missing RLS

In the WattleOS Supabase migrations, the `fee_notice_deliveries` table (migration 00045) has NO row-level security enabled. This is a critical cross-tenant data exposure.

Create a new migration that:
1. Runs `ALTER TABLE fee_notice_deliveries ENABLE ROW LEVEL SECURITY;`
2. Adds a SELECT policy scoped to `current_tenant_id()` via a join to `fee_notices` (which has `tenant_id`)
3. Adds an INSERT policy with `WITH CHECK` scoped the same way
4. Adds UPDATE and DELETE policies scoped the same way
5. Adds a `TO service_role` bypass policy if needed for cron/admin operations

Follow existing migration naming conventions.
Prompt 2: RLS — oauth_state_tokens wide-open ALL policy

In WattleOS, the `oauth_state_tokens` table (migration 00048) has an ALL policy using `USING(true) WITH CHECK(true)` — any authenticated user can read/write any tenant's OAuth CSRF tokens. This is a session hijack vector.

Create a new migration that:
1. Drops the existing wide-open ALL policy on `oauth_state_tokens`
2. Replaces it with a policy restricted to `service_role` only (these tokens should only be managed server-side)
3. If there's a legitimate need for the creating user to read their own token, add a SELECT policy scoped to `user_id = auth.uid()` with a short TTL check
Prompt 3: SECURITY DEFINER — create_class_broadcast() tenant validation

The `create_class_broadcast()` SECURITY DEFINER function (migration 00006) accepts `p_tenant_id` as a parameter and uses it directly to insert into `message_threads`, `messages`, and `message_recipients` — bypassing RLS with no tenant validation. A caller can inject data into any tenant's messaging system.

Create a new migration that:
1. Replaces the `create_class_broadcast()` function with a version that validates `p_tenant_id = current_tenant_id()` at the top, raising an exception if they don't match: `IF p_tenant_id != current_tenant_id() THEN RAISE EXCEPTION 'tenant_id mismatch'; END IF;`
2. Keep all other logic identical
Prompt 4: Server actions — checkRatioBreaches() and checkIncidentNqaEscalations() no auth

In WattleOS, `checkRatioBreaches()` in ratios.ts and `checkIncidentNqaEscalations()` in incidents.ts are exported as public "use server" functions that use the admin client to query ALL tenants' ratio breaches and serious incidents (including child injury/abuse reports) with no authentication.

Fix both functions:
1. These should NOT be exported server actions callable from the client. They should only be callable from cron API routes.
2. Remove the "use server" export or make them internal non-exported functions
3. Create cron-only API routes (e.g., `/api/cron/ratio-breach-check` and `/api/cron/incident-escalation-check`) that are gated by `CRON_SECRET` bearer token validation
4. Move the logic into those cron routes, or have the routes call the functions internally (not exported)
5. Ensure the cron routes validate the `Authorization: Bearer ${CRON_SECRET}` header before executing
Prompt 5: Server action — retryWebhookEvent() missing tenant scoping

In WattleOS, `retryWebhookEvent()` in webhooks.ts uses the admin client to look up webhook events by ID only, with no `.eq("tenant_id", ...)`. A staff member at Tenant A could retry a webhook belonging to Tenant B, potentially triggering cross-tenant payment processing.

Fix:
1. Get the current user's tenant_id from the session/context
2. Add `.eq("tenant_id", tenantId)` to both the SELECT lookup and any UPDATE query on webhook_events
3. If the webhook event doesn't belong to the user's tenant, return an error
Prompt 6: Server action — resolveRecipientIds() missing tenant filter

In WattleOS, `resolveRecipientIds()` in push-notifications.ts queries `class_enrollments` and `program_bookings` by `class_id`/`program_id` only — no tenant filter. This could leak guardian IDs across tenants and send notifications to wrong-school parents.

Fix:
1. Add `.eq("tenant_id", tenantId)` to the `class_enrollments` query
2. Add `.eq("tenant_id", tenantId)` to the `program_bookings` query
3. Ensure `tenantId` is derived from the authenticated session context, not a parameter
Prompt 7: Fix current_tenant_id() fail-open RLS function

In WattleOS migration 00001_foundation.sql, the `current_tenant_id()` function returns the all-zeros UUID `'00000000-0000-0000-0000-000000000000'::UUID` as a fallback when tenant_id is absent from the JWT. This is a fail-open vulnerability — any policy using `tenant_id = current_tenant_id()` would match rows that happen to have the all-zeros UUID.

Create a new migration that replaces the `current_tenant_id()` function to return NULL instead of the all-zeros UUID when the JWT tenant_id claim is missing. This makes all RLS policies fail closed (no rows matched) instead of fail open.
Prompt 8: Encrypt sensitive medical/disability fields

In WattleOS, 4 tables store sensitive medical/disability data in plaintext despite an existing encryption utility (`src/lib/utils/encryption.ts` — AES-256-GCM). The fields that need encryption:

1. `medical_conditions` — condition_name, details, treatment_plan
2. `nccd_register_entries` — disability_subcategory, disability_category
3. `individual_learning_plans` — child_strengths, family_goals, background_information
4. `daily_care_logs` — general_notes (when containing medical/behavioural content)

Do the following:
1. For each table, update the server actions that READ these fields to call `decryptField()` after fetching
2. For each table, update the server actions that WRITE these fields to call `encryptField()` before inserting/updating
3. Follow the exact pattern used in `src/lib/actions/sms-gateway.ts` for encrypt/decrypt
4. Create a new migration script that encrypts all existing plaintext rows in these 4 tables (batch process with transaction safety)
5. Add a column `_encrypted BOOLEAN DEFAULT false` to track migration progress if needed, or use a marker approach
Prompt 9: Throw on missing FIELD_ENCRYPTION_KEY in production

In WattleOS `src/lib/utils/encryption.ts`, if `FIELD_ENCRYPTION_KEY` is missing from the environment, the utility falls back to returning plaintext with no error. In production this must throw.

Fix:
1. In `encryption.ts`, at the top of `encryptField()` and `decryptField()`, add: if `process.env.NODE_ENV === 'production'` and the key is missing, throw an error immediately
2. Do NOT silently return plaintext in production — this defeats the entire purpose of encryption
3. In development/test, the existing fallback behavior can remain for convenience
Prompt 10: Activate SessionTimeout component

In WattleOS, a full `<SessionTimeout />` component exists at `session-timeout.tsx` (15-min idle, 60s warning, cross-tab logout) but is NEVER rendered in any layout. Zero imports found in `src/app/`.

On shared classroom iPads, a guide walks away and the next person has full access to student medical records and custody restrictions.

Fix:
1. Import and render `<SessionTimeout />` in the main authenticated app layout (likely `src/app/(app)/layout.tsx` or similar)
2. Verify the component works correctly — 15min idle timeout, 60s warning modal, cross-tab logout detection
3. Do not modify the component itself — just mount it
Prompt 11: Demo mode production guard

In WattleOS, `NEXT_PUBLIC_DEMO_MODE=true` bypasses ALL authentication — every visitor gets a mock Owner context with ALL 196+ permissions. There is no runtime safeguard preventing this in production.

Fix:
1. In `demo-mode.ts` (or wherever `isDemoMode()` is defined), add as the FIRST line: `if (process.env.NODE_ENV === 'production') return false;`
2. This ensures demo mode can NEVER be active in a production build regardless of env vars
3. Also add a check in `proxy.ts` middleware if it references demo mode directly
Prompt 12: Write Incident Response Plan document

WattleOS has no documented Incident Response Plan (IRP), which is a critical gap for NDB (Notifiable Data Breaches) compliance under the Privacy Act 1988.

Create a file `docs/INCIDENT-RESPONSE-PLAN.md` with a complete IRP containing:

1. **Definitions** — What constitutes a notifiable data breach under the Privacy Act 1988 (personal info + risk of serious harm). Include examples specific to WattleOS (e.g., cross-tenant data exposure, medical record leak, custody data breach).
2. **Detection triggers** — Automated alerts (Sentry errors, audit log anomalies, failed login spikes) + manual report pathway (staff reporting suspicious activity)
3. **Containment steps** — Tenant kill switch (`tenants.is_active = false`), force-logout all sessions, API key rotation via Supabase dashboard, isolate affected tenant
4. **Scope determination** — How to use `audit_logs` table to identify affected schools/students (filter by tenant_id, entity_type, date range, sensitivity level, CSV export)
5. **Notification timeline** — OAIC: within 30 days of becoming aware. Affected individuals: "as soon as practicable". Include escalation timing.
6. **Escalation chain** — Security Lead → CTO → CEO → Legal → OAIC notification (Statement form). Include role responsibilities.
7. **Communication templates** — Pre-drafted notification email to affected schools. Pre-drafted notification to affected parents. Pre-drafted OAIC statement.
8. **Post-incident review** — Root cause analysis template, remediation tracking, lessons learned, policy updates
9. **Testing** — Schedule for annual tabletop exercises and quarterly review of the plan

Make it practical and specific to WattleOS's architecture (Supabase, multi-tenant, Australian education sector). Reference actual tables, tools, and capabilities that exist.
Prompt 13: Integrate Sentry error tracking

WattleOS has NO error tracking service. No real-time alerts exist for unhandled exceptions, high error rates, critical audit log events, or auth failures.

Integrate Sentry:
1. Install `@sentry/nextjs` package
2. Create `sentry.client.config.ts`, `sentry.server.config.ts`, and `sentry.edge.config.ts` with proper DSN configuration from `SENTRY_DSN` env var
3. Wrap `next.config.mjs` with `withSentryConfig()`
4. Add `instrumentation.ts` for server-side Sentry init (Next.js 15+ pattern)
5. Configure:
   - Environment tagging (production/staging/development)
   - Sample rate: 1.0 for errors, 0.1 for performance
   - Scrub PII: set `sendDefaultPii: false`
   - Filter out known benign errors (e.g., `NEXT_NOT_FOUND`)
6. Add `SENTRY_DSN` and `SENTRY_AUTH_TOKEN` to `.env.example`
7. Do NOT add any analytics/session replay — error tracking only
P1 — HIGH (Fix this sprint)
Prompt 14: Replace all LIMIT 1 tenant scoping patterns

In WattleOS, 13+ tables across migrations 00040, 00059, 00060, 00062, 00063, 00064 use a non-deterministic RLS pattern:

`tenant_id = (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid() LIMIT 1)`

For users belonging to multiple tenants, LIMIT 1 without ORDER BY is non-deterministic — the user could see School A's data while logged into School B. Affected tables include naplan_domain_results (student academic results), visitor_sign_in_records, contractor_sign_in_records, and all accreditation tables.

Create a new migration that:
1. Drops all existing RLS policies on these tables that use the `LIMIT 1` pattern
2. Replaces them with policies using `current_tenant_id()` (the JWT-based helper function) which is deterministic
3. Affected tables (verify each one): cosmic_great_lessons, cosmic_units, cosmic_unit_studies, cosmic_unit_participants, cosmic_study_records, visitor_sign_in_records, contractor_sign_in_records, naplan_test_windows, naplan_cohort_entries, naplan_domain_results, accreditation_criteria (00062 version), accreditation_cycles (00062), accreditation_assessments (00062), accreditation_evidence (00062), observation_tag_suggestions, montessori_hub_articles, montessori_hub_reads, montessori_hub_feedback
4. Each new policy should use `USING (tenant_id = current_tenant_id())` and include proper `WITH CHECK` clauses
Prompt 15: Fix notification_delivery_log and notification_topic_prefs cross-tenant leak

In WattleOS migration 00031, `notification_delivery_log` and `notification_topic_prefs` have SELECT policies scoped to `user_id = auth.uid()` only — no tenant scoping. A multi-tenant user sees delivery logs and notification preferences from ALL their tenants.

Create a new migration that:
1. Drops the existing SELECT policy on `notification_delivery_log`
2. Replaces it with one that includes `tenant_id = current_tenant_id()` AND `user_id = auth.uid()`
3. Drops the existing policies on `notification_topic_prefs`
4. Replaces them with policies that include `tenant_id = current_tenant_id()` AND `user_id = auth.uid()`
5. If these tables don't have a `tenant_id` column, add one via the migration and backfill from related tables
Prompt 16: counsellor_case_notes permission gate

In WattleOS migration 00018, `counsellor_case_notes` RLS policy is `tenant_id = current_tenant_id()` with no permission gate. Any authenticated user in the tenant can read all counsellor case notes (professional privilege material) if they bypass the app layer.

Create a new migration that:
1. Drops the existing policy on `counsellor_case_notes`
2. Adds a SELECT policy requiring `tenant_id = current_tenant_id() AND has_permission(auth.uid(), 'view_counsellor_notes')`
3. Adds an INSERT policy requiring `tenant_id = current_tenant_id() AND has_permission(auth.uid(), 'manage_counsellor_notes')`
4. Adds an UPDATE policy with the same manage permission
5. If `view_counsellor_notes` and `manage_counsellor_notes` don't exist in the permissions table, add them and assign them to appropriate roles (Owner, Administrator, Head of School, Lead Guide — NOT Guide, Assistant, or Parent)
Prompt 17: tuckshop tables — add RLS policies

In WattleOS migration 00046, all 5 tuckshop tables have RLS enabled but ZERO policies defined. This means all access is denied (including via anon key). Only service_role can access. Also, `tuckshop_order_items` has no `tenant_id` column.

Create a new migration that:
1. Adds a `tenant_id UUID REFERENCES tenants(id)` column to `tuckshop_order_items` if it doesn't exist (backfill from parent `tuckshop_orders`)
2. For all 5 tuckshop tables (`tuckshop_suppliers`, `tuckshop_menu_items`, `tuckshop_delivery_weeks`, `tuckshop_orders`, `tuckshop_order_items`):
   - Add SELECT policy: `USING (tenant_id = current_tenant_id())`
   - Add INSERT policy: `WITH CHECK (tenant_id = current_tenant_id())`
   - Add UPDATE policy: `USING (tenant_id = current_tenant_id()) WITH CHECK (tenant_id = current_tenant_id())`
   - Add DELETE policy: `USING (tenant_id = current_tenant_id())`
3. For order tables, also consider parent (guardian) read access for their own orders
Prompt 18: next_invoice_number() — restrict access

The `next_invoice_number()` SECURITY DEFINER function (migration 00028) accepts any `p_tenant_id` and bypasses RLS. A caller can learn the invoice count for any school.

Create a new migration that:
1. Replaces `next_invoice_number()` with a version that validates `p_tenant_id = current_tenant_id()` and raises an exception on mismatch
2. OR revokes EXECUTE from public and grants it to service_role only: `REVOKE EXECUTE ON FUNCTION next_invoice_number FROM PUBLIC; GRANT EXECUTE ON FUNCTION next_invoice_number TO service_role;`
Prompt 19: Sanitize newsletter HTML (XSS)

In WattleOS, newsletter `body_html` is rendered with `dangerouslySetInnerHTML` in at least three components without sanitisation. A compromised admin account could inject scripts that exfiltrate session tokens or student data from parent-facing views.

Fix:
1. Install `dompurify` and `@types/dompurify` (or `isomorphic-dompurify` for SSR compatibility)
2. Find all components that render newsletter `body_html` with `dangerouslySetInnerHTML`
3. Sanitize the HTML with DOMPurify BEFORE passing it to `dangerouslySetInnerHTML`: `dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(body_html) }}`
4. ALSO sanitize on INSERT — in the server action that saves newsletter content, run DOMPurify.sanitize() before storing to the database
5. Configure DOMPurify to strip all script tags, event handlers, and dangerous attributes while keeping formatting HTML (p, h1-h6, strong, em, ul, ol, li, a, img, br, table, tr, td, th, blockquote)
Prompt 20: Switch Google Fonts to next/font/google

WattleOS loads Google Fonts via `@import url(https://fonts.googleapis.com/...)` in globals.css and also in homepage-client.tsx and wattleos/components.tsx. This sends every user's IP address, User-Agent, and Referer to Google on every page load — including children.

Fix:
1. Remove the `@import url(https://fonts.googleapis.com/...)` from `globals.css`
2. Remove any Google Fonts CDN references from `homepage-client.tsx` and `wattleos/components.tsx`
3. Replace with `next/font/google` imports in the root layout (or appropriate layout files):
   ```tsx
   import { Inter, /* other fonts */ } from 'next/font/google'
   const inter = Inter({ subsets: ['latin'], display: 'swap' })
Apply the font className to the <body> or <html> tag
This downloads fonts at build time and serves them from the same origin — zero external requests at runtime


### Prompt 21: Failed login tracking and lockout
WattleOS has no failed login attempt tracking. No alerts after repeated failures, no brute-force lockout. Since Supabase Auth handles failures before server actions run, this is a genuine gap.

Implement:

Create a new table auth_failed_logins with columns: id, email, ip_address, user_agent, attempted_at, metadata JSONB
Enable RLS and add a service_role-only policy
Hook into Supabase Auth webhooks (or use the auth.users changes webhook) to capture failed login events
Alternatively, if using Supabase Auth hooks, create a Supabase Edge Function or webhook handler at /api/webhooks/auth that:
Receives auth events from Supabase
Logs failed attempts with IP, email, timestamp, and outcome='failure' to auth_failed_logins
After 10 failed attempts from the same email within 15 minutes, triggers a lockout (temporary ban via Supabase Admin API auth.admin.updateUserById(userId, { ban_duration: '15m' }))
Add an audit log entry for each failed login: logAuditSystem('AUTH_LOGIN_FAILED', ...)
Consider adding a Slack/webhook alert when lockout threshold is hit


### Prompt 22: Add outcome field to audit_logs
WattleOS audit_logs has no outcome field — all logged events are assumed successful. Failed operations that throw before logAudit() runs are silently unrecorded. This is a forensic gap.

Fix:

Create a migration adding outcome TEXT CHECK (outcome IN ('success', 'failure', 'partial')) DEFAULT 'success' to audit_logs
Update logAudit() and logAuditSystem() in src/lib/actions/audit-logs.ts to accept an optional outcome parameter
In server actions that currently call logAudit(), wrap the main logic in try/catch and log with outcome: 'failure' in the catch block before re-throwing
Focus on the most critical actions first: student CRUD, medical records, enrollment, billing, role/permission changes


### Prompt 23: Student record VIEW logging
WattleOS logs mutations to student records but not read access. ST4S requires knowing who accessed a child's record, not just who changed it.

Fix:

In the server actions that fetch individual student profiles (e.g., getStudent(), getStudentProfile(), or similar), add a logAudit() call with action like 'STUDENT_PROFILE_VIEWED', sensitivity='low'
Do the same for medical record views, counsellor case note views, and custody/safety data views (these should be sensitivity='high')
Do NOT log bulk list views (e.g., class list) — only individual profile access
Keep the audit entries lightweight — entity_type, entity_id, user_id, tenant_id, timestamp


### Prompt 24: Implement MFA enrollment for admin roles
WattleOS has zero MFA/2FA/TOTP implementation. No enrollment, no enforcement, no backup codes. Under APP 11, MFA should be available and enforceable for admin/staff roles handling children's data.

Implement:

Supabase supports TOTP natively. Use the Supabase MFA API:
supabase.auth.mfa.enroll({ factorType: 'totp' }) — returns QR code
supabase.auth.mfa.challenge() — creates a challenge
supabase.auth.mfa.verify() — verifies TOTP code
Create an MFA enrollment page/modal accessible from user settings
Create an MFA verification step that triggers on login for users who have MFA enrolled
Add a tenant-level setting require_mfa_for_roles (array of role names) — default to requiring MFA for Owner and Administrator
In the auth flow (after OAuth callback), check if the user's role requires MFA and if they have a factor enrolled:
If required but not enrolled → redirect to enrollment page
If enrolled → redirect to verification challenge
Add backup codes generation during enrollment (store hashed in DB)
Add a permission manage_mfa_policy for configuring which roles require MFA


### Prompt 25: Server-side session revocation
In WattleOS, signOutAction() clears cookies but does not invalidate the token server-side. A stolen JWT remains valid until natural expiry (1 hour).

Fix:

Add a signed_out_at TIMESTAMPTZ column to the tenant_users table (or a separate session_revocations table)
In signOutAction(), after clearing cookies, also set signed_out_at = now() for the user
In the auth middleware (proxy.ts or wherever JWT is validated), after verifying the JWT exists:
Extract the iat (issued at) claim from the JWT
Query signed_out_at for the user
If signed_out_at > iat, reject the request (force re-authentication)
Also use Supabase Admin API to revoke refresh tokens: supabase.auth.admin.signOut(userId, 'global')
Build a force-logout endpoint for admin use that sets signed_out_at = now() for a target user and calls the Supabase Admin API to ban temporarily


### Prompt 26: Configure JWT expiry
WattleOS has no explicit JWT expiry configuration — it uses the Supabase default of 3600s (1 hour).

Fix:

In supabase/config.toml, add under [auth]:

[auth]
jwt_expiry = 1800  # 30 minutes for tighter security
Document this choice in docs/SECURITY-DECISIONS.md explaining why 30 minutes was chosen (balance between UX and security for a platform handling children's sensitive data)
Supabase refresh tokens handle seamless re-authentication, so users won't notice the shorter window


---

## P2 — MEDIUM (Next sprint)

### Prompt 27: Add WITH CHECK clauses to ~18 tables
In WattleOS, approximately 18 tables use implicit USING-only RLS patterns without explicit WITH CHECK clauses. Without WITH CHECK, INSERT/UPDATE operations inherit the USING clause, which may not enforce the correct tenant scoping on writes.

Search for all tables flagged with "No WITH CHECK" in the security audit:

photo_sessions, person_photos, id_card_templates (00015)
recurring_billing_setups, recurring_billing_schedules, billing_payment_attempts, billing_failures (00032)
school_events, event_rsvps (00033)
environment_plans, plan_shelf_slots, rotation_schedules (00035)
accreditation_cycles, accreditation_assessments, accreditation_evidence (00036)
excursion_transport_bookings (00037)
previous_school_records (00038)
acara_report_periods, acara_student_records (00039)
Create a migration that for each table:

Drops the existing ALL policy
Creates separate SELECT, INSERT, UPDATE, DELETE policies with explicit WITH CHECK (tenant_id = current_tenant_id()) on INSERT and UPDATE


### Prompt 28: Add permission checks to newsletter, fee notice, report builder, sensitive period tables
In WattleOS, several tables have tenant scoping but no permission checks in RLS:

newsletter_templates, newsletters, newsletter_sections, newsletter_recipients (00065) — any staff member can read/write all newsletters
fee_notice_configs, fee_notices (00045) — any staff member can manage fee notices
report_builder_students (00051) — any staff member can access report builder data
sensitive_period_materials (00055) — any staff member can manage sensitive period materials
Create a migration that adds appropriate has_permission() checks to each table's RLS policies. Use permissions like:

manage_newsletters / view_newsletters for newsletter tables
manage_billing / view_billing for fee notice tables
manage_reports / view_reports for report builder
manage_curriculum for sensitive period materials
Add these permissions to the permissions table if they don't exist and assign them to appropriate roles.



### Prompt 29: Add deleted_at IS NULL filter to tenant_members subqueries
In WattleOS, RLS policies that use tenant_members subqueries for tenant scoping do not filter on deleted_at IS NULL. A deactivated user's tenant_members row (if soft-deleted) could still match.

Search all migrations for RLS policies containing tenant_members subqueries and ensure each one includes AND deleted_at IS NULL (or AND tm.deleted_at IS NULL). Create a single migration that updates all affected policies.



### Prompt 30: Fix device_push_tokens tenant scoping
In WattleOS, device_push_tokens (migration 00006) has an RLS policy scoped to auth.uid() only — no tenant_id check. In a multi-tenant scenario, push tokens from all tenants are accessible.

Create a migration that:

Adds tenant_id column to device_push_tokens if it doesn't exist
Updates the RLS policy to include tenant_id = current_tenant_id() AND user_id = auth.uid()
Backfills existing rows from the user's current tenant_members association


### Prompt 31: Fix sms_gateway_config and sms_messages tenant scoping
In WattleOS, sms_gateway_config and sms_messages (migration 00030) have implicit tenant scoping via permission checks but no explicit tenant_id guard in RLS policies.

Create a migration that adds explicit tenant_id = current_tenant_id() to all policies on both tables, in addition to the existing permission checks.



### Prompt 32: Fix sign_in_out_records inconsistent JWT pattern
In WattleOS, sign_in_out_records (migration 00017) uses raw JWT extraction for tenant scoping instead of the current_tenant_id() helper function. This is inconsistent with the rest of the codebase.

Create a migration that replaces the raw JWT extraction with current_tenant_id() in the RLS policies for sign_in_out_records.



### Prompt 33: Fix webhook_events platform events exposure
In WattleOS, webhook_events (migration 00056) has a SELECT policy with an OR NULL condition that may expose platform-wide events to tenant users.

Create a migration that tightens the SELECT policy to only allow viewing events belonging to the user's current tenant: tenant_id = current_tenant_id(). Remove the OR tenant_id IS NULL condition or restrict it to service_role.



### Prompt 34: Fix ratio_breach_alert_log tenant check
In WattleOS, ratio_breach_alert_log (migration 00053) has implicit tenant scoping via has_permission() but no direct tenant_id check.

Create a migration that adds explicit tenant_id = current_tenant_id() to the SELECT policy alongside the permission check.



### Prompt 35: Fix montessori_hub_reads and montessori_hub_feedback impersonation
In WattleOS, montessori_hub_reads and montessori_hub_feedback (migration 00064) have LIMIT 1 tenant scoping AND an impersonation risk — a user could record reads/feedback as another user.

Create a migration that:

Replaces LIMIT 1 with current_tenant_id()
Adds user_id = auth.uid() to INSERT WITH CHECK policies so users can only create their own read/feedback records


### Prompt 36: Move school photos to signed URLs
In WattleOS, school/person photos are stored in a PUBLIC Supabase Storage bucket with .getPublicUrl(). The URL is permanently accessible to anyone — inappropriate for images of children.

Fix:

Create a migration or Supabase config change to make the photo bucket private
Update src/components/domain/school-photos/bulk-upload-zone.tsx and all photo display components to use signed URLs via supabase.storage.from('photos').createSignedUrl(path, 3600) (1-hour expiry)
Create a server action or API route that generates signed URLs for photo access
Update all places that call .getPublicUrl() for school/person photos to use the signed URL approach


### Prompt 37: localStorage enrollment draft security
In WattleOS, enrollment drafts containing guardian names, child name, DOB, medical conditions, emergency contacts, and addresses are stored in localStorage under key wattleos_enroll_{tenantId}. On shared/public devices this PII persists.

Fix:

Switch from localStorage to sessionStorage for enrollment draft persistence (cleared on tab close)
Add a visible "Clear Draft" button in the enrollment form UI
Add a warning banner when the form detects it's running on a shared device (if detectable) or always show a note: "Draft data is stored locally in your browser. Clear your draft when using a shared device."
Consider encrypting the draft data in storage using a simple key derived from the session


### Prompt 38: OpenAI data disclosure and consent gate
WattleOS sends personal data (including children's medical conditions, custody restrictions, emergency contacts) to OpenAI's US servers via the "Ask Wattle" AI assistant. This is the most significant privacy finding (APP 8 — Cross-border disclosure).

Implement these mitigations:

Add a tenant-level setting ai_sensitive_data_consent (boolean, default false) that must be explicitly enabled by an Owner/Administrator before Ask Wattle can access sensitive data tools
In the Ask Wattle API route, before calling any tool that accesses medical, custody, emergency, or student data: check this consent flag. If not consented, return a message explaining that the school admin needs to enable AI access to sensitive data.
Add a consent acknowledgment UI in tenant settings that clearly states: "Enabling this feature sends student and medical data to OpenAI servers in the United States for AI processing."
Add a toggle ai_disable_sensitive_tools that when enabled, removes medical/custody/emergency tools from the Ask Wattle tool set entirely
Add audit logging for every Ask Wattle query that accesses sensitive data (if not already present)


### Prompt 39: Define and implement audit log retention policy
WattleOS has no audit log retention policy. Logs grow indefinitely. ST4S requires minimum 7-year retention. The Privacy Act requires not keeping personal information longer than needed.

Implement:

Create a document docs/DATA-RETENTION-POLICY.md defining:
Audit logs: 7 years minimum, archived to cold storage after 2 years
Student records: 7 years after last date of attendance (or age 25, whichever later)
Staff records: 7 years after employment ends
Visitor/contractor sign-in: 3 years
Add a retain_until DATE column to audit_logs table, populated as created_at + INTERVAL '7 years' via default
Create a cron API route /api/cron/audit-archive that:
Finds audit_logs older than 2 years
Exports them as JSON/CSV to Supabase Storage (cold archive bucket)
Marks them as archived (add archived_at TIMESTAMPTZ column)
Create a cron API route /api/cron/audit-purge that:
Finds archived audit_logs where retain_until < now()
Hard-deletes them (they've exceeded the 7-year window)
Gate both crons behind CRON_SECRET


### Prompt 40: IP address as top-level audit column
In WattleOS audit_logs, the IP address is stored inside JSONB metadata (_ip), making IP-based forensic queries slow and un-indexable.

Create a migration that:

Adds ip_address TEXT column to audit_logs
Creates an index on ip_address
Backfills existing rows: UPDATE audit_logs SET ip_address = metadata->>'_ip' WHERE metadata->>'_ip' IS NOT NULL
Update logAudit() and logAuditSystem() in src/lib/actions/audit-logs.ts to populate the new column directly


### Prompt 41: Meta-audit — log access to audit log viewer
WattleOS has no audit logging of who accesses the audit log viewer itself. An investigator's own access is unrecorded.

Fix:

In the server action that fetches audit logs for the admin UI (likely getAuditLogs() or similar), add a logAudit() call: action='VIEW_AUDIT_LOGS', entity_type='audit_logs', sensitivity='medium'
This creates a meta-audit trail of who viewed the audit logs and when
Don't log this recursively — add a check that prevents logging audit log views from triggering additional log entries


### Prompt 42: Tamper-evident audit exports
WattleOS audit log CSV exports could be modified before submission as evidence. No integrity verification exists.

Fix:

In the exportAuditLogsCsv() function, after generating the CSV content:
Compute a SHA-256 hash of the CSV content
Include the hash in the filename: audit_export_{date}_{hash_first8chars}.csv
Also generate a companion .sha256 file containing the full hash
Add a verification UI or endpoint that accepts a CSV file and checks it against the stored hash


### Prompt 43: Lift audit export row limit
WattleOS audit log CSV export is limited to 10,000 rows, which may be insufficient for a multi-year investigation.

Fix:

In exportAuditLogsCsv(), implement streaming/pagination:
Allow the caller to specify a date range
If the result set exceeds 10k rows, paginate and produce multiple CSV files or a single streamed CSV
Alternatively, raise the limit to 100k for admin users with the right permission


### Prompt 44: 7-year retention floor for enrollment and attendance
WattleOS has no 7-year retention floor enforced in code. A school admin could delete enrollment records for a student who left last year.

Fix:

Add retain_until DATE columns to students, enrollments, and attendance_records tables
Default value: created_at + INTERVAL '7 years' (or date_of_birth + INTERVAL '25 years', whichever is later, for student records)
In deleteStudent() and any enrollment deletion actions, check: if retain_until > now(), refuse the deletion and return an error explaining the regulatory retention requirement
Add enrollments and attendance_records to the prevent_hard_delete() trigger if they're not already protected


### Prompt 45: SAR (Subject Access Request) endpoint
WattleOS has no Subject Access Request mechanism. APP 12 requires providing access to personal information within 30 days of request. Currently this requires manual Ecodia intervention.

Build:

Create a server action generateSubjectAccessReport(studentId: string) that:
Gathers ALL records for the given student across all tables: personal info, enrollments, attendance, observations, incidents, medical records, medication administrations, daily care logs, ILP data, excursion consents, etc.
Formats the data as structured JSON
Also generates a human-readable PDF summary
Uploads both to Supabase Storage with a signed URL (24-hour expiry)
Logs the SAR to audit trail
Gate this behind manage_students permission AND verify the requester is either a school admin or the student's guardian
Create a UI page accessible from student profile: "Export Student Data" button
For guardian access: add a "Request My Child's Data" option in the parent portal
Include a date range filter option


### Prompt 46: School offboarding automation
WattleOS has no automated tenant offboarding. The legal page promises permanent deletion within 120 days of subscription termination, but no code implements this.

Build:

Add columns to tenants table: terminated_at TIMESTAMPTZ, offboard_phase TEXT CHECK (phase IN ('active', 'grace_period', 'read_only', 'export_window', 'pending_purge', 'purged'))
Create a server action initiateTenantOffboarding(tenantId) that:
Sets terminated_at = now(), offboard_phase = 'grace_period'
Sends notification to the tenant Owner
Create a cron route /api/cron/tenant-offboarding that processes offboarding phases:
0-30 days: grace_period (full access, can cancel)
30-90 days: read_only (set is_active = true but block mutations via a new middleware check)
60-90 days: export_window (generate and store full tenant data export)
90-120 days: pending_purge (data queued for deletion)
120 days: purged (cascade delete all tenant data, log confirmation to audit)
Create an export function that dumps all tenant data as JSON/CSV archive
Add a "Cancel Offboarding" action during grace period
Send automated emails at each phase transition
Log every phase change to audit trail with sensitivity = 'critical'


### Prompt 47: Soft-delete audit trail — add deleted_by and deletion_reason
WattleOS soft-deletes records but doesn't track who deleted them or why.

Create a migration that:

Adds deleted_by UUID REFERENCES auth.users(id) to: students, enrollments, incidents, medical_conditions, individual_learning_plans, and other critical tables
Adds deletion_reason TEXT to the same tables
Update the relevant server actions (deleteStudent, etc.) to populate these fields
These fields should be NULL when deleted_at is NULL


### Prompt 48: Data correction workflow (APP 13)
WattleOS has no formal data correction workflow. APP 13 requires mechanisms for correcting personal information. Currently there's no change history or amendment trail.

Build:

Create a data_corrections table: id, tenant_id, entity_type, entity_id, field_name, old_value (encrypted), new_value (encrypted), requested_by, approved_by, requested_at, approved_at, status (pending/approved/rejected), reason
Add RLS policies scoped to tenant and appropriate permissions
Create server actions: requestCorrection(), approveCorrection(), rejectCorrection()
For critical fields (student name, DOB, medical conditions), route changes through this approval workflow instead of direct edits
Maintain the amendment trail: original value → corrected value → who approved → when
Log all corrections to audit trail with sensitivity='high'


### Prompt 49: Data export in portable formats (CSV/JSON)
WattleOS only supports PDF report exports. The data processing page promises CSV/JSON export but it's not built.

Build:

Create a server action exportStudentDataCsv(studentId, options) that exports a student's data as CSV
Create a server action exportStudentDataJson(studentId, options) for JSON format
Create bulk export: exportClassDataCsv(classId) for a whole class
Create attendance export: exportAttendanceCsv(filters) with date range, class, student filters
Gate all exports behind appropriate permissions (export_data or manage_students)
Log all exports to audit trail
Add export buttons to relevant UI pages (student profile, class list, attendance reports)


### Prompt 50: Conditional religion field by jurisdiction
WattleOS collects religion for all students but it's only required for QLD independent schools (ISQ reporting).

Fix:

Add a tenant-level setting jurisdiction or state (e.g., 'QLD', 'NSW', 'VIC', etc.)
In StudentForm.tsx, conditionally show the religion field ONLY when tenant jurisdiction is 'QLD'
Hide it entirely for non-QLD tenants
Add a label/tooltip explaining: "Required for ISQ reporting (QLD independent schools only)"


### Prompt 51: Make parent education/occupation admin-only
WattleOS collects parent_education_level and parent_occupation_group from families, but these ACARA SES fields can be derived from postcode. Collecting them directly is excessive (APP 3.2).

Fix:

Remove these fields from any parent-facing enrollment forms
Make them admin-only fields visible in the student admin panel
Add a note in the admin UI: "ACARA SES fields — can be derived from postcode. Only collect directly if required by your reporting body."
Consider adding a "Derive from postcode" button that auto-fills based on ABS SEIFA data


### Prompt 52: Key rotation runbook
WattleOS has no documented key rotation procedure for FIELD_ENCRYPTION_KEY or SMS_ENCRYPTION_KEY.

Create docs/KEY-ROTATION-RUNBOOK.md documenting:

When to rotate (compromise suspected, staff departure with key access, annual schedule)
Pre-rotation: generate new key, test in staging
Rotation steps for FIELD_ENCRYPTION_KEY:
Set both OLD_FIELD_ENCRYPTION_KEY and FIELD_ENCRYPTION_KEY in env
Run a migration script that re-encrypts all encrypted fields: decrypt with old key, encrypt with new key
Verify all records are readable with new key
Remove OLD_FIELD_ENCRYPTION_KEY from env
Same process for SMS_ENCRYPTION_KEY
Post-rotation: verify all features work, update key in secrets manager, log the rotation event
Emergency rotation: abbreviated steps for suspected compromise


### Prompt 53: Rate-limit bulk export endpoints
WattleOS has no rate limiting on authenticated staff bulk data export endpoints, which could be used for data harvesting.

Fix:

Add a new rate limit tier in src/lib/utils/rate-limit.ts: authenticated_export with limit 10 per 5 minutes
Apply this rate limit to all data export server actions (CSV exports, PDF exports, bulk operations)
Log rate limit hits to audit trail as sensitivity='medium'


### Prompt 54: Anomaly detection for audit logs
WattleOS has no anomaly detection for suspicious access patterns.

Build a cron route /api/cron/security-anomaly-check that:

Checks for bulk data access: > 50 student record views by one user in 1 hour
Checks for after-hours access: critical actions between 10pm-5am local time
Checks for unusual IP: user accessing from a new IP not seen in last 30 days
Checks for bulk exports: > 5 export actions by one user in 1 hour
When anomalies are detected, create an alert entry in a new security_alerts table and send a webhook notification (Slack/email)
Gate behind CRON_SECRET, run every 15 minutes


### Prompt 55: Zod validation sweep for remaining server actions
WattleOS has Zod schemas on ~50+ server actions but not all 94+. Complete the coverage.

Search all server action files for functions that accept parameters but don't use Zod validation. For each one:

Add a Zod schema matching the expected input shape
Parse/validate input at the top of the function before any DB operations
Return a proper error response for validation failures
Focus especially on actions that handle financial data, medical data, or cross-tenant operations
