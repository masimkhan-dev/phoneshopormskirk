REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.validate_enquiry() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.next_doc_number(text) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_staff(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_manager(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.ensure_profile(text, text) FROM anon, public;

-- ============ shared guards ============
CREATE OR REPLACE FUNCTION public.require_staff()
RETURNS uuid LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid();
BEGIN
  IF uid IS NULL OR NOT public.is_staff(uid) THEN
    RAISE EXCEPTION 'You do not have permission to perform this action.';
  END IF;
  RETURN uid;
END $$;
REVOKE EXECUTE ON FUNCTION public.require_staff() FROM anon, public;

CREATE OR REPLACE FUNCTION public.log_audit(_action text, _entity text, _entity_id uuid, _summary text, _meta jsonb DEFAULT '{}'::jsonb)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.audit_logs (user_id, action, entity, entity_id, summary, metadata)
  VALUES (auth.uid(), _action, _entity, _entity_id, _summary, _meta);
$$;
REVOKE EXECUTE ON FUNCTION public.log_audit(text, text, uuid, text, jsonb) FROM anon, authenticated, public;

CREATE OR REPLACE FUNCTION public.norm_phone(_p text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$ SELECT regexp_replace(COALESCE(_p,''), '[^0-9]', '', 'g') $$;

CREATE OR REPLACE FUNCTION public.recalc_invoice(_invoice_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE paid integer; inv public.invoices;
BEGIN
  SELECT COALESCE(SUM(CASE WHEN direction = 'IN' THEN amount_pence ELSE -amount_pence END),0)
    INTO paid FROM public.payments WHERE invoice_id = _invoice_id;
  SELECT * INTO inv FROM public.invoices WHERE id = _invoice_id;
  UPDATE public.invoices SET
    amount_paid_pence = GREATEST(paid,0),
    balance_pence = inv.total_pence - paid,
    payment_status = CASE
      WHEN inv.status = 'VOID' THEN 'UNPAID'
      WHEN paid <= 0 THEN 'UNPAID'
      WHEN paid >= inv.total_pence THEN 'PAID'
      ELSE 'PARTIAL' END
  WHERE id = _invoice_id;

  UPDATE public.repair_invoices r SET
    amount_paid_pence = GREATEST(paid,0),
    balance_pence = r.total_pence - paid,
    payment_status = CASE WHEN paid <= 0 THEN 'UNPAID' WHEN paid >= r.total_pence THEN 'PAID' ELSE 'PARTIAL' END
  WHERE r.invoice_id = _invoice_id AND r.record_status <> 'VOIDED';
END $$;
REVOKE EXECUTE ON FUNCTION public.recalc_invoice(uuid) FROM anon, authenticated, public;

CREATE OR REPLACE FUNCTION public.business_snapshot()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(to_jsonb(b) - 'social_links', '{}'::jsonb) FROM public.business_settings b LIMIT 1;
$$;
REVOKE EXECUTE ON FUNCTION public.business_snapshot() FROM anon, authenticated, public;

-- ============ customers / suppliers ============
CREATE OR REPLACE FUNCTION public.save_customer(p jsonb)
RETURNS public.customers LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := public.require_staff(); c public.customers;
BEGIN
  IF COALESCE(trim(p->>'name'),'') = '' OR COALESCE(trim(p->>'phone'),'') = '' THEN
    RAISE EXCEPTION 'Please complete the required fields.';
  END IF;
  IF p ? 'id' AND (p->>'id') IS NOT NULL THEN
    UPDATE public.customers SET
      name = p->>'name', phone = p->>'phone', phone_normalized = public.norm_phone(p->>'phone'),
      email = NULLIF(p->>'email',''), address = NULLIF(p->>'address',''),
      postcode = NULLIF(p->>'postcode',''), notes = NULLIF(p->>'notes','')
    WHERE id = (p->>'id')::uuid RETURNING * INTO c;
    IF c.id IS NULL THEN RAISE EXCEPTION 'This record no longer exists.'; END IF;
  ELSE
    INSERT INTO public.customers (name, phone, phone_normalized, email, address, postcode, notes, created_by)
    VALUES (p->>'name', p->>'phone', public.norm_phone(p->>'phone'), NULLIF(p->>'email',''),
            NULLIF(p->>'address',''), NULLIF(p->>'postcode',''), NULLIF(p->>'notes',''), uid)
    RETURNING * INTO c;
  END IF;
  PERFORM public.log_audit('SAVE_CUSTOMER','customers',c.id,c.name);
  RETURN c;
END $$;
REVOKE EXECUTE ON FUNCTION public.save_customer(jsonb) FROM anon, public;

CREATE OR REPLACE FUNCTION public.save_supplier(p jsonb)
RETURNS public.suppliers LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := public.require_staff(); s public.suppliers;
BEGIN
  IF COALESCE(trim(p->>'name'),'') = '' THEN RAISE EXCEPTION 'Please complete the required fields.'; END IF;
  IF p ? 'id' AND (p->>'id') IS NOT NULL THEN
    UPDATE public.suppliers SET name = p->>'name', company = NULLIF(p->>'company',''),
      phone = NULLIF(p->>'phone',''), email = NULLIF(p->>'email',''),
      address = NULLIF(p->>'address',''), notes = NULLIF(p->>'notes','')
    WHERE id = (p->>'id')::uuid RETURNING * INTO s;
    IF s.id IS NULL THEN RAISE EXCEPTION 'This record no longer exists.'; END IF;
  ELSE
    INSERT INTO public.suppliers (name, company, phone, email, address, notes, created_by)
    VALUES (p->>'name', NULLIF(p->>'company',''), NULLIF(p->>'phone',''), NULLIF(p->>'email',''),
            NULLIF(p->>'address',''), NULLIF(p->>'notes',''), uid) RETURNING * INTO s;
  END IF;
  PERFORM public.log_audit('SAVE_SUPPLIER','suppliers',s.id,s.name);
  RETURN s;
END $$;
REVOKE EXECUTE ON FUNCTION public.save_supplier(jsonb) FROM anon, public;

-- ============ payments ============
CREATE OR REPLACE FUNCTION public.take_payment(p jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := public.require_staff(); inv public.invoices; amt integer; pay public.payments;
BEGIN
  amt := COALESCE((p->>'amount_pence')::integer, 0);
  IF amt <= 0 THEN RAISE EXCEPTION 'Please enter a payment amount.'; END IF;
  IF p->>'client_ref' IS NOT NULL AND EXISTS (SELECT 1 FROM public.payments WHERE client_ref = p->>'client_ref') THEN
    RAISE EXCEPTION 'This transaction has already been processed.';
  END IF;
  SELECT * INTO inv FROM public.invoices WHERE id = (p->>'invoice_id')::uuid FOR UPDATE;
  IF inv.id IS NULL THEN RAISE EXCEPTION 'This record no longer exists.'; END IF;
  IF inv.status = 'VOID' THEN RAISE EXCEPTION 'This record can no longer be edited.'; END IF;
  IF amt > inv.balance_pence THEN RAISE EXCEPTION 'Payment is more than the outstanding balance.'; END IF;

  INSERT INTO public.payments (invoice_id, amount_pence, method, reference, notes, created_by, client_ref)
  VALUES (inv.id, amt, COALESCE(p->>'method','CASH'), NULLIF(p->>'reference',''), NULLIF(p->>'notes',''), uid, NULLIF(p->>'client_ref',''))
  RETURNING * INTO pay;

  IF inv.customer_id IS NOT NULL THEN
    INSERT INTO public.customer_ledger_entries (customer_id, invoice_id, payment_id, entry_type, credit_pence, reference, created_by)
    VALUES (inv.customer_id, inv.id, pay.id, 'PAYMENT', amt, inv.invoice_number, uid);
  END IF;

  PERFORM public.recalc_invoice(inv.id);
  PERFORM public.log_audit('TAKE_PAYMENT','invoices',inv.id, inv.invoice_number, jsonb_build_object('amount_pence',amt,'method',p->>'method'));
  SELECT * INTO inv FROM public.invoices WHERE id = inv.id;
  RETURN jsonb_build_object('payment_id', pay.id, 'invoice', to_jsonb(inv));
END $$;
REVOKE EXECUTE ON FUNCTION public.take_payment(jsonb) FROM anon, public;

-- ============ repair invoice ============
CREATE OR REPLACE FUNCTION public.create_repair_invoice(p jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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

  PERFORM public.log_audit('CREATE_REPAIR','repair_invoices',rep.id,num);
  SELECT * INTO inv FROM public.invoices WHERE id = inv.id;
  SELECT * INTO rep FROM public.repair_invoices WHERE id = rep.id;
  RETURN jsonb_build_object('invoice', to_jsonb(inv), 'repair', to_jsonb(rep));
END $$;
REVOKE EXECUTE ON FUNCTION public.create_repair_invoice(jsonb) FROM anon, public;

-- ============ buy phone ============
CREATE OR REPLACE FUNCTION public.buy_phone(p jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := public.require_staff(); cust public.customers; inv public.invoices;
  pur public.phone_purchases; stock public.stock_items; cost integer; num text; sku text; imei text;
BEGIN
  IF p->>'client_ref' IS NOT NULL AND EXISTS (SELECT 1 FROM public.invoices WHERE client_ref = p->>'client_ref') THEN
    RAISE EXCEPTION 'This transaction has already been processed.';
  END IF;
  cost := GREATEST(COALESCE((p->>'purchase_price_pence')::integer,0),0);
  imei := NULLIF(trim(p->>'imei'),'');
  IF COALESCE(trim(p->>'model'),'') = '' THEN RAISE EXCEPTION 'Please complete the required fields.'; END IF;
  IF imei IS NOT NULL AND EXISTS (SELECT 1 FROM public.stock_items WHERE imei = imei AND status IN ('IN_STOCK','RESERVED')) THEN
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
  VALUES (sku, NULLIF(p->>'brand',''), p->>'model', imei, NULLIF(p->>'serial',''), NULLIF(p->>'storage',''),
    NULLIF(p->>'colour',''), NULLIF(p->>'network',''), NULLIF(p->>'condition',''), NULLIF(p->>'battery_health',''),
    cost, NULLIF(p->>'selling_price_pence','')::integer, 'CUSTOMER_PURCHASE', num, 'IN_STOCK', uid)
  RETURNING * INTO stock;

  INSERT INTO public.phone_purchase_items (purchase_id, stock_item_id, brand, model, imei, serial, storage, colour,
    network, condition, battery_health, device_checks, faults, accessories, cost_pence)
  VALUES (pur.id, stock.id, NULLIF(p->>'brand',''), p->>'model', imei, NULLIF(p->>'serial',''), NULLIF(p->>'storage',''),
    NULLIF(p->>'colour',''), NULLIF(p->>'network',''), NULLIF(p->>'condition',''), NULLIF(p->>'battery_health',''),
    COALESCE(p->'device_checks','{}'::jsonb), NULLIF(p->>'faults',''), NULLIF(p->>'accessories',''), cost);

  INSERT INTO public.invoice_items (invoice_id, description, quantity, unit_price_pence, line_total_pence, stock_item_id, meta)
  VALUES (inv.id, trim(COALESCE(p->>'brand','') || ' ' || (p->>'model')), 1, cost, cost, stock.id,
    jsonb_build_object('imei', imei, 'storage', p->>'storage', 'colour', p->>'colour', 'condition', p->>'condition'));

  INSERT INTO public.stock_movements (stock_item_id, movement_type, quantity_change, reason, reference, created_by)
  VALUES (stock.id, 'PURCHASE', 1, 'Phone purchased from customer', num, uid);

  INSERT INTO public.payments (invoice_id, amount_pence, method, direction, created_by)
  VALUES (inv.id, cost, COALESCE(p->>'payment_method','CASH'), 'OUT', uid);

  UPDATE public.invoices SET amount_paid_pence = cost, balance_pence = 0, payment_status = 'PAID',
    snapshot = jsonb_build_object('business', public.business_snapshot(), 'customer', to_jsonb(cust),
      'stock', to_jsonb(stock), 'purchase', to_jsonb(pur))
  WHERE id = inv.id;

  PERFORM public.log_audit('BUY_PHONE','phone_purchases',pur.id,num, jsonb_build_object('imei',imei,'cost_pence',cost));
  SELECT * INTO inv FROM public.invoices WHERE id = inv.id;
  RETURN jsonb_build_object('invoice', to_jsonb(inv), 'purchase', to_jsonb(pur), 'stock_item', to_jsonb(stock));
END $$;
REVOKE EXECUTE ON FUNCTION public.buy_phone(jsonb) FROM anon, public;

-- ============ sell phone ============
CREATE OR REPLACE FUNCTION public.sell_phone(p jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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

  PERFORM public.log_audit('SELL_PHONE','sales',sale.id,num, jsonb_build_object('imei',stock.imei,'total_pence',total));
  SELECT * INTO inv FROM public.invoices WHERE id = inv.id;
  RETURN jsonb_build_object('invoice', to_jsonb(inv), 'sale', to_jsonb(sale), 'stock_item', to_jsonb(stock));
END $$;
REVOKE EXECUTE ON FUNCTION public.sell_phone(jsonb) FROM anon, public;

-- ============ direct product sale ============
CREATE OR REPLACE FUNCTION public.direct_sale(p jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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

  PERFORM public.log_audit('DIRECT_SALE','sales',sale.id,num);
  SELECT * INTO inv FROM public.invoices WHERE id = inv.id;
  SELECT * INTO sale FROM public.sales WHERE id = sale.id;
  RETURN jsonb_build_object('invoice', to_jsonb(inv), 'sale', to_jsonb(sale));
END $$;
REVOKE EXECUTE ON FUNCTION public.direct_sale(jsonb) FROM anon, public;

-- ============ void ============
CREATE OR REPLACE FUNCTION public.void_invoice(p jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := public.require_staff(); inv public.invoices; reason text; si record; s public.sales;
BEGIN
  IF NOT public.is_manager(uid) THEN RAISE EXCEPTION 'You do not have permission to perform this action.'; END IF;
  reason := NULLIF(trim(p->>'reason'),'');
  IF reason IS NULL THEN RAISE EXCEPTION 'Please give a reason for voiding.'; END IF;
  SELECT * INTO inv FROM public.invoices WHERE id = (p->>'invoice_id')::uuid FOR UPDATE;
  IF inv.id IS NULL THEN RAISE EXCEPTION 'This record no longer exists.'; END IF;
  IF inv.status = 'VOID' THEN RAISE EXCEPTION 'This record can no longer be edited.'; END IF;

  -- reverse payments
  INSERT INTO public.payments (invoice_id, amount_pence, method, direction, is_reversal, notes, created_by)
  SELECT inv.id, amount_pence, method, CASE WHEN direction = 'IN' THEN 'OUT' ELSE 'IN' END, true, 'Void reversal', uid
  FROM public.payments WHERE invoice_id = inv.id AND NOT is_reversal;

  -- restore stock
  FOR si IN SELECT * FROM public.invoice_items WHERE invoice_id = inv.id LOOP
    IF si.stock_item_id IS NOT NULL THEN
      IF inv.kind = 'PHONE_SALE' THEN
        UPDATE public.stock_items SET status = 'IN_STOCK' WHERE id = si.stock_item_id;
        INSERT INTO public.stock_movements (stock_item_id, movement_type, quantity_change, reason, reference, created_by)
        VALUES (si.stock_item_id, 'VOID_REVERSAL', 1, reason, inv.invoice_number, uid);
      ELSIF inv.kind = 'PHONE_PURCHASE' THEN
        UPDATE public.stock_items SET status = 'VOIDED', public_visibility = false WHERE id = si.stock_item_id;
        INSERT INTO public.stock_movements (stock_item_id, movement_type, quantity_change, reason, reference, created_by)
        VALUES (si.stock_item_id, 'VOID_REVERSAL', -1, reason, inv.invoice_number, uid);
      END IF;
    ELSIF si.product_id IS NOT NULL THEN
      UPDATE public.products SET quantity = quantity + si.quantity WHERE id = si.product_id;
      INSERT INTO public.stock_movements (product_id, movement_type, quantity_change, reason, reference, created_by)
      VALUES (si.product_id, 'VOID_REVERSAL', si.quantity, reason, inv.invoice_number, uid);
    END IF;
  END LOOP;

  IF inv.customer_id IS NOT NULL THEN
    INSERT INTO public.customer_ledger_entries (customer_id, invoice_id, entry_type, credit_pence, reference, note, created_by)
    VALUES (inv.customer_id, inv.id, 'REVERSAL', inv.total_pence, inv.invoice_number, reason, uid);
  END IF;

  UPDATE public.repair_invoices SET record_status = 'VOIDED' WHERE invoice_id = inv.id;
  UPDATE public.sales SET record_status = 'VOIDED' WHERE invoice_id = inv.id;
  UPDATE public.phone_purchases SET record_status = 'VOIDED' WHERE invoice_id = inv.id;

  UPDATE public.invoices SET status = 'VOID', void_reason = reason, voided_by = uid, voided_at = now(),
    amount_paid_pence = 0, balance_pence = 0, payment_status = 'UNPAID' WHERE id = inv.id;

  PERFORM public.log_audit('VOID_INVOICE','invoices',inv.id,inv.invoice_number, jsonb_build_object('reason',reason));
  SELECT * INTO inv FROM public.invoices WHERE id = inv.id;
  RETURN to_jsonb(inv);
END $$;
REVOKE EXECUTE ON FUNCTION public.void_invoice(jsonb) FROM anon, public;

-- ============ stock / product maintenance ============
CREATE OR REPLACE FUNCTION public.update_stock_item(p jsonb)
RETURNS public.stock_items LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := public.require_staff(); s public.stock_items; new_status text;
BEGIN
  SELECT * INTO s FROM public.stock_items WHERE id = (p->>'id')::uuid FOR UPDATE;
  IF s.id IS NULL THEN RAISE EXCEPTION 'This record no longer exists.'; END IF;
  IF s.status IN ('SOLD','VOIDED') THEN RAISE EXCEPTION 'This record can no longer be edited.'; END IF;
  new_status := COALESCE(NULLIF(p->>'status',''), s.status);
  IF new_status NOT IN ('IN_STOCK','RESERVED','REMOVED') THEN
    RAISE EXCEPTION 'This record can no longer be edited.';
  END IF;
  UPDATE public.stock_items SET
    selling_price_pence = COALESCE(NULLIF(p->>'selling_price_pence','')::integer, s.selling_price_pence),
    condition = COALESCE(NULLIF(p->>'condition',''), s.condition),
    battery_health = COALESCE(NULLIF(p->>'battery_health',''), s.battery_health),
    colour = COALESCE(NULLIF(p->>'colour',''), s.colour),
    storage = COALESCE(NULLIF(p->>'storage',''), s.storage),
    network = COALESCE(NULLIF(p->>'network',''), s.network),
    notes = COALESCE(NULLIF(p->>'notes',''), s.notes),
    public_visibility = COALESCE((p->>'public_visibility')::boolean, s.public_visibility),
    featured = COALESCE((p->>'featured')::boolean, s.featured),
    status = new_status
  WHERE id = s.id RETURNING * INTO s;
  PERFORM public.log_audit('UPDATE_STOCK','stock_items',s.id,s.sku);
  RETURN s;
END $$;
REVOKE EXECUTE ON FUNCTION public.update_stock_item(jsonb) FROM anon, public;

CREATE OR REPLACE FUNCTION public.adjust_product_stock(p jsonb)
RETURNS public.products LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := public.require_staff(); prod public.products; delta integer;
BEGIN
  delta := COALESCE((p->>'quantity_change')::integer,0);
  IF delta = 0 THEN RAISE EXCEPTION 'Please enter a quantity.'; END IF;
  SELECT * INTO prod FROM public.products WHERE id = (p->>'product_id')::uuid FOR UPDATE;
  IF prod.id IS NULL THEN RAISE EXCEPTION 'This record no longer exists.'; END IF;
  IF prod.quantity + delta < 0 THEN RAISE EXCEPTION 'Stock cannot go below zero.'; END IF;
  UPDATE public.products SET quantity = quantity + delta WHERE id = prod.id RETURNING * INTO prod;
  INSERT INTO public.stock_movements (product_id, movement_type, quantity_change, reason, created_by)
  VALUES (prod.id, COALESCE(NULLIF(p->>'movement_type',''),'MANUAL_ADJUSTMENT'), delta, NULLIF(p->>'reason',''), uid);
  PERFORM public.log_audit('ADJUST_PRODUCT_STOCK','products',prod.id,prod.name, jsonb_build_object('change',delta));
  RETURN prod;
END $$;
REVOKE EXECUTE ON FUNCTION public.adjust_product_stock(jsonb) FROM anon, public;

-- ============ user role management ============
CREATE OR REPLACE FUNCTION public.set_user_role(p jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := public.require_staff(); target uuid; new_role public.app_role;
BEGIN
  IF NOT public.is_manager(uid) THEN RAISE EXCEPTION 'You do not have permission to perform this action.'; END IF;
  target := (p->>'user_id')::uuid;
  new_role := (p->>'role')::public.app_role;
  IF target = uid THEN RAISE EXCEPTION 'You cannot change your own role.'; END IF;
  IF new_role = 'OWNER' AND NOT public.has_role(uid,'OWNER') THEN
    RAISE EXCEPTION 'You do not have permission to perform this action.';
  END IF;
  DELETE FROM public.user_roles WHERE user_id = target;
  INSERT INTO public.user_roles (user_id, role) VALUES (target, new_role);
  IF p ? 'active' THEN
    UPDATE public.profiles SET active = (p->>'active')::boolean WHERE id = target;
  END IF;
  PERFORM public.log_audit('SET_USER_ROLE','profiles',target,new_role::text);
  RETURN jsonb_build_object('user_id', target, 'role', new_role);
END $$;
REVOKE EXECUTE ON FUNCTION public.set_user_role(jsonb) FROM anon, public;