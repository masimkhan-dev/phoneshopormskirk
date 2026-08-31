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

  PERFORM public.log_audit('BUY_PHONE','phone_purchases',pur.id,num, jsonb_build_object('imei',v_imei,'cost_pence',cost));
  SELECT * INTO inv FROM public.invoices WHERE id = inv.id;
  RETURN jsonb_build_object('invoice', to_jsonb(inv), 'purchase', to_jsonb(pur), 'stock_item', to_jsonb(stock));
END $function$;