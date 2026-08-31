-- Make customer phone column nullable with default empty string
ALTER TABLE public.customers ALTER COLUMN phone DROP NOT NULL;
ALTER TABLE public.customers ALTER COLUMN phone SET DEFAULT '';

-- Update save_customer to make phone optional and reuse existing customer by normalized phone when provided
CREATE OR REPLACE FUNCTION public.save_customer(p jsonb)
RETURNS public.customers LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := public.require_staff();
  c public.customers;
  v_raw_phone text;
  v_norm_phone text := '';
BEGIN
  IF COALESCE(trim(p->>'name'),'') = '' THEN
    RAISE EXCEPTION 'Please enter customer name.';
  END IF;

  v_raw_phone := COALESCE(trim(p->>'phone'), '');
  IF v_raw_phone <> '' THEN
    v_norm_phone := public.norm_phone(v_raw_phone);
  END IF;

  -- 1. If explicit ID provided, update that record
  IF p ? 'id' AND (p->>'id') IS NOT NULL AND trim(p->>'id') <> '' THEN
    UPDATE public.customers SET
      name = p->>'name',
      phone = v_raw_phone,
      phone_normalized = NULLIF(v_norm_phone, ''),
      email = COALESCE(NULLIF(p->>'email',''), email),
      address = COALESCE(NULLIF(p->>'address',''), address),
      postcode = COALESCE(NULLIF(p->>'postcode',''), postcode),
      notes = COALESCE(NULLIF(p->>'notes',''), notes)
    WHERE id = (p->>'id')::uuid RETURNING * INTO c;
    IF c.id IS NOT NULL THEN
      PERFORM public.log_audit('SAVE_CUSTOMER','customers',c.id,c.name);
      RETURN c;
    END IF;
  END IF;

  -- 2. If valid phone is provided, check if it already belongs to an existing customer
  IF v_norm_phone <> '' THEN
    SELECT * INTO c FROM public.customers
    WHERE phone_normalized = v_norm_phone
    ORDER BY created_at ASC
    LIMIT 1;

    IF c.id IS NOT NULL THEN
      PERFORM public.log_audit('REUSE_CUSTOMER','customers',c.id,c.name);
      RETURN c;
    END IF;
  END IF;

  -- 3. Otherwise create a new customer record
  INSERT INTO public.customers (name, phone, phone_normalized, email, address, postcode, notes, created_by)
  VALUES (
    p->>'name',
    v_raw_phone,
    NULLIF(v_norm_phone, ''),
    NULLIF(p->>'email',''),
    NULLIF(p->>'address',''),
    NULLIF(p->>'postcode',''),
    NULLIF(p->>'notes',''),
    uid
  )
  RETURNING * INTO c;

  PERFORM public.log_audit('SAVE_CUSTOMER','customers',c.id,c.name);
  RETURN c;
END $$;

REVOKE EXECUTE ON FUNCTION public.save_customer(jsonb) FROM anon, public;
