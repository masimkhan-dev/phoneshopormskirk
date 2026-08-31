-- ============ ROLES / PROFILES ============
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('OWNER','ADMIN','STAFF','TECHNICIAN');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY,
  full_name text,
  email text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.profiles p ON p.id = ur.user_id
    WHERE ur.user_id = _user_id AND p.active
  );
$$;

CREATE OR REPLACE FUNCTION public.is_manager(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.profiles p ON p.id = ur.user_id
    WHERE ur.user_id = _user_id AND p.active AND ur.role IN ('OWNER','ADMIN')
  );
$$;

CREATE POLICY "Staff read profiles" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "Own profile insert" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());
CREATE POLICY "Own profile or manager update" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.is_manager(auth.uid()))
  WITH CHECK (id = auth.uid() OR public.is_manager(auth.uid()));

CREATE POLICY "Staff read roles" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_staff(auth.uid()));

CREATE TRIGGER profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- bootstrap: first signed-in user becomes OWNER
CREATE OR REPLACE FUNCTION public.ensure_profile(_full_name text DEFAULT NULL, _email text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); first_user boolean;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (uid, _full_name, _email)
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name),
    email = COALESCE(EXCLUDED.email, public.profiles.email);
  SELECT NOT EXISTS (SELECT 1 FROM public.user_roles) INTO first_user;
  IF first_user THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (uid, 'OWNER') ON CONFLICT DO NOTHING;
  END IF;
  RETURN jsonb_build_object(
    'user_id', uid,
    'roles', COALESCE((SELECT jsonb_agg(role) FROM public.user_roles WHERE user_id = uid), '[]'::jsonb),
    'active', COALESCE((SELECT active FROM public.profiles WHERE id = uid), false)
  );
END $$;

-- ============ PARTIES ============
CREATE TABLE IF NOT EXISTS public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text NOT NULL,
  phone_normalized text,
  email text,
  address text,
  postcode text,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.customers TO authenticated;
GRANT ALL ON public.customers TO service_role;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read customers" ON public.customers FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff create customers" ON public.customers FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff update customers" ON public.customers FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER customers_updated BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX IF NOT EXISTS customers_phone_idx ON public.customers (phone_normalized);
CREATE INDEX IF NOT EXISTS customers_name_idx ON public.customers (lower(name));
CREATE INDEX IF NOT EXISTS customers_email_idx ON public.customers (lower(email));

CREATE TABLE IF NOT EXISTS public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  company text,
  phone text,
  email text,
  address text,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.suppliers TO authenticated;
GRANT ALL ON public.suppliers TO service_role;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read suppliers" ON public.suppliers FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff create suppliers" ON public.suppliers FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Managers update suppliers" ON public.suppliers FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER suppliers_updated BEFORE UPDATE ON public.suppliers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ DOCUMENT NUMBERING ============
CREATE TABLE IF NOT EXISTS public.doc_sequences (
  prefix text PRIMARY KEY,
  last_value integer NOT NULL DEFAULT 0
);
GRANT SELECT ON public.doc_sequences TO authenticated;
GRANT ALL ON public.doc_sequences TO service_role;
ALTER TABLE public.doc_sequences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read sequences" ON public.doc_sequences FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
INSERT INTO public.doc_sequences (prefix) VALUES ('REP'),('BUY'),('SEL'),('PRD') ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.next_doc_number(_prefix text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v integer;
BEGIN
  INSERT INTO public.doc_sequences (prefix, last_value) VALUES (_prefix, 1)
  ON CONFLICT (prefix) DO UPDATE SET last_value = public.doc_sequences.last_value + 1
  RETURNING last_value INTO v;
  RETURN _prefix || '-' || lpad(v::text, 6, '0');
END $$;

-- ============ INVOICES / PAYMENTS ============
CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text NOT NULL UNIQUE,
  kind text NOT NULL CHECK (kind IN ('REPAIR','PHONE_PURCHASE','PHONE_SALE','PRODUCT_SALE')),
  status text NOT NULL DEFAULT 'FINAL' CHECK (status IN ('DRAFT','FINAL','VOID')),
  customer_id uuid REFERENCES public.customers(id),
  supplier_id uuid REFERENCES public.suppliers(id),
  subtotal_pence integer NOT NULL DEFAULT 0 CHECK (subtotal_pence >= 0),
  discount_pence integer NOT NULL DEFAULT 0 CHECK (discount_pence >= 0),
  total_pence integer NOT NULL DEFAULT 0 CHECK (total_pence >= 0),
  amount_paid_pence integer NOT NULL DEFAULT 0 CHECK (amount_paid_pence >= 0),
  balance_pence integer NOT NULL DEFAULT 0,
  payment_status text NOT NULL DEFAULT 'UNPAID' CHECK (payment_status IN ('UNPAID','PARTIAL','PAID')),
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  client_ref text UNIQUE,
  void_reason text,
  voided_by uuid,
  voided_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.invoices TO authenticated;
GRANT ALL ON public.invoices TO service_role;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read invoices" ON public.invoices FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE TRIGGER invoices_updated BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX IF NOT EXISTS invoices_created_idx ON public.invoices (created_at DESC);
CREATE INDEX IF NOT EXISTS invoices_kind_idx ON public.invoices (kind, created_at DESC);
CREATE INDEX IF NOT EXISTS invoices_number_idx ON public.invoices (invoice_number);

CREATE TABLE IF NOT EXISTS public.invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  description text NOT NULL,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price_pence integer NOT NULL DEFAULT 0,
  line_total_pence integer NOT NULL DEFAULT 0,
  product_id uuid,
  stock_item_id uuid,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.invoice_items TO authenticated;
GRANT ALL ON public.invoice_items TO service_role;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read invoice items" ON public.invoice_items FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE INDEX IF NOT EXISTS invoice_items_invoice_idx ON public.invoice_items (invoice_id);

CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  amount_pence integer NOT NULL,
  method text NOT NULL DEFAULT 'CASH' CHECK (method IN ('CASH','CARD','BANK_TRANSFER','OTHER')),
  direction text NOT NULL DEFAULT 'IN' CHECK (direction IN ('IN','OUT')),
  reference text,
  notes text,
  is_reversal boolean NOT NULL DEFAULT false,
  client_ref text UNIQUE,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read payments" ON public.payments FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE INDEX IF NOT EXISTS payments_invoice_idx ON public.payments (invoice_id);
CREATE INDEX IF NOT EXISTS payments_created_idx ON public.payments (created_at DESC);

-- ============ REPAIRS ============
CREATE TABLE IF NOT EXISTS public.repair_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  repair_number text NOT NULL UNIQUE,
  invoice_id uuid REFERENCES public.invoices(id),
  customer_id uuid REFERENCES public.customers(id),
  device_brand text,
  device_model text,
  imei text,
  serial text,
  fault text NOT NULL,
  repair_description text,
  device_condition text,
  accessories_received text,
  subtotal_pence integer NOT NULL DEFAULT 0 CHECK (subtotal_pence >= 0),
  discount_pence integer NOT NULL DEFAULT 0 CHECK (discount_pence >= 0),
  total_pence integer NOT NULL DEFAULT 0 CHECK (total_pence >= 0),
  amount_paid_pence integer NOT NULL DEFAULT 0 CHECK (amount_paid_pence >= 0),
  balance_pence integer NOT NULL DEFAULT 0,
  payment_status text NOT NULL DEFAULT 'UNPAID' CHECK (payment_status IN ('UNPAID','PARTIAL','PAID')),
  record_status text NOT NULL DEFAULT 'OPEN' CHECK (record_status IN ('OPEN','COMPLETED','VOIDED')),
  customer_notes text,
  internal_notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.repair_invoices TO authenticated;
GRANT ALL ON public.repair_invoices TO service_role;
ALTER TABLE public.repair_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read repairs" ON public.repair_invoices FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE TRIGGER repair_invoices_updated BEFORE UPDATE ON public.repair_invoices FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX IF NOT EXISTS repair_number_idx ON public.repair_invoices (repair_number);
CREATE INDEX IF NOT EXISTS repair_created_idx ON public.repair_invoices (created_at DESC);
CREATE INDEX IF NOT EXISTS repair_imei_idx ON public.repair_invoices (imei);

-- ============ STOCK ============
CREATE TABLE IF NOT EXISTS public.stock_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku text NOT NULL UNIQUE,
  brand text,
  model text,
  imei text,
  serial text,
  storage text,
  colour text,
  network text,
  condition text,
  battery_health text,
  purchase_cost_pence integer NOT NULL DEFAULT 0 CHECK (purchase_cost_pence >= 0),
  selling_price_pence integer CHECK (selling_price_pence IS NULL OR selling_price_pence >= 0),
  source text,
  purchase_reference text,
  status text NOT NULL DEFAULT 'IN_STOCK' CHECK (status IN ('IN_STOCK','RESERVED','SOLD','REMOVED','VOIDED')),
  public_visibility boolean NOT NULL DEFAULT false,
  featured boolean NOT NULL DEFAULT false,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.stock_items TO authenticated;
GRANT ALL ON public.stock_items TO service_role;
ALTER TABLE public.stock_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read stock" ON public.stock_items FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE TRIGGER stock_items_updated BEFORE UPDATE ON public.stock_items FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE UNIQUE INDEX IF NOT EXISTS stock_active_imei_uniq ON public.stock_items (imei)
  WHERE imei IS NOT NULL AND status IN ('IN_STOCK','RESERVED');
CREATE INDEX IF NOT EXISTS stock_imei_idx ON public.stock_items (imei);
CREATE INDEX IF NOT EXISTS stock_serial_idx ON public.stock_items (serial);
CREATE INDEX IF NOT EXISTS stock_status_idx ON public.stock_items (status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_item_id uuid REFERENCES public.stock_items(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
  movement_type text NOT NULL CHECK (movement_type IN ('PURCHASE','SALE','RETURN','MANUAL_ADJUSTMENT','VOID_REVERSAL','REMOVAL')),
  quantity_change integer NOT NULL,
  reason text,
  reference text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.stock_movements TO authenticated;
GRANT ALL ON public.stock_movements TO service_role;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read stock movements" ON public.stock_movements FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE INDEX IF NOT EXISTS stock_movements_created_idx ON public.stock_movements (created_at DESC);

-- ============ PURCHASES / SALES ============
CREATE TABLE IF NOT EXISTS public.phone_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid REFERENCES public.invoices(id),
  seller_customer_id uuid REFERENCES public.customers(id),
  supplier_id uuid REFERENCES public.suppliers(id),
  purchase_date date NOT NULL DEFAULT (now() AT TIME ZONE 'Europe/London')::date,
  total_pence integer NOT NULL DEFAULT 0 CHECK (total_pence >= 0),
  payment_method text NOT NULL DEFAULT 'CASH',
  record_status text NOT NULL DEFAULT 'COMPLETED' CHECK (record_status IN ('COMPLETED','VOIDED')),
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.phone_purchases TO authenticated;
GRANT ALL ON public.phone_purchases TO service_role;
ALTER TABLE public.phone_purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read purchases" ON public.phone_purchases FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE TRIGGER phone_purchases_updated BEFORE UPDATE ON public.phone_purchases FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX IF NOT EXISTS purchases_created_idx ON public.phone_purchases (created_at DESC);

CREATE TABLE IF NOT EXISTS public.phone_purchase_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id uuid NOT NULL REFERENCES public.phone_purchases(id) ON DELETE CASCADE,
  stock_item_id uuid REFERENCES public.stock_items(id),
  brand text, model text, imei text, serial text, storage text, colour text,
  network text, condition text, battery_health text,
  device_checks jsonb NOT NULL DEFAULT '{}'::jsonb,
  faults text, accessories text,
  cost_pence integer NOT NULL DEFAULT 0 CHECK (cost_pence >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.phone_purchase_items TO authenticated;
GRANT ALL ON public.phone_purchase_items TO service_role;
ALTER TABLE public.phone_purchase_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read purchase items" ON public.phone_purchase_items FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

CREATE TABLE IF NOT EXISTS public.sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid REFERENCES public.invoices(id),
  sale_kind text NOT NULL CHECK (sale_kind IN ('PHONE','PRODUCT')),
  customer_id uuid REFERENCES public.customers(id),
  subtotal_pence integer NOT NULL DEFAULT 0 CHECK (subtotal_pence >= 0),
  discount_pence integer NOT NULL DEFAULT 0 CHECK (discount_pence >= 0),
  total_pence integer NOT NULL DEFAULT 0 CHECK (total_pence >= 0),
  cost_pence integer NOT NULL DEFAULT 0,
  record_status text NOT NULL DEFAULT 'COMPLETED' CHECK (record_status IN ('COMPLETED','VOIDED')),
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.sales TO authenticated;
GRANT ALL ON public.sales TO service_role;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read sales" ON public.sales FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE TRIGGER sales_updated BEFORE UPDATE ON public.sales FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX IF NOT EXISTS sales_created_idx ON public.sales (created_at DESC);

CREATE TABLE IF NOT EXISTS public.sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  stock_item_id uuid REFERENCES public.stock_items(id),
  product_id uuid REFERENCES public.products(id),
  description text NOT NULL,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price_pence integer NOT NULL DEFAULT 0,
  line_total_pence integer NOT NULL DEFAULT 0,
  unit_cost_pence integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.sale_items TO authenticated;
GRANT ALL ON public.sale_items TO service_role;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read sale items" ON public.sale_items FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

-- ============ LEDGERS / AUDIT ============
CREATE TABLE IF NOT EXISTS public.customer_ledger_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  payment_id uuid REFERENCES public.payments(id) ON DELETE SET NULL,
  entry_type text NOT NULL CHECK (entry_type IN ('INVOICE','PAYMENT','REVERSAL','ADJUSTMENT')),
  debit_pence integer NOT NULL DEFAULT 0,
  credit_pence integer NOT NULL DEFAULT 0,
  reference text,
  note text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.customer_ledger_entries TO authenticated;
GRANT ALL ON public.customer_ledger_entries TO service_role;
ALTER TABLE public.customer_ledger_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read customer ledger" ON public.customer_ledger_entries FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE INDEX IF NOT EXISTS customer_ledger_idx ON public.customer_ledger_entries (customer_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.supplier_ledger_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  payment_id uuid REFERENCES public.payments(id) ON DELETE SET NULL,
  entry_type text NOT NULL CHECK (entry_type IN ('INVOICE','PAYMENT','REVERSAL','ADJUSTMENT')),
  debit_pence integer NOT NULL DEFAULT 0,
  credit_pence integer NOT NULL DEFAULT 0,
  reference text,
  note text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.supplier_ledger_entries TO authenticated;
GRANT ALL ON public.supplier_ledger_entries TO service_role;
ALTER TABLE public.supplier_ledger_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read supplier ledger" ON public.supplier_ledger_entries FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  action text NOT NULL,
  entity text,
  entity_id uuid,
  summary text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Managers read audit" ON public.audit_logs FOR SELECT TO authenticated USING (public.is_manager(auth.uid()));
CREATE INDEX IF NOT EXISTS audit_created_idx ON public.audit_logs (created_at DESC);

-- ============ PRODUCTS: inventory fields ============
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS sku text,
  ADD COLUMN IF NOT EXISTS cost_price_pence integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS quantity integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reorder_level integer NOT NULL DEFAULT 0;
CREATE UNIQUE INDEX IF NOT EXISTS products_sku_uniq ON public.products (lower(sku)) WHERE sku IS NOT NULL;

-- staff write access to website-facing content tables
GRANT INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.product_categories TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.repair_services TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.product_images TO authenticated;
GRANT UPDATE ON public.business_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.faqs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_reviews TO authenticated;
GRANT SELECT, UPDATE ON public.website_enquiries TO authenticated;

CREATE POLICY "Staff manage products" ON public.products FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff manage categories" ON public.product_categories FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff manage repair services" ON public.repair_services FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff manage product images" ON public.product_images FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Managers manage business settings" ON public.business_settings FOR UPDATE TO authenticated
  USING (public.is_manager(auth.uid())) WITH CHECK (public.is_manager(auth.uid()));
CREATE POLICY "Staff manage faqs" ON public.faqs FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff manage reviews" ON public.customer_reviews FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff read enquiries" ON public.website_enquiries FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff update enquiries" ON public.website_enquiries FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- enquiry status values
ALTER TABLE public.website_enquiries DROP CONSTRAINT IF EXISTS website_enquiries_status_check;
ALTER TABLE public.website_enquiries ADD CONSTRAINT website_enquiries_status_check
  CHECK (status IN ('NEW','CONTACTED','CONVERTED','CLOSED'));
-- the insert trigger forces NEW on create; updates by staff may change it
CREATE OR REPLACE FUNCTION public.validate_enquiry()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.status := 'NEW';
  RETURN NEW;
END $$;

-- serialized phones on the public site
CREATE POLICY "Public can read visible stock phones" ON public.stock_items FOR SELECT TO anon
  USING (public_visibility = true AND status = 'IN_STOCK');
GRANT SELECT ON public.stock_items TO anon;