-- 00034_mandatory_reporting_cert.sql
-- ============================================================
-- Add 'mandatory_reporting' certificate type to staff_certificates
-- ============================================================
-- Mandatory reporting training is a distinct compliance
-- requirement from general child safety training (Geccko/DoE
-- modules). It requires a separate, trackable certificate with
-- its own expiry cycle (typically 2 years for refreshers).
-- ============================================================

ALTER TABLE staff_certificates
  DROP CONSTRAINT IF EXISTS staff_certificates_cert_type_check;

ALTER TABLE staff_certificates
  ADD CONSTRAINT staff_certificates_cert_type_check
  CHECK (cert_type IN (
    'first_aid',
    'cpr',
    'anaphylaxis',
    'asthma',
    'child_safety',
    'mandatory_reporting',
    'other'
  ));
