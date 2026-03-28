-- Migration: Restrict next_invoice_number() SECURITY DEFINER function
-- Security: The function accepts any p_tenant_id and bypasses RLS.
--           A caller can learn the invoice count for any school.
-- Fix: Validate p_tenant_id matches the caller's current tenant,
--       AND revoke public EXECUTE, granting only to service_role.

-- Replace the function with tenant validation
CREATE OR REPLACE FUNCTION next_invoice_number(p_tenant_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_year    TEXT := to_char(NOW(), 'YYYY');
  v_count   INTEGER;
  v_number  TEXT;
  v_caller_tenant UUID;
BEGIN
  -- Validate tenant matches caller's JWT context
  v_caller_tenant := current_tenant_id();
  IF v_caller_tenant IS NULL THEN
    RAISE EXCEPTION 'No tenant context — cannot generate invoice number';
  END IF;

  IF p_tenant_id != v_caller_tenant THEN
    RAISE EXCEPTION 'tenant_id mismatch: cannot generate invoice numbers for another tenant';
  END IF;

  -- Count existing invoices for this tenant in current year
  SELECT COUNT(*) + 1 INTO v_count
  FROM invoices
  WHERE tenant_id = p_tenant_id
    AND invoice_number LIKE 'INV-' || v_year || '-%';

  v_number := 'INV-' || v_year || '-' || lpad(v_count::TEXT, 4, '0');
  RETURN v_number;
END;
$$;

-- Belt-and-suspenders: also restrict EXECUTE to service_role
REVOKE EXECUTE ON FUNCTION next_invoice_number(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION next_invoice_number(UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION next_invoice_number(UUID) TO service_role;
