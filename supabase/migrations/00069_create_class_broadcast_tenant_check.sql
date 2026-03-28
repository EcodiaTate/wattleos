-- ============================================================
-- 00069_create_class_broadcast_tenant_check.sql
-- Add tenant validation to create_class_broadcast() SECURITY
-- DEFINER function. Previously accepted p_tenant_id with no
-- check, allowing cross-tenant message injection.
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
  -- Validate caller's tenant matches the requested tenant
  IF p_tenant_id != current_tenant_id() THEN
    RAISE EXCEPTION 'tenant_id mismatch';
  END IF;

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
