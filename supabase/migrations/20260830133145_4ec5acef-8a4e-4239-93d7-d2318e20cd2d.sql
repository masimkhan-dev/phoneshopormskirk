ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS refunded_pence integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS refunded_at timestamptz,
  ADD COLUMN IF NOT EXISTS refund_reason text;

CREATE OR REPLACE FUNCTION public.recalc_invoice(_invoice_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE paid integer; inv public.invoices; eff integer;
BEGIN
  SELECT COALESCE(SUM(CASE WHEN direction = 'IN' THEN amount_pence ELSE -amount_pence END),0)
    INTO paid FROM public.payments WHERE invoice_id = _invoice_id;
  SELECT * INTO inv FROM public.invoices WHERE id = _invoice_id;
  eff := GREATEST(inv.total_pence - COALESCE(inv.refunded_pence,0), 0);
  UPDATE public.invoices SET
    amount_paid_pence = GREATEST(paid,0),
    balance_pence = eff - paid,
    payment_status = CASE
      WHEN inv.status = 'VOID' THEN 'UNPAID'
      WHEN eff <= 0 THEN 'PAID'
      WHEN paid <= 0 THEN 'UNPAID'
      WHEN paid >= eff THEN 'PAID'
      ELSE 'PARTIAL' END
  WHERE id = _invoice_id;

  UPDATE public.repair_invoices r SET
    amount_paid_pence = GREATEST(paid,0),
    balance_pence = eff - paid,
    payment_status = CASE WHEN eff <= 0 THEN 'PAID' WHEN paid <= 0 THEN 'UNPAID' WHEN paid >= eff THEN 'PAID' ELSE 'PARTIAL' END
  WHERE r.invoice_id = _invoice_id AND r.record_status <> 'VOIDED';
END $function$;

CREATE OR REPLACE FUNCTION public.refund_invoice(p jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid := public.require_staff();
  inv public.invoices;
  amt integer;
  reason text;
  restock boolean;
  meth text;
  si record;
  refundable integer;
BEGIN
  IF NOT public.is_manager(uid) THEN
    RAISE EXCEPTION 'You do not have permission to perform this action.';
  END IF;
  reason := NULLIF(trim(p->>'reason'),'');
  IF reason IS NULL THEN RAISE EXCEPTION 'Please give a reason for the refund.'; END IF;
  IF p->>'client_ref' IS NOT NULL AND EXISTS (SELECT 1 FROM public.payments WHERE client_ref = p->>'client_ref') THEN
    RAISE EXCEPTION 'This transaction has already been processed.';
  END IF;

  SELECT * INTO inv FROM public.invoices WHERE id = (p->>'invoice_id')::uuid FOR UPDATE;
  IF inv.id IS NULL THEN RAISE EXCEPTION 'This record no longer exists.'; END IF;
  IF inv.status = 'VOID' THEN RAISE EXCEPTION 'This record can no longer be edited.'; END IF;
  IF inv.kind = 'PHONE_PURCHASE' THEN
    RAISE EXCEPTION 'Purchases from customers cannot be refunded. Void the purchase instead.';
  END IF;

  amt := COALESCE((p->>'amount_pence')::integer, 0);
  IF amt <= 0 THEN RAISE EXCEPTION 'Please enter a refund amount.'; END IF;
  refundable := GREATEST(inv.amount_paid_pence, 0);
  IF amt > refundable THEN
    RAISE EXCEPTION 'Refund is more than the % taken on this invoice.', '£' || to_char(refundable::numeric/100,'FM999999990.00');
  END IF;

  meth := COALESCE(NULLIF(p->>'method',''), 'CASH');
  restock := COALESCE((p->>'restock')::boolean, false);

  INSERT INTO public.payments (invoice_id, amount_pence, method, direction, is_reversal, notes, created_by, client_ref)
  VALUES (inv.id, amt, meth, 'OUT', true, 'Refund: ' || reason, uid, NULLIF(p->>'client_ref',''));

  UPDATE public.invoices
    SET refunded_pence = COALESCE(refunded_pence,0) + amt,
        refunded_at = now(),
        refund_reason = reason
  WHERE id = inv.id;

  IF inv.customer_id IS NOT NULL THEN
    INSERT INTO public.customer_ledger_entries (customer_id, invoice_id, entry_type, credit_pence, reference, note, created_by)
    VALUES (inv.customer_id, inv.id, 'REFUND', amt, inv.invoice_number, reason, uid);
  END IF;

  IF restock THEN
    FOR si IN SELECT * FROM public.invoice_items WHERE invoice_id = inv.id LOOP
      IF si.stock_item_id IS NOT NULL AND inv.kind = 'PHONE_SALE' THEN
        UPDATE public.stock_items SET status = 'IN_STOCK' WHERE id = si.stock_item_id AND status = 'SOLD';
        INSERT INTO public.stock_movements (stock_item_id, movement_type, quantity_change, reason, reference, created_by)
        VALUES (si.stock_item_id, 'REFUND_RETURN', 1, reason, inv.invoice_number, uid);
      ELSIF si.product_id IS NOT NULL THEN
        UPDATE public.products SET quantity = quantity + si.quantity WHERE id = si.product_id;
        INSERT INTO public.stock_movements (product_id, movement_type, quantity_change, reason, reference, created_by)
        VALUES (si.product_id, 'REFUND_RETURN', si.quantity, reason, inv.invoice_number, uid);
      END IF;
    END LOOP;
  END IF;

  PERFORM public.recalc_invoice(inv.id);
  PERFORM public.log_audit('REFUND_INVOICE','invoices',inv.id,inv.invoice_number,
    jsonb_build_object('amount_pence',amt,'method',meth,'restock',restock,'reason',reason));
  SELECT * INTO inv FROM public.invoices WHERE id = inv.id;
  RETURN to_jsonb(inv);
END $function$;