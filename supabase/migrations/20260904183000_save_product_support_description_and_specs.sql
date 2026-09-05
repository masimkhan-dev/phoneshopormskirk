-- Enhance save_product to support description, custom slug, and specs (SEO) without altering stock/business rules
CREATE OR REPLACE FUNCTION public.save_product(p jsonb)
RETURNS public.products
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  pr public.products;
  base_slug text;
  final_slug text;
  n int := 1;
  open_qty int := 0;
  uid uuid;
BEGIN
  uid := public.require_staff();
  IF COALESCE(trim(p->>'name'),'') = '' THEN
    RAISE EXCEPTION 'Please complete the required fields.';
  END IF;

  IF p ? 'id' AND (p->>'id') IS NOT NULL THEN
    UPDATE public.products SET
      name = p->>'name',
      slug = COALESCE(NULLIF(regexp_replace(lower(trim(p->>'slug')), '[^a-z0-9-]+', '', 'g'), ''), slug),
      sku = NULLIF(p->>'sku',''),
      category_id = NULLIF(p->>'category_id','')::uuid,
      brand = NULLIF(p->>'brand',''),
      model = NULLIF(p->>'model',''),
      short_description = NULLIF(p->>'short_description',''),
      description = NULLIF(p->>'description',''),
      specs = COALESCE((p->'specs')::jsonb, specs, '{}'::jsonb),
      cost_price_pence = COALESCE((p->>'cost_price_pence')::int, 0),
      price_pence = COALESCE((p->>'price_pence')::int, 0),
      reorder_level = COALESCE((p->>'reorder_level')::int, 0),
      public_visible = COALESCE((p->>'public_visible')::boolean, false),
      featured = COALESCE((p->>'featured')::boolean, false),
      updated_at = now()
    WHERE id = (p->>'id')::uuid
    RETURNING * INTO pr;
    IF pr.id IS NULL THEN RAISE EXCEPTION 'This record no longer exists.'; END IF;
  ELSE
    open_qty := GREATEST(COALESCE((p->>'opening_quantity')::int, (p->>'quantity')::int, 0), 0);

    -- Base slug from custom slug if provided, otherwise from name
    IF COALESCE(trim(p->>'slug'), '') <> '' THEN
      base_slug := regexp_replace(lower(trim(p->>'slug')), '[^a-z0-9]+', '-', 'g');
    ELSE
      base_slug := regexp_replace(lower(trim(p->>'name')), '[^a-z0-9]+', '-', 'g');
    END IF;
    base_slug := trim(both '-' from base_slug);
    IF base_slug = '' THEN base_slug := 'product'; END IF;
    final_slug := base_slug;
    WHILE EXISTS (SELECT 1 FROM public.products WHERE slug = final_slug) LOOP
      n := n + 1;
      final_slug := base_slug || '-' || n;
    END LOOP;

    INSERT INTO public.products (
      name, slug, sku, category_id, brand, model, short_description, description, specs,
      cost_price_pence, price_pence, quantity, reorder_level, public_visible, featured, availability
    ) VALUES (
      p->>'name', final_slug, NULLIF(p->>'sku',''), NULLIF(p->>'category_id','')::uuid,
      NULLIF(p->>'brand',''), NULLIF(p->>'model',''), NULLIF(p->>'short_description',''),
      NULLIF(p->>'description',''), COALESCE((p->'specs')::jsonb, '{}'::jsonb),
      COALESCE((p->>'cost_price_pence')::int, 0), COALESCE((p->>'price_pence')::int, 0),
      open_qty,
      COALESCE((p->>'reorder_level')::int, 0),
      COALESCE((p->>'public_visible')::boolean, false),
      COALESCE((p->>'featured')::boolean, false),
      CASE WHEN open_qty > 0 THEN 'IN_STOCK' ELSE 'OUT_OF_STOCK' END
    ) RETURNING * INTO pr;

    IF open_qty > 0 THEN
      INSERT INTO public.stock_movements (product_id, movement_type, quantity_change, reason, created_by)
      VALUES (pr.id, 'INITIAL_STOCK', open_qty, 'Opening inventory count', uid);
    END IF;
  END IF;

  PERFORM public.log_audit('SAVE_PRODUCT','products',pr.id,pr.name);
  RETURN pr;
END $function$;

REVOKE ALL ON FUNCTION public.save_product(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_product(jsonb) TO authenticated, service_role;
