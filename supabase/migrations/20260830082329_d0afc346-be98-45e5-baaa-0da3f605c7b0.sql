REVOKE EXECUTE ON FUNCTION public.apply_invoice_terms(uuid, jsonb, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_invoice_terms(uuid, jsonb, uuid) TO service_role;