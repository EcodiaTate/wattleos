-- 00052_hard_delete_prevention.sql
-- ============================================================
-- Prevent hard deletes on sensitive tables.
--
-- Regulatory records (incidents, observations, medications,
-- counsellor notes) and audit_logs must never be permanently
-- deleted. All removals must use the soft-delete pattern:
--   UPDATE <table> SET deleted_at = now() WHERE id = ...
--
-- Each protected table gets a BEFORE DELETE trigger that
-- raises an exception unconditionally. The trigger fires per
-- row so no bulk delete can slip through.
--
-- ⚠  CASCADE FK WARNING ─────────────────────────────────────
-- observation_tag_suggestions has:
--   REFERENCES observations(id) ON DELETE CASCADE
-- That cascade will now fail when the observations trigger
-- blocks the root DELETE. If you ever need to remove an
-- observation record you must:
--   1. Soft-delete the suggestion rows first (or let the
--      app handle them), then
--   2. Soft-delete the observation.
-- No other CASCADE FKs point at the five protected tables
-- (all other FKs use ON DELETE SET NULL or no action).
-- ============================================================

-- ── Helper: single reusable raise function ────────────────
-- One function shared by all triggers keeps error messages
-- consistent and avoids five near-identical function bodies.

CREATE OR REPLACE FUNCTION prevent_hard_delete()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION
    'Hard delete not allowed on % table. Use soft-delete (UPDATE SET deleted_at = now()) instead.',
    TG_TABLE_NAME;
  -- RETURN OLD is unreachable but required by plpgsql syntax.
  RETURN OLD;
END;
$$ LANGUAGE plpgsql
   SECURITY DEFINER
   SET search_path = public;

COMMENT ON FUNCTION prevent_hard_delete() IS
  'Shared BEFORE DELETE trigger function that blocks hard deletes '
  'on all audit-immutable tables. Raised error includes the table '
  'name so callers know which table was affected.';

-- ── incidents ─────────────────────────────────────────────

CREATE TRIGGER tr_prevent_hard_delete_incidents
  BEFORE DELETE ON incidents
  FOR EACH ROW
  EXECUTE FUNCTION prevent_hard_delete();

-- ── observations ──────────────────────────────────────────
-- Note: observation_tag_suggestions has ON DELETE CASCADE
-- referencing this table. That cascade will be blocked by
-- this trigger. Soft-delete observations instead.

CREATE TRIGGER tr_prevent_hard_delete_observations
  BEFORE DELETE ON observations
  FOR EACH ROW
  EXECUTE FUNCTION prevent_hard_delete();

-- ── medication_administrations ────────────────────────────

CREATE TRIGGER tr_prevent_hard_delete_medication_administrations
  BEFORE DELETE ON medication_administrations
  FOR EACH ROW
  EXECUTE FUNCTION prevent_hard_delete();

-- ── audit_logs ────────────────────────────────────────────

CREATE TRIGGER tr_prevent_hard_delete_audit_logs
  BEFORE DELETE ON audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION prevent_hard_delete();

-- ── counsellor_case_notes ─────────────────────────────────

CREATE TRIGGER tr_prevent_hard_delete_counsellor_case_notes
  BEFORE DELETE ON counsellor_case_notes
  FOR EACH ROW
  EXECUTE FUNCTION prevent_hard_delete();
