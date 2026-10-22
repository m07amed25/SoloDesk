-- Approved F012 production workspace-creation policy.

CREATE OR REPLACE FUNCTION private.enforce_workspace_timezone()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_timezone_names
    WHERE name = NEW.default_timezone
  ) THEN
    RAISE EXCEPTION 'invalid workspace timezone' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.enforce_workspace_timezone() FROM PUBLIC, anon, authenticated;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.workspace_tenants tenant
    WHERE NOT EXISTS (
      SELECT 1 FROM pg_catalog.pg_timezone_names timezone
      WHERE timezone.name = tenant.default_timezone
    )
  ) THEN
    RAISE EXCEPTION 'existing workspace has invalid timezone' USING ERRCODE = '23514';
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS enforce_workspace_timezone ON public.workspace_tenants;
CREATE TRIGGER enforce_workspace_timezone
  BEFORE INSERT OR UPDATE OF default_timezone ON public.workspace_tenants
  FOR EACH ROW EXECUTE FUNCTION private.enforce_workspace_timezone();

UPDATE private.workspace_creation_policies
SET enabled = false
WHERE enabled;

CREATE UNIQUE INDEX IF NOT EXISTS uq_workspace_creation_policies_single_enabled
  ON private.workspace_creation_policies ((enabled))
  WHERE enabled;

INSERT INTO private.workspace_creation_policies (
  version,
  enabled,
  locales,
  currency_codes,
  timezone_catalogue,
  required_profile_fields,
  bounds_profile
) VALUES (
  'f012_v1_prod',
  true,
  ARRAY['en', 'ar'],
  ARRAY['EGP', 'USD', 'EUR', 'GBP', 'SAR', 'AED'],
  'IANA',
  ARRAY['display_name'],
  '{"maxDisplayNameScalars":120,"maxLegalNameScalars":200,"maxTradeNameScalars":120}'::jsonb
)
ON CONFLICT (version) DO UPDATE SET
  enabled = EXCLUDED.enabled,
  locales = EXCLUDED.locales,
  currency_codes = EXCLUDED.currency_codes,
  timezone_catalogue = EXCLUDED.timezone_catalogue,
  required_profile_fields = EXCLUDED.required_profile_fields,
  bounds_profile = EXCLUDED.bounds_profile,
  created_at = clock_timestamp();
