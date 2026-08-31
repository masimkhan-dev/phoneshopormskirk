REVOKE EXECUTE ON FUNCTION public.attach_invoice_terms(jsonb) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.refund_invoice(jsonb) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.save_product(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.attach_invoice_terms(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.refund_invoice(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_product(jsonb) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_manager(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_staff(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.require_staff() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.apply_invoice_terms(uuid, jsonb, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.business_snapshot() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_audit(text, text, uuid, text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.next_doc_number(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.recalc_invoice(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.render_terms_message(text, jsonb) FROM PUBLIC, anon, authenticated;