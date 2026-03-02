-- ============================================================
-- Migration 00029: CALD interpreter_required flag on students
-- ============================================================
-- Adds interpreter_required boolean to students table.
-- Supports CALD (Culturally and Linguistically Diverse) student
-- identification for compliance, enrolment forms, and staff
-- awareness at point-of-interaction.
-- ============================================================

ALTER TABLE students
  ADD COLUMN IF NOT EXISTS interpreter_required boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN students.interpreter_required IS
  'When true, an interpreter should be arranged for key interactions with this student''s family.';
