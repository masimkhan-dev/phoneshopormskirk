CREATE OR REPLACE FUNCTION public.attach_invoice_terms(p jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  uid uuid := public.require_staff();
  inv public.invoices;
  tpl public.invoice_terms_settings;
  t public.invoice_terms;
  days integer;
  ttype text;
  expires date;
  ack boolean;
  is_new boolean := false;
  w_title text;
  w_text text;
BEGIN
  SELECT * INTO inv FROM public.invoices WHERE id = (p->>'invoice_id')::uuid FOR UPDATE;
  IF inv.id IS NULL THEN RAISE EXCEPTION 'This record no longer exists.'; END IF;
  IF inv.status = 'VOID' THEN RAISE EXCEPTION 'This record can no longer be edited.'; END IF;
  IF EXISTS (SELECT 1 FROM public.invoice_terms WHERE invoice_id = inv.id) THEN
    RAISE EXCEPTION 'Terms have already been saved for this invoice.';
  END IF;

  -- Terms type is derived from the transaction itself, never from the client.
  IF inv.kind = 'REPAIR' THEN
    ttype := 'REPAIR';
  ELSIF inv.kind = 'PHONE_PURCHASE' THEN
    ttype := 'PURCHASE';
  ELSE
    SELECT EXISTS (
      SELECT 1
      FROM public.invoice_items ii
      JOIN public.stock_items si ON si.id = ii.stock_item_id
      WHERE ii.invoice_id = inv.id
        AND (upper(COALESCE(si.condition,'')) LIKE '%NEW%'
             AND upper(COALESCE(si.condition,'')) NOT LIKE '%LIKE NEW%')
    ) INTO is_new;
    ttype := CASE WHEN is_new THEN 'NEW_PHONE' ELSE 'SALES' END;
  END IF;

  SELECT * INTO tpl FROM public.invoice_terms_settings WHERE type = ttype;

  ack := COALESCE((p->>'customer_acknowledged')::boolean, false);
  IF COALESCE(tpl.require_acknowledgement, false) AND NOT ack THEN
    RAISE EXCEPTION 'Please confirm the customer has accepted the terms before saving.';
  END IF;

  days := GREATEST(COALESCE((p->>'warranty_days')::integer, 0), 0);
  IF days > 3650 THEN RAISE EXCEPTION 'Warranty length looks too long.'; END IF;
  IF NOT COALESCE(tpl.enable_warranty, true) THEN days := 0; END IF;

  IF days > 0 THEN
    expires := ((inv.created_at AT TIME ZONE 'Europe/London')::date + days);
    w_title := COALESCE(NULLIF(trim(p->>'warranty_title'),''), NULLIF(trim(tpl.warranty_title),''), 'Warranty');
    w_text := NULLIF(trim(p->>'warranty_text'),'');
  ELSE
    expires := NULL;
    w_title := NULL;
    w_text := NULL;
  END IF;

  INSERT INTO public.invoice_terms (
    invoice_id, invoice_type, warranty_days, warranty_expires, warranty_title, warranty_text,
    terms_text, exclusions_text, footer_note, additional_terms, internal_note, customer_note,
    print_customer_note, customer_acknowledged, show_on_thermal, show_on_a4, show_signature_line,
    settings_snapshot, created_by
  ) VALUES (
    inv.id, ttype, days, expires, w_title, w_text,
    NULLIF(trim(p->>'terms_text'),''), NULLIF(trim(p->>'exclusions_text'),''), NULLIF(trim(p->>'footer_note'),''),
    NULLIF(trim(p->>'additional_terms'),''), NULLIF(trim(p->>'internal_note'),''), NULLIF(trim(p->>'customer_note'),''),
    COALESCE((p->>'print_customer_note')::boolean, true),
    ack,
    COALESCE(tpl.show_on_thermal, true),
    COALESCE(tpl.show_on_a4, true),
    COALESCE(tpl.show_signature_line, true),
    COALESCE(to_jsonb(tpl), '{}'::jsonb), uid
  ) RETURNING * INTO t;

  -- The printable copy never carries the staff-only internal note.
  UPDATE public.invoices
    SET snapshot = COALESCE(snapshot, '{}'::jsonb)
      || jsonb_build_object('terms', to_jsonb(t) - 'internal_note' - 'settings_snapshot')
    WHERE id = inv.id;

  PERFORM public.log_audit('ATTACH_INVOICE_TERMS','invoices',inv.id,inv.invoice_number,
    jsonb_build_object('warranty_days', days, 'type', ttype, 'acknowledged', ack));
  RETURN to_jsonb(t);
END $function$;

-- Terms rows are write-once: block any update or delete even for privileged paths.
CREATE OR REPLACE FUNCTION public.invoice_terms_immutable()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  RAISE EXCEPTION 'Saved terms cannot be changed. Void the invoice and create a new one.';
END $function$;

DROP TRIGGER IF EXISTS invoice_terms_no_change ON public.invoice_terms;
CREATE TRIGGER invoice_terms_no_change
  BEFORE UPDATE OR DELETE ON public.invoice_terms
  FOR EACH ROW EXECUTE FUNCTION public.invoice_terms_immutable();

REVOKE UPDATE, DELETE ON public.invoice_terms FROM authenticated;