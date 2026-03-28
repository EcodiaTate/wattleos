-- ============================================================
-- Migration 00082: montessori_hub reads/feedback — fix LIMIT 1 + impersonation
-- ============================================================
-- Security fix for Prompt 35.
--
-- montessori_hub_reads and montessori_hub_feedback (migration 00064)
-- have two problems:
--
--   1. LIMIT 1 tenant scoping — non-deterministic for multi-tenant users:
--
--        tenant_id = (SELECT tenant_id FROM tenant_members
--                     WHERE user_id = auth.uid() LIMIT 1)
--
--      Replace with current_tenant_id() which reads from the JWT
--      claim and is deterministic.
--
--   2. Impersonation on INSERT — the ALL policy only checks USING
--      (tenant isolation) but not user_id = auth.uid() on writes.
--      A user could record reads/feedback with another user's user_id
--      by constructing a direct INSERT:
--
--        INSERT INTO montessori_hub_reads (user_id, ...) VALUES ('other-uid', ...)
--
--      Adding user_id = auth.uid() in the WITH CHECK prevents this.
--
-- montessori_hub_articles is also affected by LIMIT 1 in 00064.
-- That table's LIMIT 1 patterns are already covered by the broad
-- migration 00071_replace_limit1_rls_with_current_tenant_id.sql,
-- but we drop-and-recreate here to be comprehensive and to add
-- the proper WITH CHECK clauses that were missing from the ALL policy.
-- ============================================================

-- ── montessori_hub_articles ──────────────────────────────────

DROP POLICY IF EXISTS "hub_articles_tenant_read"  ON montessori_hub_articles;
DROP POLICY IF EXISTS "hub_articles_tenant_write" ON montessori_hub_articles;

-- SELECT: platform articles (tenant_id IS NULL) visible to all authenticated users;
-- tenant articles visible only to that tenant.
CREATE POLICY "hub_articles_tenant_read"
  ON montessori_hub_articles FOR SELECT
  USING (
    deleted_at IS NULL
    AND (
      tenant_id IS NULL              -- platform default articles
      OR tenant_id = current_tenant_id()
    )
  );

-- INSERT/UPDATE/DELETE: only the owning tenant (not platform articles)
CREATE POLICY "hub_articles_tenant_insert"
  ON montessori_hub_articles FOR INSERT
  WITH CHECK (
    tenant_id IS NOT NULL
    AND tenant_id = current_tenant_id()
  );

CREATE POLICY "hub_articles_tenant_update"
  ON montessori_hub_articles FOR UPDATE
  USING (
    tenant_id IS NOT NULL
    AND tenant_id = current_tenant_id()
  )
  WITH CHECK (
    tenant_id IS NOT NULL
    AND tenant_id = current_tenant_id()
  );

CREATE POLICY "hub_articles_tenant_delete"
  ON montessori_hub_articles FOR DELETE
  USING (
    tenant_id IS NOT NULL
    AND tenant_id = current_tenant_id()
  );

-- ── montessori_hub_reads ─────────────────────────────────────

DROP POLICY IF EXISTS "hub_reads_tenant_isolation" ON montessori_hub_reads;

-- SELECT: own records within current tenant
CREATE POLICY "hub_reads_select"
  ON montessori_hub_reads FOR SELECT
  USING (
    tenant_id = current_tenant_id()
    AND user_id = auth.uid()
  );

-- INSERT: user can only create their own read records
CREATE POLICY "hub_reads_insert"
  ON montessori_hub_reads FOR INSERT
  WITH CHECK (
    tenant_id = current_tenant_id()
    AND user_id = auth.uid()
  );

-- UPDATE: user can only update their own read/bookmark records
CREATE POLICY "hub_reads_update"
  ON montessori_hub_reads FOR UPDATE
  USING (
    tenant_id = current_tenant_id()
    AND user_id = auth.uid()
  )
  WITH CHECK (
    tenant_id = current_tenant_id()
    AND user_id = auth.uid()
  );

-- DELETE: user can remove their own read records
CREATE POLICY "hub_reads_delete"
  ON montessori_hub_reads FOR DELETE
  USING (
    tenant_id = current_tenant_id()
    AND user_id = auth.uid()
  );

-- ── montessori_hub_feedback ──────────────────────────────────

DROP POLICY IF EXISTS "hub_feedback_tenant_isolation" ON montessori_hub_feedback;

-- SELECT: own feedback within current tenant
CREATE POLICY "hub_feedback_select"
  ON montessori_hub_feedback FOR SELECT
  USING (
    tenant_id = current_tenant_id()
    AND user_id = auth.uid()
  );

-- INSERT: user can only submit feedback as themselves
CREATE POLICY "hub_feedback_insert"
  ON montessori_hub_feedback FOR INSERT
  WITH CHECK (
    tenant_id = current_tenant_id()
    AND user_id = auth.uid()
  );

-- UPDATE: user can only change their own feedback
CREATE POLICY "hub_feedback_update"
  ON montessori_hub_feedback FOR UPDATE
  USING (
    tenant_id = current_tenant_id()
    AND user_id = auth.uid()
  )
  WITH CHECK (
    tenant_id = current_tenant_id()
    AND user_id = auth.uid()
  );

-- DELETE: user can retract their own feedback
CREATE POLICY "hub_feedback_delete"
  ON montessori_hub_feedback FOR DELETE
  USING (
    tenant_id = current_tenant_id()
    AND user_id = auth.uid()
  );
