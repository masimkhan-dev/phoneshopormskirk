ALTER TABLE public.invoice_terms_settings
  ADD COLUMN IF NOT EXISTS customer_message text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS short_exclusions text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS show_exclusions boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_terms_on_request boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS terms_on_request_text text NOT NULL DEFAULT 'Full terms and conditions are available on request at the counter.';

ALTER TABLE public.invoice_terms
  ADD COLUMN IF NOT EXISTS customer_message text,
  ADD COLUMN IF NOT EXISTS short_exclusions text,
  ADD COLUMN IF NOT EXISTS show_terms_on_request boolean,
  ADD COLUMN IF NOT EXISTS terms_on_request_text text;

UPDATE public.invoice_terms_settings SET
  show_signature_line = false,
  customer_message = 'Dear customer, thank you for choosing us. We''ve fitted a quality replacement part to your device and tested it before handing it back. Your repair is covered for {{warranty_days}} days — if anything feels off, just pop back in or WhatsApp us.',
  short_exclusions = 'Warranty does not cover accidental or physical damage, liquid/water damage, misuse, further damage after repair, or work/opening carried out by another repairer.',
  show_exclusions = true
WHERE type = 'REPAIR';

UPDATE public.invoice_terms_settings SET
  show_signature_line = false,
  customer_message = 'Dear {{customer_name}}, thank you for selling your device to us. We''ve checked it over the counter and agreed a fair price. Payment received in full. This purchase is final.',
  short_exclusions = '',
  show_exclusions = false
WHERE type = 'PURCHASE';

UPDATE public.invoice_terms_settings SET
  show_signature_line = false,
  customer_message = 'Dear {{customer_name}}, thank you for your purchase. This pre-owned device has been tested in our shop before sale. Covered for {{warranty_days}} days for hardware faults. Battery health may vary as this is a used device.',
  short_exclusions = 'Warranty does not cover accidental or physical damage, liquid/water damage, misuse, software/account issues caused after sale, or work/opening carried out by another repairer.',
  show_exclusions = true
WHERE type = 'SALES';

UPDATE public.invoice_terms_settings SET
  show_signature_line = false,
  customer_message = 'Dear {{customer_name}}, thank you for your purchase. Your new device is covered by the manufacturer''s standard warranty where applicable. We also offer {{warranty_days}} days support for setup help or DOA exchange where applicable.',
  short_exclusions = 'Manufacturer warranty and shop support do not cover accidental or physical damage, liquid/water damage, misuse, or unauthorized repair/opening.',
  show_exclusions = true
WHERE type = 'NEW_PHONE';

CREATE OR REPLACE FUNCTION public.render_terms_message(p_text text, p_vars jsonb)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  out_text text := COALESCE(p_text, '');
  k text;
BEGIN
  FOR k IN SELECT jsonb_object_keys(COALESCE(p_vars, '{}'::jsonb)) LOOP
    out_text := replace(out_text, '{{' || k || '}}', COALESCE(p_vars->>k, ''));
  END LOOP;
  out_text := regexp_replace(out_text, '\{\{[a-z_]+\}\}', '', 'g');
  RETURN NULLIF(regexp_replace(trim(out_text), '[ \t]+', ' ', 'g'), '');
END $$;

CREATE OR REPLACE FUNCTION public.apply_invoice_terms(p_invoice_id uuid, p_terms jsonb DEFAULT NULL::jsonb, p_actor uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
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
  v_terms text;
  v_excl text;
  v_footer text;
  v_add text;
  v_note text;
  v_int text;
  v_print_note boolean;
  v_msg text;
  v_short text;
  v_on_request boolean;
  v_on_request_text text;
  v_vars jsonb;
  v_customer text;
  v_device text;
BEGIN
  SELECT * INTO inv FROM public.invoices WHERE id = p_invoice_id FOR UPDATE;
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

  IF p_terms IS NULL THEN
    ack := false;
    days := CASE WHEN COALESCE(tpl.enable_warranty, true)
      THEN GREATEST(COALESCE(tpl.default_warranty_days, 0), 0) ELSE 0 END;
    w_title := NULLIF(trim(COALESCE(tpl.warranty_title, '')), '');
    w_text := CASE WHEN COALESCE(tpl.enable_warranty, true)
      THEN NULLIF(trim(COALESCE(tpl.warranty_text, '')), '') ELSE NULL END;
    v_terms := NULLIF(trim(COALESCE(tpl.default_terms, '')), '');
    IF ttype = 'PURCHASE' THEN
      v_terms := concat_ws(E'\n\n', v_terms,
        NULLIF(trim(COALESCE(tpl.seller_declaration,'')), ''),
        NULLIF(trim(COALESCE(tpl.payment_ack_text,'')), ''),
        NULLIF(trim(COALESCE(tpl.id_verification_note,'')), ''));
    ELSIF ttype = 'SALES' THEN
      v_terms := concat_ws(E'\n\n', v_terms,
        NULLIF(trim(COALESCE(tpl.battery_disclaimer,'')), ''),
        NULLIF(trim(COALESCE(tpl.returns_policy,'')), ''));
    ELSIF ttype = 'NEW_PHONE' THEN
      v_terms := concat_ws(E'\n\n', v_terms,
        NULLIF(trim(COALESCE(tpl.manufacturer_note,'')), ''),
        CASE WHEN COALESCE(tpl.doa_days, 0) > 0
          THEN 'Dead-on-arrival exchange within ' || tpl.doa_days || ' days.' END,
        NULLIF(trim(COALESCE(tpl.activation_note,'')), ''),
        NULLIF(trim(COALESCE(tpl.accessories_note,'')), ''));
    END IF;
    v_excl := NULLIF(trim(COALESCE(tpl.exclusions_text, '')), '');
    v_footer := NULLIF(trim(COALESCE(tpl.footer_note, '')), '');
    v_add := NULL;
    v_note := NULL;
    v_int := NULL;
    v_print_note := true;
    v_msg := NULLIF(trim(COALESCE(tpl.customer_message, '')), '');
  ELSE
    ack := COALESCE((p_terms->>'customer_acknowledged')::boolean, false);
    IF COALESCE(tpl.require_acknowledgement, false) AND NOT ack THEN
      RAISE EXCEPTION 'Please confirm the customer has accepted the terms before saving.';
    END IF;

    days := GREATEST(COALESCE((p_terms->>'warranty_days')::integer, 0), 0);
    IF days > 3650 THEN RAISE EXCEPTION 'Warranty length looks too long.'; END IF;
    IF NOT COALESCE(tpl.enable_warranty, true) THEN days := 0; END IF;

    w_title := COALESCE(NULLIF(trim(p_terms->>'warranty_title'),''), NULLIF(trim(COALESCE(tpl.warranty_title,'')),''), 'Warranty');
    w_text := NULLIF(trim(p_terms->>'warranty_text'),'');
    v_terms := NULLIF(trim(p_terms->>'terms_text'),'');
    v_excl := NULLIF(trim(p_terms->>'exclusions_text'),'');
    v_footer := NULLIF(trim(p_terms->>'footer_note'),'');
    v_add := NULLIF(trim(p_terms->>'additional_terms'),'');
    v_note := NULLIF(trim(p_terms->>'customer_note'),'');
    v_int := NULLIF(trim(p_terms->>'internal_note'),'');
    v_print_note := COALESCE((p_terms->>'print_customer_note')::boolean, true);
    v_msg := COALESCE(NULLIF(trim(p_terms->>'customer_message'),''),
                      NULLIF(trim(COALESCE(tpl.customer_message,'')),''));
  END IF;

  IF days > 0 THEN
    expires := ((inv.created_at AT TIME ZONE 'Europe/London')::date + days);
  ELSE
    expires := NULL;
    w_title := NULL;
    w_text := NULL;
  END IF;

  -- Customer-friendly message: variables filled in, short exclusion sentence and
  -- the "terms on request" line appended per template toggles.
  v_short := CASE
    WHEN COALESCE(tpl.show_exclusions, true)
      AND NULLIF(trim(COALESCE(tpl.short_exclusions,'')),'') IS NOT NULL
      AND (days > 0 OR ttype = 'NEW_PHONE')
    THEN trim(tpl.short_exclusions) END;
  v_on_request := COALESCE(tpl.show_terms_on_request, true);
  v_on_request_text := CASE WHEN v_on_request
    THEN COALESCE(NULLIF(trim(COALESCE(tpl.terms_on_request_text,'')),''),
                  'Full terms and conditions are available on request at the counter.') END;

  v_customer := COALESCE(NULLIF(trim(COALESCE(inv.snapshot->'customer'->>'name','')),''), 'customer');
  v_device := NULLIF(trim(concat_ws(' ',
      COALESCE(inv.snapshot->'repair'->>'device_brand', inv.snapshot->'stock'->>'brand'),
      COALESCE(inv.snapshot->'repair'->>'device_model', inv.snapshot->'stock'->>'model'))), '');
  v_vars := jsonb_build_object(
    'customer_name', v_customer,
    'device_model', COALESCE(v_device, 'your device'),
    'warranty_days', days::text,
    'warranty_expiry', COALESCE(to_char(expires, 'DD/MM/YYYY'), ''),
    'amount', '£' || to_char(COALESCE(inv.total_pence,0)::numeric / 100, 'FM999999990.00')
  );
  v_msg := public.render_terms_message(v_msg, v_vars);
  IF v_msg IS NOT NULL THEN
    v_msg := btrim(concat_ws(' ', v_msg, v_short, v_on_request_text));
  END IF;

  INSERT INTO public.invoice_terms (
    invoice_id, invoice_type, warranty_days, warranty_expires, warranty_title, warranty_text,
    terms_text, exclusions_text, footer_note, additional_terms, internal_note, customer_note,
    print_customer_note, customer_acknowledged, show_on_thermal, show_on_a4, show_signature_line,
    customer_message, short_exclusions, show_terms_on_request, terms_on_request_text,
    settings_snapshot, created_by
  ) VALUES (
    inv.id, ttype, days, expires, w_title, w_text,
    v_terms, v_excl, v_footer, v_add, v_int, v_note,
    v_print_note,
    ack,
    COALESCE(tpl.show_on_thermal, true),
    COALESCE(tpl.show_on_a4, true),
    COALESCE(tpl.show_signature_line, false),
    v_msg, v_short, v_on_request, v_on_request_text,
    COALESCE(to_jsonb(tpl), '{}'::jsonb), p_actor
  ) RETURNING * INTO t;

  UPDATE public.invoices
    SET snapshot = COALESCE(snapshot, '{}'::jsonb)
      || jsonb_build_object('terms', to_jsonb(t) - 'internal_note' - 'settings_snapshot')
    WHERE id = inv.id;

  PERFORM public.log_audit('ATTACH_INVOICE_TERMS','invoices',inv.id,inv.invoice_number,
    jsonb_build_object('warranty_days', days, 'type', ttype, 'acknowledged', ack));
  RETURN to_jsonb(t);
END $function$;

REVOKE ALL ON FUNCTION public.apply_invoice_terms(uuid, jsonb, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_invoice_terms(uuid, jsonb, uuid) TO service_role;