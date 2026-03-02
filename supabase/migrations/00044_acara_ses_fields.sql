-- 00044_acara_ses_fields.sql
--
-- ACARA ASC Student Profile — SES fields
-- ========================================
-- The ACARA Annual School Collection requires parental education
-- level and occupation group per student. These feed into the
-- ICSEA (Index of Community Socio-Educational Advantage) and SES
-- calculations used for MySchool reporting.
--
-- TEXT CHECK rather than PG ENUM — easier to extend if ACARA
-- updates its code set without needing an ALTER TYPE migration.

ALTER TABLE students
  ADD COLUMN parent_education_level TEXT DEFAULT NULL
    CHECK (parent_education_level IN (
      'year_9_or_below', 'year_10', 'year_11', 'year_12',
      'certificate_i_iv', 'diploma', 'bachelor', 'postgraduate',
      'not_stated'
    )),
  ADD COLUMN parent_occupation_group TEXT DEFAULT NULL
    CHECK (parent_occupation_group IN (
      'group_1', 'group_2', 'group_3', 'group_4',
      'not_in_paid_work', 'not_stated'
    ));

COMMENT ON COLUMN students.parent_education_level
  IS 'ACARA ASC: highest education level of either parent (for SES/ICSEA)';
COMMENT ON COLUMN students.parent_occupation_group
  IS 'ACARA ASC: occupation group of either parent (1=Senior mgmt … 4=Machine operators)';
