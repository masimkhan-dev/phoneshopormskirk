REVOKE EXECUTE ON FUNCTION public.attach_invoice_terms(jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.refund_invoice(jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.save_product(jsonb) FROM anon;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_manager(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_staff(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.require_staff() FROM anon, authenticated;