-- Multi-method split payment support across take_payment, direct_sale, sell_phone, and create_repair_invoice
-- Fully backwards-compatible, server-side validated, and idempotent

CREATE OR REPLACE FUNCTION public.take_payment(p jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := public.require_staff();
  inv public.invoices;
  amt integer;
  total_split integer := 0;
  pay public.payments;
  elem jsonb;
  item_amt integer;
  item_method text;
  item_ref text;
  item_notes text;
  v_client_ref text;
  v_sub_ref text;
  idx integer := 0;
  first_pay_id uuid;
BEGIN
  SELECT * INTO inv FROM public.invoices WHERE id = (p->>'invoice_id')::uuid FOR UPDATE;
  IF inv.id IS NULL THEN RAISE EXCEPTION 'This record no longer exists.'; END IF;
  IF inv.status = 'VOID' THEN RAISE EXCEPTION 'This record can no longer be edited.'; END IF;

  v_client_ref := NULLIF(trim(p->>'client_ref'), '');

  -- Split payments array handling
  IF p ? 'split_payments' AND jsonb_typeof(p->'split_payments') = 'array' AND jsonb_array_length(p->'split_payments') > 0 THEN
    -- Pre-calculate and validate sum of all non-zero split payments
    FOR elem IN SELECT * FROM jsonb_array_elements(p->'split_payments') LOOP
      item_amt := GREATEST(COALESCE((elem->>'amount_pence')::integer, 0), 0);
      total_split := total_split + item_amt;
    END LOOP;

    IF total_split <= 0 THEN
      RAISE EXCEPTION 'Please enter a payment amount.';
    END IF;

    -- Strict check against authoritative current server-side balance
    IF total_split > inv.balance_pence THEN
      RAISE EXCEPTION 'Payment is more than the outstanding balance.';
    END IF;

    -- Insert individual payment rows atomically
    FOR elem IN SELECT * FROM jsonb_array_elements(p->'split_payments') LOOP
      item_amt := GREATEST(COALESCE((elem->>'amount_pence')::integer, 0), 0);
      IF item_amt > 0 THEN
        idx := idx + 1;
        item_method := COALESCE(NULLIF(trim(elem->>'method'), ''), 'CASH');
        item_ref := NULLIF(trim(elem->>'reference'), '');
        item_notes := NULLIF(trim(elem->>'notes'), '');
        
        v_sub_ref := CASE 
          WHEN elem->>'client_ref' IS NOT NULL THEN elem->>'client_ref'
          WHEN v_client_ref IS NOT NULL THEN v_client_ref || '-' || idx::text
          ELSE NULL 
        END;

        IF v_sub_ref IS NOT NULL AND EXISTS (SELECT 1 FROM public.payments WHERE client_ref = v_sub_ref) THEN
          RAISE EXCEPTION 'This transaction has already been processed.';
        END IF;

        INSERT INTO public.payments (
          invoice_id, amount_pence, method, reference, notes, direction, created_by, client_ref
        ) VALUES (
          inv.id, item_amt, item_method, item_ref, item_notes, 'IN', uid, v_sub_ref
        )
        RETURNING * INTO pay;

        IF first_pay_id IS NULL THEN
          first_pay_id := pay.id;
        END IF;

        -- Record individual customer ledger credit for exact accounting reconciliation
        IF inv.customer_id IS NOT NULL THEN
          INSERT INTO public.customer_ledger_entries (
            customer_id, invoice_id, payment_id, entry_type, credit_pence, reference, created_by
          ) VALUES (
            inv.customer_id, inv.id, pay.id, 'PAYMENT', item_amt, inv.invoice_number, uid
          );
        END IF;
      END IF;
    END LOOP;

    PERFORM public.recalc_invoice(inv.id);
    PERFORM public.log_audit('TAKE_PAYMENT', 'invoices', inv.id, inv.invoice_number,
      jsonb_build_object('total_amount_pence', total_split, 'split_count', idx));

  ELSE
    -- Backwards-compatible single payment handling
    amt := COALESCE((p->>'amount_pence')::integer, 0);
    IF amt <= 0 THEN RAISE EXCEPTION 'Please enter a payment amount.'; END IF;
    IF v_client_ref IS NOT NULL AND EXISTS (SELECT 1 FROM public.payments WHERE client_ref = v_client_ref) THEN
      RAISE EXCEPTION 'This transaction has already been processed.';
    END IF;

    IF amt > inv.balance_pence THEN
      RAISE EXCEPTION 'Payment is more than the outstanding balance.';
    END IF;

    INSERT INTO public.payments (
      invoice_id, amount_pence, method, reference, notes, direction, created_by, client_ref
    ) VALUES (
      inv.id, amt, COALESCE(NULLIF(trim(p->>'method'), ''), 'CASH'),
      NULLIF(trim(p->>'reference'), ''), NULLIF(trim(p->>'notes'), ''), 'IN', uid, v_client_ref
    )
    RETURNING * INTO pay;

    first_pay_id := pay.id;

    IF inv.customer_id IS NOT NULL THEN
      INSERT INTO public.customer_ledger_entries (
        customer_id, invoice_id, payment_id, entry_type, credit_pence, reference, created_by
      ) VALUES (
        inv.customer_id, inv.id, pay.id, 'PAYMENT', amt, inv.invoice_number, uid
      );
    END IF;

    PERFORM public.recalc_invoice(inv.id);
    PERFORM public.log_audit('TAKE_PAYMENT', 'invoices', inv.id, inv.invoice_number,
      jsonb_build_object('amount_pence', amt, 'method', p->>'method'));
  END IF;

  SELECT * INTO inv FROM public.invoices WHERE id = inv.id;
  RETURN jsonb_build_object('payment_id', first_pay_id, 'invoice', to_jsonb(inv));
END;
$$;

-- Enhanced direct_sale with split payments support
CREATE OR REPLACE FUNCTION public.direct_sale(p jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid := public.require_staff();
  cust public.customers;
  inv public.invoices;
  sale public.sales;
  line jsonb;
  prod public.products;
  qty integer;
  unit integer;
  subtotal integer := 0;
  cost_total integer := 0;
  discount integer;
  total integer;
  paid integer;
  split_total integer := 0;
  elem jsonb;
  num text;
BEGIN
  IF p->>'client_ref' IS NOT NULL AND EXISTS (SELECT 1 FROM public.invoices WHERE client_ref = p->>'client_ref') THEN
    RAISE EXCEPTION 'This transaction has already been processed.';
  END IF;
  IF COALESCE(jsonb_array_length(p->'items'), 0) = 0 THEN
    RAISE EXCEPTION 'Please add at least one product.';
  END IF;

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
    qty := GREATEST(COALESCE((line->>'quantity')::integer, 1), 1);
    IF prod.quantity < qty THEN RAISE EXCEPTION 'Not enough stock for %.', prod.name; END IF;
    unit := GREATEST(COALESCE((line->>'unit_price_pence')::integer, COALESCE(prod.price_pence, 0)), 0);
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

  discount := GREATEST(COALESCE((p->>'discount_pence')::integer, 0), 0);
  IF discount > subtotal THEN RAISE EXCEPTION 'Discount cannot be more than the price.'; END IF;
  total := subtotal - discount;

  UPDATE public.sales SET subtotal_pence = subtotal, discount_pence = discount, total_pence = total, cost_pence = cost_total WHERE id = sale.id;
  UPDATE public.invoices SET subtotal_pence = subtotal, discount_pence = discount, total_pence = total, balance_pence = total WHERE id = inv.id;

  IF cust.id IS NOT NULL THEN
    INSERT INTO public.customer_ledger_entries (customer_id, invoice_id, entry_type, debit_pence, reference, created_by)
    VALUES (cust.id, inv.id, 'INVOICE', total, num, uid);
  END IF;

  -- Process payments (split or single)
  IF p ? 'split_payments' AND jsonb_typeof(p->'split_payments') = 'array' AND jsonb_array_length(p->'split_payments') > 0 THEN
    FOR elem IN SELECT * FROM jsonb_array_elements(p->'split_payments') LOOP
      split_total := split_total + GREATEST(COALESCE((elem->>'amount_pence')::integer, 0), 0);
    END LOOP;
    IF split_total > total THEN
      RAISE EXCEPTION 'Payment is more than the outstanding balance.';
    END IF;
    IF split_total > 0 THEN
      PERFORM public.take_payment(jsonb_build_object(
        'invoice_id', inv.id,
        'split_payments', p->'split_payments',
        'client_ref', NULLIF(p->>'client_ref', '')
      ));
    END IF;
  ELSE
    paid := GREATEST(COALESCE((p->>'amount_paid_pence')::integer, 0), 0);
    IF paid > total THEN RAISE EXCEPTION 'Payment is more than the outstanding balance.'; END IF;
    IF paid > 0 THEN
      PERFORM public.take_payment(jsonb_build_object(
        'invoice_id', inv.id,
        'amount_pence', paid,
        'method', COALESCE(p->>'payment_method', 'CASH'),
        'client_ref', NULLIF(p->>'client_ref', '')
      ));
    END IF;
  END IF;

  UPDATE public.invoices SET snapshot = jsonb_build_object(
    'business', public.business_snapshot(),
    'customer', to_jsonb(cust),
    'sale', to_jsonb(sale)
  ) WHERE id = inv.id;

  PERFORM public.apply_invoice_terms(inv.id, p->'terms', uid);

  PERFORM public.log_audit('DIRECT_SALE', 'sales', sale.id, num, jsonb_build_object('total_pence', total));
  SELECT * INTO inv FROM public.invoices WHERE id = inv.id;
  RETURN jsonb_build_object('invoice', to_jsonb(inv), 'sale', to_jsonb(sale));
END $function$;

-- Enhanced sell_phone with split payments support
CREATE OR REPLACE FUNCTION public.sell_phone(p jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid := public.require_staff();
  cust public.customers;
  inv public.invoices;
  sale public.sales;
  stock public.stock_items;
  price integer;
  discount integer;
  total integer;
  paid integer;
  split_total integer := 0;
  elem jsonb;
  num text;
BEGIN
  IF p->>'client_ref' IS NOT NULL AND EXISTS (SELECT 1 FROM public.invoices WHERE client_ref = p->>'client_ref') THEN
    RAISE EXCEPTION 'This transaction has already been processed.';
  END IF;
  SELECT * INTO stock FROM public.stock_items WHERE id = (p->>'stock_item_id')::uuid FOR UPDATE;
  IF stock.id IS NULL THEN RAISE EXCEPTION 'This record no longer exists.'; END IF;
  IF stock.status = 'SOLD' THEN RAISE EXCEPTION 'This phone has already been sold.'; END IF;
  IF stock.status NOT IN ('IN_STOCK', 'RESERVED') THEN RAISE EXCEPTION 'This phone is not available to sell.'; END IF;

  price := GREATEST(COALESCE((p->>'selling_price_pence')::integer, 0), 0);
  discount := GREATEST(COALESCE((p->>'discount_pence')::integer, 0), 0);
  IF discount > price THEN RAISE EXCEPTION 'Discount cannot be more than the price.'; END IF;
  total := price - discount;

  IF p ? 'customer' AND p->'customer' <> 'null'::jsonb THEN
    cust := public.save_customer(p->'customer');
  ELSIF p->>'customer_id' IS NOT NULL THEN
    SELECT * INTO cust FROM public.customers WHERE id = (p->>'customer_id')::uuid;
  END IF;

  num := public.next_doc_number('SEL');

  INSERT INTO public.invoices (
    invoice_number, kind, status, customer_id, subtotal_pence, discount_pence,
    total_pence, balance_pence, created_by, client_ref, notes
  ) VALUES (
    num, 'PHONE_SALE', 'FINAL', cust.id, price, discount, total, total, uid,
    NULLIF(p->>'client_ref', ''), NULLIF(p->>'notes', '')
  ) RETURNING * INTO inv;

  INSERT INTO public.sales (
    invoice_id, sale_kind, customer_id, subtotal_pence, discount_pence, total_pence, cost_pence, notes, created_by
  ) VALUES (
    inv.id, 'PHONE', cust.id, price, discount, total, stock.purchase_cost_pence, NULLIF(p->>'notes', ''), uid
  ) RETURNING * INTO sale;

  INSERT INTO public.sale_items (
    sale_id, stock_item_id, description, quantity, unit_price_pence, line_total_pence, unit_cost_pence
  ) VALUES (
    sale.id, stock.id, trim(COALESCE(stock.brand, '') || ' ' || COALESCE(stock.model, '')), 1, price, price, stock.purchase_cost_pence
  );

  INSERT INTO public.invoice_items (
    invoice_id, description, quantity, unit_price_pence, line_total_pence, stock_item_id, meta
  ) VALUES (
    inv.id, trim(COALESCE(stock.brand, '') || ' ' || COALESCE(stock.model, '')), 1, price, price, stock.id,
    jsonb_build_object('imei', stock.imei, 'storage', stock.storage, 'colour', stock.colour, 'condition', stock.condition)
  );

  UPDATE public.stock_items SET status = 'SOLD', public_visibility = false WHERE id = stock.id;
  INSERT INTO public.stock_movements (stock_item_id, movement_type, quantity_change, reason, reference, created_by)
  VALUES (stock.id, 'SALE', -1, 'Phone sold', num, uid);

  IF cust.id IS NOT NULL THEN
    INSERT INTO public.customer_ledger_entries (customer_id, invoice_id, entry_type, debit_pence, reference, created_by)
    VALUES (cust.id, inv.id, 'INVOICE', total, num, uid);
  END IF;

  -- Process payments (split or single)
  IF p ? 'split_payments' AND jsonb_typeof(p->'split_payments') = 'array' AND jsonb_array_length(p->'split_payments') > 0 THEN
    FOR elem IN SELECT * FROM jsonb_array_elements(p->'split_payments') LOOP
      split_total := split_total + GREATEST(COALESCE((elem->>'amount_pence')::integer, 0), 0);
    END LOOP;
    IF split_total > total THEN
      RAISE EXCEPTION 'Payment is more than the outstanding balance.';
    END IF;
    IF split_total > 0 THEN
      PERFORM public.take_payment(jsonb_build_object(
        'invoice_id', inv.id,
        'split_payments', p->'split_payments',
        'client_ref', NULLIF(p->>'client_ref', '')
      ));
    END IF;
  ELSE
    paid := GREATEST(COALESCE((p->>'amount_paid_pence')::integer, 0), 0);
    IF paid > total THEN RAISE EXCEPTION 'Payment is more than the outstanding balance.'; END IF;
    IF paid > 0 THEN
      PERFORM public.take_payment(jsonb_build_object(
        'invoice_id', inv.id,
        'amount_pence', paid,
        'method', COALESCE(p->>'payment_method', 'CASH'),
        'client_ref', NULLIF(p->>'client_ref', '')
      ));
    END IF;
  END IF;

  SELECT * INTO stock FROM public.stock_items WHERE id = stock.id;
  UPDATE public.invoices SET snapshot = jsonb_build_object(
    'business', public.business_snapshot(),
    'customer', to_jsonb(cust),
    'stock', to_jsonb(stock)
  ) WHERE id = inv.id;

  PERFORM public.apply_invoice_terms(inv.id, p->'terms', uid);

  PERFORM public.log_audit('SELL_PHONE', 'sales', sale.id, num, jsonb_build_object('imei', stock.imei, 'total_pence', total));
  SELECT * INTO inv FROM public.invoices WHERE id = inv.id;
  RETURN jsonb_build_object('invoice', to_jsonb(inv), 'sale', to_jsonb(sale), 'stock_item', to_jsonb(stock));
END $function$;

-- Enhanced create_repair_invoice with split payments support
CREATE OR REPLACE FUNCTION public.create_repair_invoice(p jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid := public.require_staff();
  cust public.customers;
  inv public.invoices;
  rep public.repair_invoices;
  subtotal integer;
  discount integer;
  total integer;
  paid integer;
  split_total integer := 0;
  elem jsonb;
  num text;
BEGIN
  IF p->>'client_ref' IS NOT NULL AND EXISTS (SELECT 1 FROM public.invoices WHERE client_ref = p->>'client_ref') THEN
    RAISE EXCEPTION 'This transaction has already been processed.';
  END IF;

  subtotal := GREATEST(COALESCE((p->>'subtotal_pence')::integer, 0), 0);
  discount := GREATEST(COALESCE((p->>'discount_pence')::integer, 0), 0);
  IF discount > subtotal THEN RAISE EXCEPTION 'Discount cannot be more than the price.'; END IF;
  total := subtotal - discount;

  IF COALESCE(trim(p->>'fault'), '') = '' THEN RAISE EXCEPTION 'Please complete the required fields.'; END IF;

  IF p ? 'customer' AND p->'customer' <> 'null'::jsonb THEN
    cust := public.save_customer(p->'customer');
  ELSIF p->>'customer_id' IS NOT NULL THEN
    SELECT * INTO cust FROM public.customers WHERE id = (p->>'customer_id')::uuid;
  END IF;
  IF cust.id IS NULL THEN RAISE EXCEPTION 'Please complete the required fields.'; END IF;

  num := public.next_doc_number('REP');

  INSERT INTO public.invoices (
    invoice_number, kind, status, customer_id, subtotal_pence, discount_pence,
    total_pence, balance_pence, created_by, client_ref, notes
  ) VALUES (
    num, 'REPAIR', 'FINAL', cust.id, subtotal, discount, total, total, uid,
    NULLIF(p->>'client_ref', ''), NULLIF(p->>'customer_notes', '')
  ) RETURNING * INTO inv;

  INSERT INTO public.repair_invoices (
    repair_number, invoice_id, customer_id, device_brand, device_model, imei, serial,
    fault, repair_description, device_condition, accessories_received, subtotal_pence,
    discount_pence, total_pence, balance_pence, customer_notes, internal_notes, created_by
  ) VALUES (
    num, inv.id, cust.id, NULLIF(p->>'device_brand', ''), NULLIF(p->>'device_model', ''), NULLIF(p->>'imei', ''),
    NULLIF(p->>'serial', ''), p->>'fault', NULLIF(p->>'repair_description', ''), NULLIF(p->>'device_condition', ''),
    NULLIF(p->>'accessories_received', ''), subtotal, discount, total, total,
    NULLIF(p->>'customer_notes', ''), NULLIF(p->>'internal_notes', ''), uid
  ) RETURNING * INTO rep;

  INSERT INTO public.invoice_items (invoice_id, description, quantity, unit_price_pence, line_total_pence, meta)
  VALUES (
    inv.id, COALESCE(NULLIF(p->>'repair_description', ''), p->>'fault'), 1, subtotal, subtotal,
    jsonb_build_object('brand', p->>'device_brand', 'model', p->>'device_model', 'imei', p->>'imei')
  );

  INSERT INTO public.customer_ledger_entries (customer_id, invoice_id, entry_type, debit_pence, reference, created_by)
  VALUES (cust.id, inv.id, 'INVOICE', total, num, uid);

  -- Process payments (split or single)
  IF p ? 'split_payments' AND jsonb_typeof(p->'split_payments') = 'array' AND jsonb_array_length(p->'split_payments') > 0 THEN
    FOR elem IN SELECT * FROM jsonb_array_elements(p->'split_payments') LOOP
      split_total := split_total + GREATEST(COALESCE((elem->>'amount_pence')::integer, 0), 0);
    END LOOP;
    IF split_total > total THEN
      RAISE EXCEPTION 'Payment is more than the outstanding balance.';
    END IF;
    IF split_total > 0 THEN
      PERFORM public.take_payment(jsonb_build_object(
        'invoice_id', inv.id,
        'split_payments', p->'split_payments',
        'client_ref', NULLIF(p->>'client_ref', '')
      ));
    END IF;
  ELSE
    paid := GREATEST(COALESCE((p->>'amount_paid_pence')::integer, 0), 0);
    IF paid > total THEN RAISE EXCEPTION 'Payment is more than the outstanding balance.'; END IF;
    IF paid > 0 THEN
      PERFORM public.take_payment(jsonb_build_object(
        'invoice_id', inv.id,
        'amount_pence', paid,
        'method', COALESCE(p->>'payment_method', 'CASH'),
        'client_ref', NULLIF(p->>'client_ref', '')
      ));
    END IF;
  END IF;

  UPDATE public.invoices SET snapshot = jsonb_build_object(
    'business', public.business_snapshot(),
    'customer', to_jsonb(cust),
    'repair', to_jsonb(rep)
  ) WHERE id = inv.id;

  PERFORM public.apply_invoice_terms(inv.id, p->'terms', uid);

  PERFORM public.log_audit('CREATE_REPAIR', 'repair_invoices', rep.id, num);
  SELECT * INTO inv FROM public.invoices WHERE id = inv.id;
  SELECT * INTO rep FROM public.repair_invoices WHERE id = rep.id;
  RETURN jsonb_build_object('invoice', to_jsonb(inv), 'repair', to_jsonb(rep));
END $function$;
