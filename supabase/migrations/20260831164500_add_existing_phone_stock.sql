-- RPC to add existing / opening phone stock directly into stock_items
-- No invoice, no seller/customer, no payment, zero Day-End/Cash-Up impact

CREATE OR REPLACE FUNCTION public.add_existing_phone_stock(p jsonb)
RETURNS public.stock_items
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid := public.require_staff();
  v_imei text;
  v_sku text;
  stock public.stock_items;
  cost integer;
  price integer;
BEGIN
  IF COALESCE(trim(p->>'model'), '') = '' THEN
    RAISE EXCEPTION 'Please enter a device model.';
  END IF;

  v_imei := NULLIF(trim(p->>'imei'), '');
  IF v_imei IS NULL THEN
    RAISE EXCEPTION 'Please enter a valid 15-digit IMEI number.';
  END IF;

  v_imei := regexp_replace(v_imei, '[^0-9]', '', 'g');
  IF length(v_imei) <> 15 THEN
    RAISE EXCEPTION 'IMEI must be exactly 15 digits.';
  END IF;

  -- Check complete handset history to prevent duplicate entry of same IMEI
  IF EXISTS (SELECT 1 FROM public.stock_items WHERE imei = v_imei) THEN
    RAISE EXCEPTION 'A handset with this IMEI already exists in the system history.';
  END IF;

  cost := GREATEST(COALESCE((p->>'purchase_cost_pence')::integer, 0), 0);
  price := NULLIF(p->>'selling_price_pence', '')::integer;
  IF price IS NOT NULL AND price < 0 THEN
    RAISE EXCEPTION 'Selling price cannot be negative.';
  END IF;

  -- Generate unique stock SKU (e.g. PS-000123)
  v_sku := replace(public.next_doc_number('STOCK'), 'STOCK-', 'PS-');

  INSERT INTO public.stock_items (
    sku, brand, model, imei, serial, storage, colour, network,
    condition, battery_health, purchase_cost_pence, selling_price_pence,
    source, status, notes, created_by
  ) VALUES (
    v_sku,
    NULLIF(trim(p->>'brand'), ''),
    trim(p->>'model'),
    v_imei,
    NULLIF(trim(p->>'serial'), ''),
    NULLIF(trim(p->>'storage'), ''),
    NULLIF(trim(p->>'colour'), ''),
    COALESCE(NULLIF(trim(p->>'network'), ''), 'Unlocked'),
    NULLIF(trim(p->>'condition'), ''),
    NULLIF(trim(p->>'battery_health'), ''),
    cost,
    price,
    'OPENING_STOCK',
    'IN_STOCK',
    NULLIF(trim(p->>'notes'), ''),
    uid
  )
  RETURNING * INTO stock;

  -- Record audit stock movement (uses existing MANUAL_ADJUSTMENT movement_type)
  INSERT INTO public.stock_movements (
    stock_item_id, movement_type, quantity_change, reason, reference, created_by
  ) VALUES (
    stock.id, 'MANUAL_ADJUSTMENT', 1, 'Existing / opening phone stock entry', stock.sku, uid
  );

  PERFORM public.log_audit(
    'ADD_STOCK_ITEM',
    'stock_items',
    stock.id,
    stock.sku,
    jsonb_build_object('imei', v_imei, 'brand', stock.brand, 'model', stock.model, 'source', 'OPENING_STOCK')
  );

  RETURN stock;
END $function$;

REVOKE EXECUTE ON FUNCTION public.add_existing_phone_stock(jsonb) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.add_existing_phone_stock(jsonb) TO authenticated, service_role;
