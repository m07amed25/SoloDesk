-- The public RPCs derive account authority from the verified PostgREST JWT.
-- Private enrollment tables/functions remain inaccessible to desktop clients.
CREATE OR REPLACE FUNCTION private.current_identity_account()
RETURNS TABLE (issuer_id text, subject_id text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  claims jsonb := auth.jwt();
  actor uuid := auth.uid();
BEGIN
  IF actor IS NULL OR COALESCE(claims->>'role', '') <> 'authenticated'
     OR COALESCE((claims->>'is_anonymous')::boolean, false)
     OR COALESCE(claims->>'iss', '') = ''
     OR NOT EXISTS (
       SELECT 1 FROM auth.sessions s
        WHERE s.id::text = claims->>'session_id' AND s.user_id = actor
     ) THEN
    RAISE EXCEPTION 'current account required' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY SELECT claims->>'iss', actor::text;
END;
$$;
REVOKE ALL ON FUNCTION private.current_identity_account() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.solodesk_enroll_device(p_request jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  account record;
  result record;
  canonical text;
BEGIN
  SELECT * INTO STRICT account FROM private.current_identity_account();
  IF jsonb_typeof(p_request) <> 'object' OR pg_column_size(p_request) > 8192
     OR EXISTS (SELECT 1 FROM jsonb_object_keys(p_request) AS k(name)
       WHERE k.name <> ALL(ARRAY[
         'enrollmentIntentId','profileReference','profileGeneration',
         'installationContextId','deviceContextDigest','deviceLabel','platform',
         'architecture','appVersion','protectionProofReference','payloadVersion','requestDigest'
       ]))
     OR NOT p_request ?& ARRAY[
       'enrollmentIntentId','profileReference','profileGeneration',
       'installationContextId','deviceContextDigest','platform','architecture',
       'appVersion','protectionProofReference','payloadVersion','requestDigest'
     ]
     OR COALESCE(p_request->>'payloadVersion','') <> '1'
     OR COALESCE(p_request->>'requestDigest','') !~ '^[0-9a-f]{64}$'
     OR COALESCE(p_request->>'deviceContextDigest','') !~ '^[0-9a-f]{64}$'
     OR COALESCE(p_request->>'enrollmentIntentId','') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
     OR jsonb_typeof(p_request->'profileGeneration') <> 'number'
     OR COALESCE(p_request->>'profileGeneration','') !~ '^[1-9][0-9]{0,15}$'
     OR (p_request->>'profileGeneration')::numeric > 9007199254740991
     OR (p_request ? 'deviceLabel' AND (
       jsonb_typeof(p_request->'deviceLabel') <> 'string'
       OR char_length(p_request->>'deviceLabel') NOT BETWEEN 1 AND 64
       OR p_request->>'deviceLabel' ~ '[[:cntrl:]]'
     ))
     OR EXISTS (SELECT 1 FROM jsonb_each(p_request) AS field(name,value)
       WHERE field.name NOT IN ('profileGeneration','payloadVersion')
         AND jsonb_typeof(field.value) <> 'string') THEN
    RAISE EXCEPTION 'invalid enrollment request' USING ERRCODE = '22023';
  END IF;

  SELECT '{' || string_agg(to_jsonb(field.name)::text || ':' || field.value::text,
    ',' ORDER BY field.name COLLATE "C") || '}' INTO canonical
    FROM jsonb_each(p_request - ARRAY['enrollmentIntentId','requestDigest']) AS field(name,value);
  IF encode(sha256(convert_to(canonical, 'UTF8')), 'hex') <> p_request->>'requestDigest' THEN
    RAISE EXCEPTION 'invalid request digest' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO result FROM private.enroll_device(
    account.issuer_id, account.subject_id,
    (p_request->>'enrollmentIntentId')::uuid,
    p_request->>'profileReference', (p_request->>'profileGeneration')::bigint,
    p_request->>'installationContextId', p_request->>'deviceContextDigest',
    p_request->>'deviceLabel', p_request->>'platform', p_request->>'architecture',
    p_request->>'appVersion', p_request->>'protectionProofReference',
    p_request->>'requestDigest', (p_request->>'payloadVersion')::smallint
  );
  IF result.device_enrollment_id IS NULL THEN
    RETURN jsonb_build_object('status', 'outcome_unknown');
  END IF;
  RETURN jsonb_build_object('status', result.status,
    'deviceEnrollmentId', result.device_enrollment_id,
    'deviceId', result.device_id, 'receiptId', result.receipt_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.solodesk_enrollment_result(p_intent_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  account record;
  result record;
BEGIN
  SELECT * INTO STRICT account FROM private.current_identity_account();
  SELECT * INTO result FROM private.get_device_enrollment_result(
    account.issuer_id, account.subject_id, p_intent_id
  );
  IF result.status = 'enrolled' THEN
    RETURN jsonb_build_object('status', 'enrolled',
      'deviceEnrollmentId', result.device_enrollment_id,
      'deviceId', result.device_id, 'receiptId', result.receipt_id);
  END IF;
  RETURN jsonb_build_object('status', COALESCE(result.status, 'outcome_unknown'));
END;
$$;

REVOKE ALL ON FUNCTION public.solodesk_enroll_device(jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.solodesk_enrollment_result(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.solodesk_enroll_device(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.solodesk_enrollment_result(uuid) TO authenticated;
NOTIFY pgrst, 'reload schema';
