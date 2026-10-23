-- Make the pgcrypto digest function resolvable without exposing untrusted schemas.
ALTER FUNCTION public.solodesk_invitation_create(
  text,
  uuid,
  text,
  text,
  text,
  bigint,
  uuid,
  text,
  bytea
) SET search_path = pg_catalog, extensions;
