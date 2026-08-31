-- Terms & warranty templates, one row per transaction type
CREATE TABLE public.invoice_terms_settings (
  type text PRIMARY KEY,
  label text NOT NULL,
  enable_warranty boolean NOT NULL DEFAULT true,
  default_warranty_days integer NOT NULL DEFAULT 90,
  warranty_title text NOT NULL DEFAULT 'Warranty',
  warranty_text text NOT NULL DEFAULT '',
  exclusions_text text NOT NULL DEFAULT '',
  default_terms text NOT NULL DEFAULT '',
  footer_note text NOT NULL DEFAULT '',
  seller_declaration text NOT NULL DEFAULT '',
  payment_ack_text text NOT NULL DEFAULT '',
  id_verification_note text NOT NULL DEFAULT '',
  battery_disclaimer text NOT NULL DEFAULT '',
  returns_policy text NOT NULL DEFAULT '',
  manufacturer_note text NOT NULL DEFAULT '',
  doa_days integer NOT NULL DEFAULT 0,
  activation_note text NOT NULL DEFAULT '',
  accessories_note text NOT NULL DEFAULT '',
  require_acknowledgement boolean NOT NULL DEFAULT false,
  show_signature_line boolean NOT NULL DEFAULT true,
  show_on_thermal boolean NOT NULL DEFAULT true,
  show_on_a4 boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT invoice_terms_settings_type_check
    CHECK (type IN ('REPAIR','PURCHASE','SALES','NEW_PHONE'))
);

GRANT SELECT, UPDATE ON public.invoice_terms_settings TO authenticated;
GRANT ALL ON public.invoice_terms_settings TO service_role;
ALTER TABLE public.invoice_terms_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can read invoice terms templates"
  ON public.invoice_terms_settings FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE POLICY "Managers can edit invoice terms templates"
  ON public.invoice_terms_settings FOR UPDATE TO authenticated
  USING (public.is_manager(auth.uid()))
  WITH CHECK (public.is_manager(auth.uid()));

CREATE TRIGGER invoice_terms_settings_updated
  BEFORE UPDATE ON public.invoice_terms_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Immutable per-invoice terms snapshot
CREATE TABLE public.invoice_terms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL UNIQUE REFERENCES public.invoices(id) ON DELETE CASCADE,
  invoice_type text NOT NULL,
  warranty_days integer NOT NULL DEFAULT 0,
  warranty_expires date,
  warranty_title text,
  warranty_text text,
  terms_text text,
  exclusions_text text,
  footer_note text,
  additional_terms text,
  internal_note text,
  customer_note text,
  print_customer_note boolean NOT NULL DEFAULT true,
  customer_acknowledged boolean NOT NULL DEFAULT false,
  show_on_thermal boolean NOT NULL DEFAULT true,
  show_on_a4 boolean NOT NULL DEFAULT true,
  show_signature_line boolean NOT NULL DEFAULT true,
  settings_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.invoice_terms TO authenticated;
GRANT ALL ON public.invoice_terms TO service_role;
ALTER TABLE public.invoice_terms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can read invoice terms"
  ON public.invoice_terms FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

-- Attach terms to a freshly created invoice. Insert-once, never updatable.
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
BEGIN
  SELECT * INTO inv FROM public.invoices WHERE id = (p->>'invoice_id')::uuid FOR UPDATE;
  IF inv.id IS NULL THEN RAISE EXCEPTION 'This record no longer exists.'; END IF;
  IF EXISTS (SELECT 1 FROM public.invoice_terms WHERE invoice_id = inv.id) THEN
    RETURN jsonb_build_object('already_saved', true);
  END IF;

  ttype := COALESCE(NULLIF(p->>'invoice_type',''), CASE inv.kind
    WHEN 'REPAIR' THEN 'REPAIR'
    WHEN 'PHONE_PURCHASE' THEN 'PURCHASE'
    WHEN 'PHONE_SALE' THEN 'SALES'
    ELSE 'NEW_PHONE' END);
  IF ttype NOT IN ('REPAIR','PURCHASE','SALES','NEW_PHONE') THEN
    RAISE EXCEPTION 'That could not be saved. Please check the details and try again.';
  END IF;

  SELECT * INTO tpl FROM public.invoice_terms_settings WHERE type = ttype;

  days := GREATEST(COALESCE((p->>'warranty_days')::integer, 0), 0);
  IF days > 3650 THEN RAISE EXCEPTION 'Warranty length looks too long.'; END IF;
  IF days > 0 THEN
    expires := ((inv.created_at AT TIME ZONE 'Europe/London')::date + days);
  END IF;

  INSERT INTO public.invoice_terms (
    invoice_id, invoice_type, warranty_days, warranty_expires, warranty_title, warranty_text,
    terms_text, exclusions_text, footer_note, additional_terms, internal_note, customer_note,
    print_customer_note, customer_acknowledged, show_on_thermal, show_on_a4, show_signature_line,
    settings_snapshot, created_by
  ) VALUES (
    inv.id, ttype, days, expires,
    NULLIF(p->>'warranty_title',''), NULLIF(p->>'warranty_text',''),
    NULLIF(p->>'terms_text',''), NULLIF(p->>'exclusions_text',''), NULLIF(p->>'footer_note',''),
    NULLIF(p->>'additional_terms',''), NULLIF(p->>'internal_note',''), NULLIF(p->>'customer_note',''),
    COALESCE((p->>'print_customer_note')::boolean, true),
    COALESCE((p->>'customer_acknowledged')::boolean, false),
    COALESCE((p->>'show_on_thermal')::boolean, COALESCE(tpl.show_on_thermal, true)),
    COALESCE((p->>'show_on_a4')::boolean, COALESCE(tpl.show_on_a4, true)),
    COALESCE((p->>'show_signature_line')::boolean, COALESCE(tpl.show_signature_line, true)),
    COALESCE(to_jsonb(tpl), '{}'::jsonb), uid
  ) RETURNING * INTO t;

  UPDATE public.invoices
    SET snapshot = COALESCE(snapshot, '{}'::jsonb) || jsonb_build_object('terms', to_jsonb(t))
    WHERE id = inv.id;

  PERFORM public.log_audit('ATTACH_INVOICE_TERMS','invoices',inv.id,inv.invoice_number,
    jsonb_build_object('warranty_days', days, 'type', ttype));
  RETURN to_jsonb(t);
END $function$;

-- Seed the four templates with sensible UK shop wording
INSERT INTO public.invoice_terms_settings (
  type, label, enable_warranty, default_warranty_days, warranty_title, warranty_text,
  exclusions_text, default_terms, footer_note, require_acknowledgement
) VALUES
('REPAIR','Repair terms', true, 90, 'Repair warranty',
 'Warranty covers the specific repaired component only. Physical damage, liquid damage and unauthorised third-party repairs void this warranty.',
 E'Not covered:\n• Physical damage, drops or impact after the repair\n• Liquid damage or moisture ingress\n• Damage caused by unauthorised third-party repairs\n• Normal wear, tear and cosmetic damage\n• Pre-existing faults not reported at booking',
 'Repair carried out using quality replacement parts. The customer is advised to test the device before leaving the shop. To claim warranty, bring this receipt and the device to 4 Aughton St, Ormskirk. Warranty is void if the IMEI does not match our records.',
 'Thank you for choosing Phone Shop Ormskirk. Please retain this receipt for warranty claims.', true),
('PURCHASE','Purchase terms (buying from a customer)', false, 0, 'Seller declaration',
 'The seller confirms they are the lawful owner of this device. The device is not reported lost or stolen and is free from outstanding finance or network obligations. Information given about the condition of the device is accurate to the best of the seller''s knowledge.',
 '',
 'Phone Shop Ormskirk has purchased this device from the seller as seen. The IMEI has been logged and the condition assessed at the time of purchase. This purchase is final — no returns or exchanges on bought devices.',
 'Phone Shop Ormskirk, 4 Aughton St, Ormskirk L39 3BW · 07496 499992', true),
('SALES','Sales terms (pre-owned phone)', true, 30, 'Pre-owned device warranty',
 'This pre-owned device is covered for the stated period against hardware faults only. Battery performance is not guaranteed as this is a used device. Physical damage, liquid damage and unauthorised repairs void this warranty.',
 E'Not covered:\n• Cracked or damaged screens\n• Liquid damage\n• Unauthorised repairs\n• Software or account issues\n• Wear, tear and cosmetic marks',
 'Device sold as pre-owned. The customer has inspected the device and accepted its condition as described at the point of sale.',
 'Thank you for your purchase. Please retain this receipt for warranty claims.', true),
('NEW_PHONE','New phone terms', true, 14, 'Shop support warranty',
 'This device is covered by the manufacturer''s standard warranty. In addition, Phone Shop Ormskirk provides a support period for setup assistance and immediate exchange for dead-on-arrival faults within the stated number of days.',
 E'Not covered:\n• Accidental or liquid damage\n• Damage from unauthorised repairs\n• Loss of data or account lockouts',
 'Box, charger and cable are included as supplied by the manufacturer. The device must be activated within 14 days for the manufacturer warranty to remain valid.',
 'Manufacturer warranty terms apply in full. Phone Shop Ormskirk, 4 Aughton St, Ormskirk L39 3BW.', false);

UPDATE public.invoice_terms_settings
  SET seller_declaration = warranty_text,
      payment_ack_text = 'Payment of the agreed amount has been received in full by the seller. No further claims shall arise from this transaction.',
      id_verification_note = 'Seller identification checked at the counter (passport, driving licence or national ID).'
  WHERE type = 'PURCHASE';

UPDATE public.invoice_terms_settings
  SET battery_disclaimer = 'Battery health varies on pre-owned devices. Actual battery performance may differ from a new device.',
      returns_policy = E'• Returns accepted within 14 days if the device is faulty and undamaged\n• Exchange subject to stock availability\n• Device must be returned in the same condition'
  WHERE type = 'SALES';

UPDATE public.invoice_terms_settings
  SET manufacturer_note = 'Covered by the manufacturer''s standard 12 month warranty.',
      doa_days = 7,
      activation_note = 'Device must be activated within 14 days for warranty to remain valid.',
      accessories_note = 'Box, charger and cable included as per manufacturer.'
  WHERE type = 'NEW_PHONE';