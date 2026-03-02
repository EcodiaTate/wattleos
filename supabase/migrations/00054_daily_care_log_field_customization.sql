-- ============================================================
-- Migration 00054: Daily Care Log Field Customization
-- ============================================================
-- Allows admins to configure which care entry types are enabled,
-- required, and in what order they appear for each class/room.
--
-- Regulatory basis:
--   • Reg 162 — records must be kept, but the specific fields
--     are not mandated — services can tailor to their program
--     (e.g. preschool may not need nappy tracking)
--
-- Design:
--   • One config row per (tenant, class, field_type)
--   • UNIQUE constraint prevents duplicates
--   • Soft-delete via deleted_at (no hard-delete)
--   • RLS: tenant isolation + admin-write policy
-- ============================================================


-- ============================================================
-- TABLE: daily_care_log_field_configs
-- ============================================================
-- Per-room configuration of which care entry types are enabled.
-- Rows are seeded on class creation; admins can then toggle,
-- reorder, relabel, or mark fields as required.
-- ============================================================

CREATE TABLE daily_care_log_field_configs (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- The classroom/room this config applies to
  class_id         UUID        NOT NULL REFERENCES classes(id) ON DELETE CASCADE,

  -- Which care entry type this row configures
  field_type       TEXT        NOT NULL
    CHECK (field_type IN (
      'nappy_change', 'meal', 'bottle', 'sleep_start',
      'sleep_end', 'sunscreen', 'wellbeing_note'
    )),

  -- Visibility and validation
  is_enabled       BOOLEAN     NOT NULL DEFAULT true,
  is_required      BOOLEAN     NOT NULL DEFAULT false,

  -- UI ordering (lower = shown first)
  display_order    INTEGER     NOT NULL DEFAULT 0,

  -- Optional custom label override (e.g. "Lunch Notes" instead of "Meal")
  field_label      TEXT
    CHECK (field_label IS NULL OR char_length(field_label) <= 100),

  -- Brief helper text shown under the field in the form
  field_description TEXT
    CHECK (field_description IS NULL OR char_length(field_description) <= 300),

  -- Visual grouping tag for the UI
  color_tag        TEXT
    CHECK (color_tag IS NULL OR color_tag IN (
      'health', 'nutrition', 'behavior', 'hygiene', 'sleep', 'general'
    )),

  -- Audit
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at       TIMESTAMPTZ,

  -- One config row per class per field type (active only enforced in app)
  UNIQUE (tenant_id, class_id, field_type)
);

-- Fetch config for a class (most common query)
CREATE INDEX idx_daily_care_field_configs_class
  ON daily_care_log_field_configs (tenant_id, class_id, display_order)
  WHERE deleted_at IS NULL;

SELECT apply_updated_at_trigger('daily_care_log_field_configs');

ALTER TABLE daily_care_log_field_configs ENABLE ROW LEVEL SECURITY;

-- Tenant staff can read configs (guides need this to know what to show)
CREATE POLICY "daily_care_field_configs_tenant_select"
  ON daily_care_log_field_configs FOR SELECT
  USING (tenant_id = current_tenant_id());

-- Only users with manage_daily_care_logs can write configs
CREATE POLICY "daily_care_field_configs_manage_insert"
  ON daily_care_log_field_configs FOR INSERT
  WITH CHECK (
    tenant_id = current_tenant_id()
    AND has_permission(auth.uid(), tenant_id, 'manage_daily_care_logs')
  );

CREATE POLICY "daily_care_field_configs_manage_update"
  ON daily_care_log_field_configs FOR UPDATE
  USING (
    tenant_id = current_tenant_id()
    AND has_permission(auth.uid(), tenant_id, 'manage_daily_care_logs')
  );


-- ============================================================
-- SEED: Default field configs for all existing classes
-- ============================================================
-- Insert default configs (all fields enabled, sensible order)
-- for every existing class. New classes are seeded on creation
-- via the application layer (getDailyCareLogConfig upserts on
-- first access).
-- ============================================================

DO $$
DECLARE
  r_class RECORD;
  v_defaults JSONB := '[
    {"field_type": "nappy_change", "display_order": 1, "color_tag": "hygiene"},
    {"field_type": "sleep_start",  "display_order": 2, "color_tag": "sleep"},
    {"field_type": "sleep_end",    "display_order": 3, "color_tag": "sleep"},
    {"field_type": "meal",         "display_order": 4, "color_tag": "nutrition"},
    {"field_type": "bottle",       "display_order": 5, "color_tag": "nutrition"},
    {"field_type": "sunscreen",    "display_order": 6, "color_tag": "health"},
    {"field_type": "wellbeing_note","display_order": 7,"color_tag": "general"}
  ]'::JSONB;
  v_def JSONB;
BEGIN
  FOR r_class IN SELECT id, tenant_id FROM classes WHERE deleted_at IS NULL LOOP
    FOR v_def IN SELECT * FROM jsonb_array_elements(v_defaults) LOOP
      INSERT INTO daily_care_log_field_configs
        (tenant_id, class_id, field_type, is_enabled, is_required, display_order, color_tag)
      VALUES
        (
          r_class.tenant_id,
          r_class.id,
          v_def->>'field_type',
          true,
          false,
          (v_def->>'display_order')::INTEGER,
          v_def->>'color_tag'
        )
      ON CONFLICT (tenant_id, class_id, field_type) DO NOTHING;
    END LOOP;
  END LOOP;
END;
$$;
