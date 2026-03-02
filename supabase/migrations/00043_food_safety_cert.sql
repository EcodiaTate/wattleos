-- 00043_food_safety_cert.sql
-- Add food_safety to staff_certificates cert_type CHECK constraint
-- Australian Food Safety Supervisor certificates (SITXFSA005/006) expire
-- every 5 years under state food acts; tracked alongside other mandatory certs.

-- Drop the existing constraint and recreate with food_safety included
ALTER TABLE staff_certificates
  DROP CONSTRAINT IF EXISTS staff_certificates_cert_type_check;

ALTER TABLE staff_certificates
  ADD CONSTRAINT staff_certificates_cert_type_check
  CHECK (cert_type IN (
    'first_aid', 'cpr', 'anaphylaxis', 'asthma',
    'child_safety', 'mandatory_reporting', 'food_safety', 'other'
  ));
