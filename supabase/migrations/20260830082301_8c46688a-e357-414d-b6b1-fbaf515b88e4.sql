CREATE OR REPLACE FUNCTION public.apply_invoice_terms(p_invoice_id uuid, p_terms jsonb DEFAULT NULL, p_actor uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
    -- Fallback path: compose from the template, mirroring the counter draft.
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
  END IF;

  IF days > 0 THEN
    expires := ((inv.created_at AT TIME ZONE 'Europe/London')::date + days);
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
    v_terms, v_excl, v_footer, v_add, v_int, v_note,
    v_print_note,
    ack,
    COALESCE(tpl.show_on_thermal, true),
    COALESCE(tpl.show_on_a4, true),
    COALESCE(tpl.show_signature_line, true),
    COALESCE(to_jsonb(tpl), '{}'::jsonb), p_actor
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

CREATE OR REPLACE FUNCTION public.attach_invoice_terms(p jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  uid uuid := public.require_staff();
BEGIN
  RETURN public.apply_invoice_terms((p->>'invoice_id')::uuid, p, uid);
END $function$;

CREATE OR REPLACE FUNCTION public.buy_phone(p jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid := public.require_staff(); cust public.customers; inv public.invoices;
  pur public.phone_purchases; stock public.stock_items; cost integer; num text; sku text; v_imei text;
BEGIN
  IF p->>'client_ref' IS NOT NULL AND EXISTS (SELECT 1 FROM public.invoices WHERE client_ref = p->>'client_ref') THEN
    RAISE EXCEPTION 'This transaction has already been processed.';
  END IF;
  cost := GREATEST(COALESCE((p->>'purchase_price_pence')::integer,0),0);
  v_imei := NULLIF(trim(p->>'imei'),'');
  IF COALESCE(trim(p->>'model'),'') = '' THEN RAISE EXCEPTION 'Please complete the required fields.'; END IF;
  IF v_imei IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.stock_items si WHERE si.imei = v_imei AND si.status IN ('IN_STOCK','RESERVED')
  ) THEN
    RAISE EXCEPTION 'This phone is already in stock.';
  END IF;

  IF p ? 'customer' AND p->'customer' <> 'null'::jsonb THEN
    cust := public.save_customer(p->'customer');
  ELSIF p->>'customer_id' IS NOT NULL THEN
    SELECT * INTO cust FROM public.customers WHERE id = (p->>'customer_id')::uuid;
  END IF;
  IF cust.id IS NULL THEN RAISE EXCEPTION 'Please complete the required fields.'; END IF;

  num := public.next_doc_number('BUY');
  sku := replace(num, 'BUY-', 'PS-');

  INSERT INTO public.invoices (invoice_number, kind, status, customer_id, subtotal_pence, total_pence,
    balance_pence, created_by, client_ref, notes)
  VALUES (num, 'PHONE_PURCHASE', 'FINAL', cust.id, cost, cost, cost, uid, NULLIF(p->>'client_ref',''), NULLIF(p->>'notes',''))
  RETURNING * INTO inv;

  INSERT INTO public.phone_purchases (invoice_id, seller_customer_id, purchase_date, total_pence, payment_method, notes, created_by)
  VALUES (inv.id, cust.id, COALESCE(NULLIF(p->>'purchase_date','')::date, (now() AT TIME ZONE 'Europe/London')::date),
    cost, COALESCE(p->>'payment_method','CASH'), NULLIF(p->>'notes',''), uid)
  RETURNING * INTO pur;

  INSERT INTO public.stock_items (sku, brand, model, imei, serial, storage, colour, network, condition,
    battery_health, purchase_cost_pence, selling_price_pence, source, purchase_reference, status, created_by)
  VALUES (sku, NULLIF(p->>'brand',''), p->>'model', v_imei, NULLIF(p->>'serial',''), NULLIF(p->>'storage',''),
    NULLIF(p->>'colour',''), NULLIF(p->>'network',''), NULLIF(p->>'condition',''), NULLIF(p->>'battery_health',''),
    cost, NULLIF(p->>'selling_price_pence','')::integer, 'CUSTOMER_PURCHASE', num, 'IN_STOCK', uid)
  RETURNING * INTO stock;

  INSERT INTO public.phone_purchase_items (purchase_id, stock_item_id, brand, model, imei, serial, storage, colour,
    network, condition, battery_health, device_checks, faults, accessories, cost_pence)
  VALUES (pur.id, stock.id, NULLIF(p->>'brand',''), p->>'model', v_imei, NULLIF(p->>'serial',''), NULLIF(p->>'storage',''),
    NULLIF(p->>'colour',''), NULLIF(p->>'network',''), NULLIF(p->>'condition',''), NULLIF(p->>'battery_health',''),
    COALESCE(p->'device_checks','{}'::jsonb), NULLIF(p->>'faults',''), NULLIF(p->>'accessories',''), cost);

  INSERT INTO public.invoice_items (invoice_id, description, quantity, unit_price_pence, line_total_pence, stock_item_id, meta)
  VALUES (inv.id, trim(COALESCE(p->>'brand','') || ' ' || (p->>'model')), 1, cost, cost, stock.id,
    jsonb_build_object('imei', v_imei, 'storage', p->>'storage', 'colour', p->>'colour', 'condition', p->>'condition'));

  INSERT INTO public.stock_movements (stock_item_id, movement_type, quantity_change, reason, reference, created_by)
  VALUES (stock.id, 'PURCHASE', 1, 'Phone purchased from customer', num, uid);

  INSERT INTO public.payments (invoice_id, amount_pence, method, direction, created_by)
  VALUES (inv.id, cost, COALESCE(p->>'payment_method','CASH'), 'OUT', uid);

  UPDATE public.invoices SET amount_paid_pence = cost, balance_pence = 0, payment_status = 'PAID',
    snapshot = jsonb_build_object('business', public.business_snapshot(), 'customer', to_jsonb(cust),
      'stock', to_jsonb(stock), 'purchase', to_jsonb(pur))
  WHERE id = inv.id;

  PERFORM public.apply_invoice_terms(inv.id, p->'terms', uid);

  PERFORM public.log_audit('BUY_PHONE','phone_purchases',pur.id,num, jsonb_build_object('imei',v_imei,'cost_pence',cost));
  SELECT * INTO inv FROM public.invoices WHERE id = inv.id;
  RETURN jsonb_build_object('invoice', to_jsonb(inv), 'purchase', to_jsonb(pur), 'stock_item', to_jsonb(stock));
END $function$;

CREATE OR REPLACE FUNCTION public.sell_phone(p jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid := public.require_staff(); cust public.customers; inv public.invoices; sale public.sales;
  stock public.stock_items; price integer; discount integer; total integer; paid integer; num text;
BEGIN
  IF p->>'client_ref' IS NOT NULL AND EXISTS (SELECT 1 FROM public.invoices WHERE client_ref = p->>'client_ref') THEN
    RAISE EXCEPTION 'This transaction has already been processed.';
  END IF;
  SELECT * INTO stock FROM public.stock_items WHERE id = (p->>'stock_item_id')::uuid FOR UPDATE;
  IF stock.id IS NULL THEN RAISE EXCEPTION 'This record no longer exists.'; END IF;
  IF stock.status = 'SOLD' THEN RAISE EXCEPTION 'This phone has already been sold.'; END IF;
  IF stock.status NOT IN ('IN_STOCK','RESERVED') THEN RAISE EXCEPTION 'This phone is not available to sell.'; END IF;

  price := GREATEST(COALESCE((p->>'selling_price_pence')::integer,0),0);
  discount := GREATEST(COALESCE((p->>'discount_pence')::integer,0),0);
  IF discount > price THEN RAISE EXCEPTION 'Discount cannot be more than the price.'; END IF;
  total := price - discount;
  paid := GREATEST(COALESCE((p->>'amount_paid_pence')::integer,0),0);
  IF paid > total THEN RAISE EXCEPTION 'Payment is more than the outstanding balance.'; END IF;

  IF p ? 'customer' AND p->'customer' <> 'null'::jsonb THEN
    cust := public.save_customer(p->'customer');
  ELSIF p->>'customer_id' IS NOT NULL THEN
    SELECT * INTO cust FROM public.customers WHERE id = (p->>'customer_id')::uuid;
  END IF;

  num := public.next_doc_number('SEL');

  INSERT INTO public.invoices (invoice_number, kind, status, customer_id, subtotal_pence, discount_pence,
    total_pence, balance_pence, created_by, client_ref, notes)
  VALUES (num, 'PHONE_SALE', 'FINAL', cust.id, price, discount, total, total, uid, NULLIF(p->>'client_ref',''), NULLIF(p->>'notes',''))
  RETURNING * INTO inv;

  INSERT INTO public.sales (invoice_id, sale_kind, customer_id, subtotal_pence, discount_pence, total_pence, cost_pence, notes, created_by)
  VALUES (inv.id, 'PHONE', cust.id, price, discount, total, stock.purchase_cost_pence, NULLIF(p->>'notes',''), uid)
  RETURNING * INTO sale;

  INSERT INTO public.sale_items (sale_id, stock_item_id, description, quantity, unit_price_pence, line_total_pence, unit_cost_pence)
  VALUES (sale.id, stock.id, trim(COALESCE(stock.brand,'') || ' ' || COALESCE(stock.model,'')), 1, price, price, stock.purchase_cost_pence);

  INSERT INTO public.invoice_items (invoice_id, description, quantity, unit_price_pence, line_total_pence, stock_item_id, meta)
  VALUES (inv.id, trim(COALESCE(stock.brand,'') || ' ' || COALESCE(stock.model,'')), 1, price, price, stock.id,
    jsonb_build_object('imei', stock.imei, 'storage', stock.storage, 'colour', stock.colour, 'condition', stock.condition));

  UPDATE public.stock_items SET status = 'SOLD', public_visibility = false WHERE id = stock.id;
  INSERT INTO public.stock_movements (stock_item_id, movement_type, quantity_change, reason, reference, created_by)
  VALUES (stock.id, 'SALE', -1, 'Phone sold', num, uid);

  IF cust.id IS NOT NULL THEN
    INSERT INTO public.customer_ledger_entries (customer_id, invoice_id, entry_type, debit_pence, reference, created_by)
    VALUES (cust.id, inv.id, 'INVOICE', total, num, uid);
  END IF;

  IF paid > 0 THEN
    PERFORM public.take_payment(jsonb_build_object('invoice_id', inv.id, 'amount_pence', paid, 'method', COALESCE(p->>'payment_method','CASH')));
  END IF;

  SELECT * INTO stock FROM public.stock_items WHERE id = stock.id;
  UPDATE public.invoices SET snapshot = jsonb_build_object('business', public.business_snapshot(),
    'customer', to_jsonb(cust), 'stock', to_jsonb(stock)) WHERE id = inv.id;

  PERFORM public.apply_invoice_terms(inv.id, p->'terms', uid);

  PERFORM public.log_audit('SELL_PHONE','sales',sale.id,num, jsonb_build_object('imei',stock.imei,'total_pence',total));
  SELECT * INTO inv FROM public.invoices WHERE id = inv.id;
  RETURN jsonb_build_object('invoice', to_jsonb(inv), 'sale', to_jsonb(sale), 'stock_item', to_jsonb(stock));
END $function$;

CREATE OR REPLACE FUNCTION public.direct_sale(p jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid := public.require_staff(); cust public.customers; inv public.invoices; sale public.sales;
  line jsonb; prod public.products; qty integer; unit integer; subtotal integer := 0; cost_total integer := 0;
  discount integer; total integer; paid integer; num text;
BEGIN
  IF p->>'client_ref' IS NOT NULL AND EXISTS (SELECT 1 FROM public.invoices WHERE client_ref = p->>'client_ref') THEN
    RAISE EXCEPTION 'This transaction has already been processed.';
  END IF;
  IF COALESCE(jsonb_array_length(p->'items'),0) = 0 THEN RAISE EXCEPTION 'Please add at least one product.'; END IF;

  IF p ? 'customer' AND p->'customer' <> 'null'::jsonb THEN
    cust := public.save_customer(p->'customer');
  ELSIF p->>'customer_id' IS NOT NULL THEN
    SELECT * INTO cust FROM public.customers WHERE id = (p->>'customer_id')::uuid;
  END IF;

  num := public.next_doc_number('PRD');
  INSERT INTO public.invoices (invoice_number, kind, status, customer_id, created_by, client_ref, notes)
  VALUES (num, 'PRODUCT_SALE', 'FINAL', cust.id, uid, NULLIF(p->>'client_ref',''), NULLIF(p->>'notes',''))
  RETURNING * INTO inv;

  INSERT INTO public.sales (invoice_id, sale_kind, customer_id, notes, created_by)
  VALUES (inv.id, 'PRODUCT', cust.id, NULLIF(p->>'notes',''), uid) RETURNING * INTO sale;

  FOR line IN SELECT * FROM jsonb_array_elements(p->'items') LOOP
    SELECT * INTO prod FROM public.products WHERE id = (line->>'product_id')::uuid FOR UPDATE;
    IF prod.id IS NULL THEN RAISE EXCEPTION 'This record no longer exists.'; END IF;
    qty := GREATEST(COALESCE((line->>'quantity')::integer,1),1);
    IF prod.quantity < qty THEN RAISE EXCEPTION 'Not enough stock for %.', prod.name; END IF;
    unit := GREATEST(COALESCE((line->>'unit_price_pence')::integer, COALESCE(prod.price_pence,0)),0);
    subtotal := subtotal + unit * qty;
    cost_total := cost_total + prod.cost_price_pence * qty;

    INSERT INTO public.sale_items (sale_id, product_id, description, quantity, unit_price_pence, line_total_pence, unit_cost_pence)
    VALUES (sale.id, prod.id, prod.name, qty, unit, unit * qty, prod.cost_price_pence);
    INSERT INTO public.invoice_items (invoice_id, description, quantity, unit_price_pence, line_total_pence, product_id)
    VALUES (inv.id, prod.name, qty, unit, unit * qty, prod.id);

    UPDATE public.products SET quantity = quantity - qty WHERE id = prod.id;
    INSERT INTO public.stock_movements (product_id, movement_type, quantity_change, reason, reference, created_by)
    VALUES (prod.id, 'SALE', -qty, 'Product sold', num, uid);
  END LOOP;

  discount := GREATEST(COALESCE((p->>'discount_pence')::integer,0),0);
  IF discount > subtotal THEN RAISE EXCEPTION 'Discount cannot be more than the price.'; END IF;
  total := subtotal - discount;
  paid := GREATEST(COALESCE((p->>'amount_paid_pence')::integer,0),0);
  IF paid > total THEN RAISE EXCEPTION 'Payment is more than the outstanding balance.'; END IF;

  UPDATE public.sales SET subtotal_pence = subtotal, discount_pence = discount, total_pence = total, cost_pence = cost_total WHERE id = sale.id;
  UPDATE public.invoices SET subtotal_pence = subtotal, discount_pence = discount, total_pence = total, balance_pence = total WHERE id = inv.id;

  IF cust.id IS NOT NULL THEN
    INSERT INTO public.customer_ledger_entries (customer_id, invoice_id, entry_type, debit_pence, reference, created_by)
    VALUES (cust.id, inv.id, 'INVOICE', total, num, uid);
  END IF;

  IF paid > 0 THEN
    PERFORM public.take_payment(jsonb_build_object('invoice_id', inv.id, 'amount_pence', paid, 'method', COALESCE(p->>'payment_method','CASH')));
  END IF;

  UPDATE public.invoices SET snapshot = jsonb_build_object('business', public.business_snapshot(),
    'customer', to_jsonb(cust),
    'items', (SELECT jsonb_agg(to_jsonb(i)) FROM public.invoice_items i WHERE i.invoice_id = inv.id))
  WHERE id = inv.id;

  PERFORM public.apply_invoice_terms(inv.id, p->'terms', uid);

  PERFORM public.log_audit('DIRECT_SALE','sales',sale.id,num);
  SELECT * INTO inv FROM public.invoices WHERE id = inv.id;
  SELECT * INTO sale FROM public.sales WHERE id = sale.id;
  RETURN jsonb_build_object('invoice', to_jsonb(inv), 'sale', to_jsonb(sale));
END $function$;

CREATE OR REPLACE FUNCTION public.create_repair_invoice(p jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid := public.require_staff();
  cust public.customers; inv public.invoices; rep public.repair_invoices;
  subtotal integer; discount integer; total integer; paid integer; num text;
BEGIN
  IF p->>'client_ref' IS NOT NULL AND EXISTS (SELECT 1 FROM public.invoices WHERE client_ref = p->>'client_ref') THEN
    RAISE EXCEPTION 'This transaction has already been processed.';
  END IF;
  subtotal := GREATEST(COALESCE((p->>'subtotal_pence')::integer,0),0);
  discount := GREATEST(COALESCE((p->>'discount_pence')::integer,0),0);
  IF discount > subtotal THEN RAISE EXCEPTION 'Discount cannot be more than the price.'; END IF;
  total := subtotal - discount;
  paid := GREATEST(COALESCE((p->>'amount_paid_pence')::integer,0),0);
  IF paid > total THEN RAISE EXCEPTION 'Payment is more than the outstanding balance.'; END IF;
  IF COALESCE(trim(p->>'fault'),'') = '' THEN RAISE EXCEPTION 'Please complete the required fields.'; END IF;

  IF p ? 'customer' AND p->'customer' <> 'null'::jsonb THEN
    cust := public.save_customer(p->'customer');
  ELSIF p->>'customer_id' IS NOT NULL THEN
    SELECT * INTO cust FROM public.customers WHERE id = (p->>'customer_id')::uuid;
  END IF;
  IF cust.id IS NULL THEN RAISE EXCEPTION 'Please complete the required fields.'; END IF;

  num := public.next_doc_number('REP');

  INSERT INTO public.invoices (invoice_number, kind, status, customer_id, subtotal_pence, discount_pence,
    total_pence, balance_pence, created_by, client_ref, notes)
  VALUES (num, 'REPAIR', 'FINAL', cust.id, subtotal, discount, total, total, uid, NULLIF(p->>'client_ref',''), NULLIF(p->>'customer_notes',''))
  RETURNING * INTO inv;

  INSERT INTO public.repair_invoices (repair_number, invoice_id, customer_id, device_brand, device_model, imei, serial,
    fault, repair_description, device_condition, accessories_received, subtotal_pence, discount_pence, total_pence,
    balance_pence, customer_notes, internal_notes, created_by)
  VALUES (num, inv.id, cust.id, NULLIF(p->>'device_brand',''), NULLIF(p->>'device_model',''), NULLIF(p->>'imei',''),
    NULLIF(p->>'serial',''), p->>'fault', NULLIF(p->>'repair_description',''), NULLIF(p->>'device_condition',''),
    NULLIF(p->>'accessories_received',''), subtotal, discount, total, total,
    NULLIF(p->>'customer_notes',''), NULLIF(p->>'internal_notes',''), uid)
  RETURNING * INTO rep;

  INSERT INTO public.invoice_items (invoice_id, description, quantity, unit_price_pence, line_total_pence, meta)
  VALUES (inv.id, COALESCE(NULLIF(p->>'repair_description',''), p->>'fault'), 1, subtotal, subtotal,
    jsonb_build_object('brand',p->>'device_brand','model',p->>'device_model','imei',p->>'imei'));

  INSERT INTO public.customer_ledger_entries (customer_id, invoice_id, entry_type, debit_pence, reference, created_by)
  VALUES (cust.id, inv.id, 'INVOICE', total, num, uid);

  IF paid > 0 THEN
    PERFORM public.take_payment(jsonb_build_object('invoice_id', inv.id, 'amount_pence', paid,
      'method', COALESCE(p->>'payment_method','CASH')));
  END IF;

  UPDATE public.invoices SET snapshot = jsonb_build_object(
    'business', public.business_snapshot(), 'customer', to_jsonb(cust), 'repair', to_jsonb(rep)
  ) WHERE id = inv.id;

  PERFORM public.apply_invoice_terms(inv.id, p->'terms', uid);

  PERFORM public.log_audit('CREATE_REPAIR','repair_invoices',rep.id,num);
  SELECT * INTO inv FROM public.invoices WHERE id = inv.id;
  SELECT * INTO rep FROM public.repair_invoices WHERE id = rep.id;
  RETURN jsonb_build_object('invoice', to_jsonb(inv), 'repair', to_jsonb(rep));
END $function$;

UPDATE public.invoice_terms_settings
SET exclusions_text = regexp_replace(exclusions_text, '^\s*Not covered:\s*(\r?\n)+', '')
WHERE exclusions_text ~* '^\s*Not covered:';

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT i.id FROM public.invoices i
    WHERE i.status = 'FINAL'
      AND NOT EXISTS (SELECT 1 FROM public.invoice_terms t WHERE t.invoice_id = i.id)
  LOOP
    PERFORM public.apply_invoice_terms(r.id, NULL, NULL);
  END LOOP;
END $$;