-- ============================================================================
-- PHONE STORE ORMSKIRK - FINAL VERIFIED PRODUCTION DATABASE SCRIPT
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. ENUMS
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('OWNER', 'ADMIN', 'STAFF', 'TECHNICIAN');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. TRIGGER FUNCTIONS
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.invoice_terms_immutable()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  RAISE EXCEPTION 'Saved terms cannot be changed. Void the invoice and create a new one.';
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_enquiry()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.status := 'NEW';
  RETURN NEW;
END;
$$;

-- 3. TABLES DEFINITION (WITH PRIMARY KEYS & FOREIGN KEYS)

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY,
  full_name text,
  email text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

CREATE TABLE IF NOT EXISTS public.business_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name text NOT NULL,
  tagline text,
  address_line1 text,
  address_line2 text,
  city text,
  postcode text,
  phone text,
  whatsapp text,
  email text,
  opening_hours jsonb NOT NULL DEFAULT '[]'::jsonb,
  google_maps_url text,
  google_maps_embed_url text,
  google_reviews_url text,
  google_directions_url text,
  social_links jsonb NOT NULL DEFAULT '{}'::jsonb,
  warranty_policy text,
  payment_methods text[] NOT NULL DEFAULT '{}'::text[],
  offer_banner_text text,
  offer_banner_url text,
  offer_banner_active boolean NOT NULL DEFAULT false,
  latitude numeric,
  longitude numeric,
  google_review_write_url text,
  storefront_image_url text,
  storefront_interior_image_url text,
  google_rating numeric(2,1),
  google_review_count integer,
  logo_url text,
  timezone text NOT NULL DEFAULT 'Europe/London'::text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text DEFAULT ''::text,
  phone_normalized text,
  email text,
  address text,
  postcode text,
  notes text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  company text,
  phone text,
  email text,
  address text,
  notes text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.doc_sequences (
  prefix text PRIMARY KEY,
  last_value integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.product_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  sku text,
  category_id uuid REFERENCES public.product_categories(id) ON DELETE SET NULL,
  brand text,
  model text,
  short_description text,
  description text,
  cost_price_pence integer NOT NULL DEFAULT 0,
  price_pence integer,
  quantity integer NOT NULL DEFAULT 0,
  reorder_level integer NOT NULL DEFAULT 0,
  condition text,
  storage text,
  colour text,
  availability text NOT NULL DEFAULT 'AVAILABLE'::text,
  specs jsonb NOT NULL DEFAULT '{}'::jsonb,
  public_visible boolean NOT NULL DEFAULT true,
  featured boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  url text NOT NULL,
  alt_text text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

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
  purchase_cost_pence integer NOT NULL DEFAULT 0,
  selling_price_pence integer,
  source text,
  purchase_reference text,
  status text NOT NULL DEFAULT 'IN_STOCK'::text,
  public_visibility boolean NOT NULL DEFAULT false,
  featured boolean NOT NULL DEFAULT false,
  notes text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_item_id uuid REFERENCES public.stock_items(id) ON DELETE SET NULL,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  movement_type text NOT NULL,
  quantity_change integer NOT NULL,
  reason text,
  reference text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text NOT NULL UNIQUE,
  kind text NOT NULL,
  status text NOT NULL DEFAULT 'FINAL'::text,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  subtotal_pence integer NOT NULL DEFAULT 0,
  discount_pence integer NOT NULL DEFAULT 0,
  total_pence integer NOT NULL DEFAULT 0,
  amount_paid_pence integer NOT NULL DEFAULT 0,
  balance_pence integer NOT NULL DEFAULT 0,
  payment_status text NOT NULL DEFAULT 'UNPAID'::text,
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  client_ref text,
  void_reason text,
  voided_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  voided_at timestamptz,
  refunded_pence integer NOT NULL DEFAULT 0,
  refunded_at timestamptz,
  refund_reason text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  description text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  unit_price_pence integer NOT NULL DEFAULT 0,
  line_total_pence integer NOT NULL DEFAULT 0,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  stock_item_id uuid REFERENCES public.stock_items(id) ON DELETE SET NULL,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.invoice_terms_settings (
  type text PRIMARY KEY,
  label text NOT NULL,
  enable_warranty boolean NOT NULL DEFAULT true,
  default_warranty_days integer NOT NULL DEFAULT 90,
  warranty_title text NOT NULL DEFAULT 'Warranty'::text,
  warranty_text text NOT NULL DEFAULT ''::text,
  exclusions_text text NOT NULL DEFAULT ''::text,
  default_terms text NOT NULL DEFAULT ''::text,
  footer_note text NOT NULL DEFAULT ''::text,
  seller_declaration text NOT NULL DEFAULT ''::text,
  payment_ack_text text NOT NULL DEFAULT ''::text,
  id_verification_note text NOT NULL DEFAULT ''::text,
  battery_disclaimer text NOT NULL DEFAULT ''::text,
  returns_policy text NOT NULL DEFAULT ''::text,
  manufacturer_note text NOT NULL DEFAULT ''::text,
  doa_days integer NOT NULL DEFAULT 0,
  activation_note text NOT NULL DEFAULT ''::text,
  accessories_note text NOT NULL DEFAULT ''::text,
  require_acknowledgement boolean NOT NULL DEFAULT false,
  show_signature_line boolean NOT NULL DEFAULT true,
  show_on_thermal boolean NOT NULL DEFAULT true,
  show_on_a4 boolean NOT NULL DEFAULT true,
  customer_message text NOT NULL DEFAULT ''::text,
  short_exclusions text NOT NULL DEFAULT ''::text,
  show_exclusions boolean NOT NULL DEFAULT true,
  show_terms_on_request boolean NOT NULL DEFAULT true,
  terms_on_request_text text NOT NULL DEFAULT 'Full terms and conditions are available on request at the counter.'::text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.invoice_terms (
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
  customer_message text,
  short_exclusions text,
  show_terms_on_request boolean,
  terms_on_request_text text,
  settings_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  amount_pence integer NOT NULL,
  method text NOT NULL DEFAULT 'CASH'::text,
  direction text NOT NULL DEFAULT 'IN'::text,
  reference text,
  notes text,
  is_reversal boolean NOT NULL DEFAULT false,
  client_ref text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.phone_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  seller_customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  purchase_date date NOT NULL DEFAULT ((now() AT TIME ZONE 'Europe/London'::text))::date,
  total_pence integer NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'CASH'::text,
  record_status text NOT NULL DEFAULT 'COMPLETED'::text,
  notes text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.phone_purchase_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id uuid NOT NULL REFERENCES public.phone_purchases(id) ON DELETE CASCADE,
  stock_item_id uuid REFERENCES public.stock_items(id) ON DELETE SET NULL,
  brand text,
  model text,
  imei text,
  serial text,
  storage text,
  colour text,
  network text,
  condition text,
  battery_health text,
  device_checks jsonb NOT NULL DEFAULT '{}'::jsonb,
  faults text,
  accessories text,
  cost_pence integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.repair_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  repair_number text NOT NULL UNIQUE,
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  device_brand text,
  device_model text,
  imei text,
  serial text,
  fault text NOT NULL,
  repair_description text,
  device_condition text,
  accessories_received text,
  subtotal_pence integer NOT NULL DEFAULT 0,
  discount_pence integer NOT NULL DEFAULT 0,
  total_pence integer NOT NULL DEFAULT 0,
  amount_paid_pence integer NOT NULL DEFAULT 0,
  balance_pence integer NOT NULL DEFAULT 0,
  payment_status text NOT NULL DEFAULT 'UNPAID'::text,
  record_status text NOT NULL DEFAULT 'OPEN'::text,
  customer_notes text,
  internal_notes text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.repair_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  category text NOT NULL DEFAULT 'GENERAL'::text,
  brand text,
  description text,
  starting_price_pence integer,
  icon text,
  image_url text,
  public_visible boolean NOT NULL DEFAULT true,
  featured boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  sale_kind text NOT NULL,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  subtotal_pence integer NOT NULL DEFAULT 0,
  discount_pence integer NOT NULL DEFAULT 0,
  total_pence integer NOT NULL DEFAULT 0,
  cost_pence integer NOT NULL DEFAULT 0,
  record_status text NOT NULL DEFAULT 'COMPLETED'::text,
  notes text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  stock_item_id uuid REFERENCES public.stock_items(id) ON DELETE SET NULL,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  description text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  unit_price_pence integer NOT NULL DEFAULT 0,
  line_total_pence integer NOT NULL DEFAULT 0,
  unit_cost_pence integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.customer_ledger_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  payment_id uuid REFERENCES public.payments(id) ON DELETE SET NULL,
  entry_type text NOT NULL,
  debit_pence integer NOT NULL DEFAULT 0,
  credit_pence integer NOT NULL DEFAULT 0,
  reference text,
  note text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.supplier_ledger_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  payment_id uuid REFERENCES public.payments(id) ON DELETE SET NULL,
  entry_type text NOT NULL,
  debit_pence integer NOT NULL DEFAULT 0,
  credit_pence integer NOT NULL DEFAULT 0,
  reference text,
  note text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.daily_sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  staff_name text NOT NULL CHECK (length(trim(staff_name)) > 0),
  cash_sale_pence integer NOT NULL DEFAULT 0 CHECK (cash_sale_pence >= 0),
  card_sale_pence integer NOT NULL DEFAULT 0 CHECK (card_sale_pence >= 0),
  description text,
  status text NOT NULL DEFAULT 'ACTIVE'::text CHECK (status IN ('ACTIVE', 'VOIDED')),
  void_reason text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  category text NOT NULL DEFAULT 'OTHER'::text,
  description text NOT NULL,
  amount_pence integer NOT NULL CHECK (amount_pence > 0),
  payment_method text NOT NULL DEFAULT 'CASH'::text CHECK (payment_method IN ('CASH', 'CARD', 'BANK_TRANSFER', 'OTHER')),
  reference text,
  notes text,
  status text NOT NULL DEFAULT 'ACTIVE'::text CHECK (status IN ('ACTIVE', 'VOIDED')),
  void_reason text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity text,
  entity_id uuid,
  summary text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.customer_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_name text NOT NULL,
  rating smallint,
  quote text NOT NULL,
  source text NOT NULL DEFAULT 'GOOGLE'::text,
  reviewed_on date,
  public_visible boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.faqs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question text NOT NULL,
  answer text NOT NULL,
  topic text NOT NULL DEFAULT 'GENERAL'::text,
  public_visible boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.website_enquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL DEFAULT 'GENERAL'::text,
  name text NOT NULL,
  phone text NOT NULL,
  email text,
  message text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'NEW'::text CHECK (status IN ('NEW','CONTACTED','CONVERTED','CLOSED')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 4. ALL 17 TRIGGERS
DROP TRIGGER IF EXISTS profiles_updated ON public.profiles;
CREATE TRIGGER profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS business_settings_updated ON public.business_settings;
CREATE TRIGGER business_settings_updated BEFORE UPDATE ON public.business_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS customers_updated ON public.customers;
CREATE TRIGGER customers_updated BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS suppliers_updated ON public.suppliers;
CREATE TRIGGER suppliers_updated BEFORE UPDATE ON public.suppliers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS product_categories_updated ON public.product_categories;
CREATE TRIGGER product_categories_updated BEFORE UPDATE ON public.product_categories FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS products_updated ON public.products;
CREATE TRIGGER products_updated BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS stock_items_updated ON public.stock_items;
CREATE TRIGGER stock_items_updated BEFORE UPDATE ON public.stock_items FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS invoices_updated ON public.invoices;
CREATE TRIGGER invoices_updated BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS invoice_terms_settings_updated ON public.invoice_terms_settings;
CREATE TRIGGER invoice_terms_settings_updated BEFORE UPDATE ON public.invoice_terms_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS phone_purchases_updated ON public.phone_purchases;
CREATE TRIGGER phone_purchases_updated BEFORE UPDATE ON public.phone_purchases FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS repair_invoices_updated ON public.repair_invoices;
CREATE TRIGGER repair_invoices_updated BEFORE UPDATE ON public.repair_invoices FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS repair_services_updated ON public.repair_services;
CREATE TRIGGER repair_services_updated BEFORE UPDATE ON public.repair_services FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS sales_updated ON public.sales;
CREATE TRIGGER sales_updated BEFORE UPDATE ON public.sales FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS daily_sales_updated ON public.daily_sales;
CREATE TRIGGER daily_sales_updated BEFORE UPDATE ON public.daily_sales FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS expenses_updated ON public.expenses;
CREATE TRIGGER expenses_updated BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Security Triggers: Terms Immutability & Enquiry Creation Validation
DROP TRIGGER IF EXISTS invoice_terms_no_change ON public.invoice_terms;
CREATE TRIGGER invoice_terms_no_change BEFORE UPDATE OR DELETE ON public.invoice_terms FOR EACH ROW EXECUTE FUNCTION public.invoice_terms_immutable();

DROP TRIGGER IF EXISTS enquiry_validate ON public.website_enquiries;
CREATE TRIGGER enquiry_validate BEFORE INSERT ON public.website_enquiries FOR EACH ROW EXECUTE FUNCTION public.validate_enquiry();

-- 5. PERFORMANCE, LOOKUP & CONCURRENCY INDEXES (37 TOTAL)

CREATE UNIQUE INDEX IF NOT EXISTS invoices_client_ref_idx ON public.invoices (client_ref) WHERE client_ref IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS payments_client_ref_idx ON public.payments (client_ref) WHERE client_ref IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS stock_items_active_imei_idx ON public.stock_items (imei) WHERE imei IS NOT NULL AND status IN ('IN_STOCK', 'RESERVED');

CREATE INDEX IF NOT EXISTS customers_phone_idx ON public.customers (phone_normalized);
CREATE INDEX IF NOT EXISTS customers_name_idx ON public.customers (lower(name));
CREATE INDEX IF NOT EXISTS customers_email_idx ON public.customers (lower(email));

CREATE INDEX IF NOT EXISTS invoices_created_idx ON public.invoices (created_at DESC);
CREATE INDEX IF NOT EXISTS invoices_kind_idx ON public.invoices (kind, created_at DESC);
CREATE INDEX IF NOT EXISTS invoices_number_idx ON public.invoices (invoice_number);
CREATE INDEX IF NOT EXISTS invoices_customer_idx ON public.invoices (customer_id);
CREATE INDEX IF NOT EXISTS invoice_items_invoice_idx ON public.invoice_items (invoice_id);

CREATE INDEX IF NOT EXISTS payments_invoice_idx ON public.payments (invoice_id);
CREATE INDEX IF NOT EXISTS payments_created_idx ON public.payments (created_at DESC);
CREATE INDEX IF NOT EXISTS customer_ledger_idx ON public.customer_ledger_entries (customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS customer_ledger_invoice_idx ON public.customer_ledger_entries (invoice_id);
CREATE INDEX IF NOT EXISTS supplier_ledger_idx ON public.supplier_ledger_entries (supplier_id, created_at DESC);

CREATE INDEX IF NOT EXISTS repair_number_idx ON public.repair_invoices (repair_number);
CREATE INDEX IF NOT EXISTS repair_created_idx ON public.repair_invoices (created_at DESC);
CREATE INDEX IF NOT EXISTS repair_imei_idx ON public.repair_invoices (imei);
CREATE INDEX IF NOT EXISTS repair_invoice_id_idx ON public.repair_invoices (invoice_id);

CREATE INDEX IF NOT EXISTS stock_imei_idx ON public.stock_items (imei);
CREATE INDEX IF NOT EXISTS stock_serial_idx ON public.stock_items (serial);
CREATE INDEX IF NOT EXISTS stock_status_idx ON public.stock_items (status, created_at DESC);
CREATE INDEX IF NOT EXISTS stock_movements_created_idx ON public.stock_movements (created_at DESC);
CREATE INDEX IF NOT EXISTS stock_movements_stock_item_idx ON public.stock_movements (stock_item_id);

CREATE INDEX IF NOT EXISTS purchases_created_idx ON public.phone_purchases (created_at DESC);
CREATE INDEX IF NOT EXISTS sales_created_idx ON public.sales (created_at DESC);
CREATE INDEX IF NOT EXISTS sales_invoice_idx ON public.sales (invoice_id);
CREATE INDEX IF NOT EXISTS sale_items_sale_idx ON public.sale_items (sale_id);

CREATE INDEX IF NOT EXISTS audit_created_idx ON public.audit_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_status ON public.expenses(status);
CREATE INDEX IF NOT EXISTS idx_daily_sales_date ON public.daily_sales(entry_date);
CREATE INDEX IF NOT EXISTS idx_daily_sales_staff ON public.daily_sales(staff_name);
CREATE INDEX IF NOT EXISTS idx_daily_sales_status ON public.daily_sales(status);

-- 6. CORE ERP & TRANSACTIONAL FUNCTIONS

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

CREATE OR REPLACE FUNCTION public.require_staff()
RETURNS uuid LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid();
BEGIN
  IF uid IS NULL OR NOT public.is_staff(uid) THEN
    RAISE EXCEPTION 'You do not have permission to perform this action.';
  END IF;
  RETURN uid;
END;
$$;

CREATE OR REPLACE FUNCTION public.norm_phone(_p text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT regexp_replace(COALESCE(_p,''), '[^0-9]', '', 'g');
$$;

CREATE OR REPLACE FUNCTION public.next_doc_number(_prefix text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v integer;
BEGIN
  INSERT INTO public.doc_sequences (prefix, last_value) VALUES (_prefix, 1)
  ON CONFLICT (prefix) DO UPDATE SET last_value = public.doc_sequences.last_value + 1
  RETURNING last_value INTO v;
  RETURN _prefix || '-' || lpad(v::text, 6, '0');
END;
$$;

CREATE OR REPLACE FUNCTION public.log_audit(_action text, _entity text, _entity_id uuid, _summary text, _meta jsonb DEFAULT '{}'::jsonb)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.audit_logs (user_id, action, entity, entity_id, summary, metadata)
  VALUES (auth.uid(), _action, _entity, _entity_id, _summary, _meta);
$$;

CREATE OR REPLACE FUNCTION public.business_snapshot()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(to_jsonb(b) - 'social_links', '{}'::jsonb) FROM public.business_settings b LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.render_terms_message(p_text text, p_vars jsonb)
RETURNS text LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
DECLARE
  out_text text := COALESCE(p_text, '');
  k text;
BEGIN
  FOR k IN SELECT jsonb_object_keys(COALESCE(p_vars, '{}'::jsonb)) LOOP
    out_text := replace(out_text, '{{' || k || '}}', COALESCE(p_vars->>k, ''));
  END LOOP;
  out_text := regexp_replace(out_text, '\{\{[a-z_]+\}\}', '', 'g');
  RETURN NULLIF(regexp_replace(trim(out_text), '[ \t]+', ' ', 'g'), '');
END;
$$;

CREATE OR REPLACE FUNCTION public.recalc_invoice(_invoice_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_invoice_terms(p_invoice_id uuid, p_terms jsonb DEFAULT NULL::jsonb, p_actor uuid DEFAULT NULL::uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
  v_msg text;
  v_short text;
  v_on_request boolean;
  v_on_request_text text;
  v_vars jsonb;
  v_customer text;
  v_device text;
BEGIN
  SELECT * INTO inv FROM public.invoices WHERE id = p_invoice_id FOR UPDATE;
  IF inv.id IS NULL THEN RAISE EXCEPTION 'This record no longer exists.'; END IF;
  IF inv.status = 'VOID' THEN RAISE EXCEPTION 'This record can no longer be edited.'; END IF;
  IF EXISTS (SELECT 1 FROM public.invoice_terms WHERE invoice_id = inv.id) THEN
    RAISE EXCEPTION 'Terms have already been saved for this invoice.';
  END IF;

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
    ack := true;
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
    v_msg := NULLIF(trim(COALESCE(tpl.customer_message, '')), '');
  ELSE
    ack := COALESCE((p_terms->>'customer_acknowledged')::boolean, true);
    days := GREATEST(COALESCE((p_terms->>'warranty_days')::integer, 0), 0);
    IF days > 3650 THEN RAISE EXCEPTION 'Warranty length looks too long.'; END IF;

    w_title := COALESCE(NULLIF(trim(p_terms->>'warranty_title'),''), NULLIF(trim(COALESCE(tpl.warranty_title,'')),''), 'Warranty');
    w_text := NULLIF(trim(p_terms->>'warranty_text'),'');
    v_terms := NULLIF(trim(p_terms->>'terms_text'),'');
    v_excl := NULLIF(trim(p_terms->>'exclusions_text'),'');
    v_footer := NULLIF(trim(p_terms->>'footer_note'),'');
    v_add := NULLIF(trim(p_terms->>'additional_terms'),'');
    v_note := NULLIF(trim(p_terms->>'customer_note'),'');
    v_int := NULLIF(trim(p_terms->>'internal_note'),'');
    v_print_note := COALESCE((p_terms->>'print_customer_note')::boolean, true);
    v_msg := COALESCE(NULLIF(trim(p_terms->>'customer_message'),''),
                      NULLIF(trim(COALESCE(tpl.customer_message,'')),''));
  END IF;

  IF days > 0 THEN
    expires := ((inv.created_at AT TIME ZONE 'Europe/London')::date + days);
  ELSE
    expires := NULL;
    w_title := NULL;
    w_text := NULL;
  END IF;

  v_short := CASE
    WHEN COALESCE(tpl.show_exclusions, true)
      AND NULLIF(trim(COALESCE(tpl.short_exclusions,'')),'') IS NOT NULL
      AND (days > 0 OR ttype = 'NEW_PHONE')
    THEN trim(tpl.short_exclusions) END;
  v_on_request := COALESCE(tpl.show_terms_on_request, true);
  v_on_request_text := CASE WHEN v_on_request
    THEN COALESCE(NULLIF(trim(COALESCE(tpl.terms_on_request_text,'')),''),
                  'Full terms and conditions are available on request at the counter.') END;

  v_customer := COALESCE(NULLIF(trim(COALESCE(inv.snapshot->'customer'->>'name','')),''), 'customer');
  v_device := NULLIF(trim(concat_ws(' ',
      COALESCE(inv.snapshot->'repair'->>'device_brand', inv.snapshot->'stock'->>'brand'),
      COALESCE(inv.snapshot->'repair'->>'device_model', inv.snapshot->'stock'->>'model'))), '');
  v_vars := jsonb_build_object(
    'customer_name', v_customer,
    'device_model', COALESCE(v_device, 'your device'),
    'warranty_days', days::text,
    'warranty_expiry', COALESCE(to_char(expires, 'DD/MM/YYYY'), ''),
    'amount', '£' || to_char(COALESCE(inv.total_pence,0)::numeric / 100, 'FM999999990.00')
  );
  v_msg := public.render_terms_message(v_msg, v_vars);
  IF v_msg IS NOT NULL THEN
    v_msg := btrim(concat_ws(' ', v_msg, v_short, v_on_request_text));
  END IF;

  INSERT INTO public.invoice_terms (
    invoice_id, invoice_type, warranty_days, warranty_expires, warranty_title, warranty_text,
    terms_text, exclusions_text, footer_note, additional_terms, internal_note, customer_note,
    print_customer_note, customer_acknowledged, show_on_thermal, show_on_a4, show_signature_line,
    customer_message, short_exclusions, show_terms_on_request, terms_on_request_text,
    settings_snapshot, created_by
  ) VALUES (
    inv.id, ttype, days, expires, w_title, w_text,
    v_terms, v_excl, v_footer, v_add, v_int, v_note,
    v_print_note,
    ack,
    COALESCE(tpl.show_on_thermal, true),
    COALESCE(tpl.show_on_a4, true),
    COALESCE(tpl.show_signature_line, false),
    v_msg, v_short, v_on_request, v_on_request_text,
    COALESCE(to_jsonb(tpl), '{}'::jsonb), p_actor
  ) RETURNING * INTO t;

  UPDATE public.invoices
    SET snapshot = COALESCE(snapshot, '{}'::jsonb)
      || jsonb_build_object('terms', to_jsonb(t) - 'internal_note' - 'settings_snapshot')
    WHERE id = inv.id;

  PERFORM public.log_audit('ATTACH_INVOICE_TERMS','invoices',inv.id,inv.invoice_number,
    jsonb_build_object('warranty_days', days, 'type', ttype, 'acknowledged', ack));
  RETURN to_jsonb(t);
END;
$$;

CREATE OR REPLACE FUNCTION public.attach_invoice_terms(p jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := public.require_staff();
BEGIN
  RETURN public.apply_invoice_terms((p->>'invoice_id')::uuid, p, uid);
END;
$$;

-- 7. MUTATION TRANSACTION RPCS

CREATE OR REPLACE FUNCTION public.ensure_profile(_full_name text DEFAULT NULL::text, _email text DEFAULT NULL::text)
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
END;
$$;

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
END;
$$;

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
END;
$$;

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
END;
$$;

CREATE OR REPLACE FUNCTION public.take_payment(p jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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

  IF p ? 'split_payments' AND jsonb_typeof(p->'split_payments') = 'array' AND jsonb_array_length(p->'split_payments') > 0 THEN
    FOR elem IN SELECT * FROM jsonb_array_elements(p->'split_payments') LOOP
      item_amt := GREATEST(COALESCE((elem->>'amount_pence')::integer, 0), 0);
      total_split := total_split + item_amt;
    END LOOP;

    IF total_split <= 0 THEN
      RAISE EXCEPTION 'Please enter a payment amount.';
    END IF;

    IF total_split > inv.balance_pence THEN
      RAISE EXCEPTION 'Payment is more than the outstanding balance.';
    END IF;

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

CREATE OR REPLACE FUNCTION public.create_repair_invoice(p jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
END;
$$;

CREATE OR REPLACE FUNCTION public.buy_phone(p jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
END;
$$;

CREATE OR REPLACE FUNCTION public.sell_phone(p jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
END;
$$;

CREATE OR REPLACE FUNCTION public.direct_sale(p jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
END;
$$;

CREATE OR REPLACE FUNCTION public.void_invoice(p jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := public.require_staff(); inv public.invoices; reason text; si record;
BEGIN
  IF NOT public.is_manager(uid) THEN RAISE EXCEPTION 'You do not have permission to perform this action.'; END IF;
  reason := NULLIF(trim(p->>'reason'),'');
  IF reason IS NULL THEN RAISE EXCEPTION 'Please give a reason for voiding.'; END IF;
  SELECT * INTO inv FROM public.invoices WHERE id = (p->>'invoice_id')::uuid FOR UPDATE;
  IF inv.id IS NULL THEN RAISE EXCEPTION 'This record no longer exists.'; END IF;
  IF inv.status = 'VOID' THEN RAISE EXCEPTION 'This record can no longer be edited.'; END IF;

  INSERT INTO public.payments (invoice_id, amount_pence, method, direction, is_reversal, notes, created_by)
  SELECT inv.id, amount_pence, method, CASE WHEN direction = 'IN' THEN 'OUT' ELSE 'IN' END, true, 'Void reversal', uid
  FROM public.payments WHERE invoice_id = inv.id AND NOT is_reversal;

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
END;
$$;

CREATE OR REPLACE FUNCTION public.refund_invoice(p jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
        UPDATE public.stock_items SET status = 'IN_STOCK' WHERE id = si.stock_item_id;
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
END;
$$;

CREATE OR REPLACE FUNCTION public.save_product(p jsonb)
RETURNS public.products LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
      sku = NULLIF(p->>'sku',''),
      category_id = NULLIF(p->>'category_id','')::uuid,
      brand = NULLIF(p->>'brand',''),
      model = NULLIF(p->>'model',''),
      short_description = NULLIF(p->>'short_description',''),
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

    base_slug := regexp_replace(lower(trim(p->>'name')), '[^a-z0-9]+', '-', 'g');
    base_slug := trim(both '-' from base_slug);
    IF base_slug = '' THEN base_slug := 'product'; END IF;
    final_slug := base_slug;
    WHILE EXISTS (SELECT 1 FROM public.products WHERE slug = final_slug) LOOP
      n := n + 1;
      final_slug := base_slug || '-' || n;
    END LOOP;

    INSERT INTO public.products (
      name, slug, sku, category_id, brand, model, short_description,
      cost_price_pence, price_pence, quantity, reorder_level, public_visible, featured, availability
    ) VALUES (
      p->>'name', final_slug, NULLIF(p->>'sku',''), NULLIF(p->>'category_id','')::uuid,
      NULLIF(p->>'brand',''), NULLIF(p->>'model',''), NULLIF(p->>'short_description',''),
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
END;
$$;

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
END;
$$;

CREATE OR REPLACE FUNCTION public.add_existing_phone_stock(p jsonb)
RETURNS public.stock_items LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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

  IF EXISTS (SELECT 1 FROM public.stock_items WHERE imei = v_imei) THEN
    RAISE EXCEPTION 'A handset with this IMEI already exists in the system history.';
  END IF;

  cost := GREATEST(COALESCE((p->>'purchase_cost_pence')::integer, 0), 0);
  price := NULLIF(p->>'selling_price_pence', '')::integer;
  IF price IS NOT NULL AND price < 0 THEN
    RAISE EXCEPTION 'Selling price cannot be negative.';
  END IF;

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
END;
$$;

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
END;
$$;

CREATE OR REPLACE FUNCTION public.save_daily_sale(
  p_id uuid DEFAULT NULL::uuid,
  p_entry_date date DEFAULT CURRENT_DATE,
  p_staff_name text DEFAULT ''::text,
  p_cash_pence integer DEFAULT 0,
  p_card_pence integer DEFAULT 0,
  p_description text DEFAULT NULL::text
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid;
  v_staff_name text;
  v_sale public.daily_sales;
BEGIN
  v_uid := public.require_staff();
  v_staff_name := trim(p_staff_name);

  IF v_staff_name = '' THEN RAISE EXCEPTION 'Staff Name is required.'; END IF;
  IF p_cash_pence < 0 OR p_card_pence < 0 THEN RAISE EXCEPTION 'Amounts cannot be negative.'; END IF;

  IF p_id IS NOT NULL THEN
    IF NOT public.is_manager(v_uid) THEN
      RAISE EXCEPTION 'Only managers and owners can edit daily sales entries.';
    END IF;

    SELECT * INTO v_sale FROM public.daily_sales WHERE id = p_id;
    IF v_sale.id IS NULL THEN RAISE EXCEPTION 'Daily sale record not found.'; END IF;
    IF v_sale.status = 'VOIDED' THEN
      RAISE EXCEPTION 'Cannot edit a voided entry.';
    END IF;

    UPDATE public.daily_sales
    SET entry_date = p_entry_date, staff_name = v_staff_name, cash_sale_pence = p_cash_pence,
        card_sale_pence = p_card_pence, description = p_description, updated_at = now()
    WHERE id = p_id RETURNING * INTO v_sale;

    PERFORM public.log_audit('UPDATE_DAILY_SALE','daily_sales',v_sale.id,
      concat_ws(' - ', v_sale.staff_name, to_char(v_sale.entry_date, 'YYYY-MM-DD')),
      jsonb_build_object('cash_sale_pence', v_sale.cash_sale_pence, 'card_sale_pence', v_sale.card_sale_pence));
  ELSE
    INSERT INTO public.daily_sales (entry_date, staff_name, cash_sale_pence, card_sale_pence, description, created_by)
    VALUES (p_entry_date, v_staff_name, p_cash_pence, p_card_pence, p_description, v_uid)
    RETURNING * INTO v_sale;

    PERFORM public.log_audit('SAVE_DAILY_SALE','daily_sales',v_sale.id,
      concat_ws(' - ', v_sale.staff_name, to_char(v_sale.entry_date, 'YYYY-MM-DD')),
      jsonb_build_object('cash_sale_pence', v_sale.cash_sale_pence, 'card_sale_pence', v_sale.card_sale_pence));
  END IF;

  RETURN to_jsonb(v_sale);
END;
$$;

CREATE OR REPLACE FUNCTION public.void_daily_sale(p_id uuid, p_reason text DEFAULT 'Voided by manager'::text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid;
  v_sale public.daily_sales;
BEGIN
  v_uid := public.require_staff();
  IF NOT public.is_manager(v_uid) THEN
    RAISE EXCEPTION 'Only managers and owners can void daily sales entries.';
  END IF;

  SELECT * INTO v_sale FROM public.daily_sales WHERE id = p_id;
  IF v_sale.id IS NULL THEN RAISE EXCEPTION 'Daily sale record not found.'; END IF;
  IF v_sale.status = 'VOIDED' THEN RAISE EXCEPTION 'This entry has already been voided.'; END IF;

  UPDATE public.daily_sales SET status = 'VOIDED', void_reason = p_reason, updated_at = now()
  WHERE id = p_id RETURNING * INTO v_sale;

  PERFORM public.log_audit('VOID_DAILY_SALE','daily_sales',v_sale.id,
    concat_ws(' - ', v_sale.staff_name, to_char(v_sale.entry_date, 'YYYY-MM-DD')),
    jsonb_build_object('void_reason', p_reason));

  RETURN to_jsonb(v_sale);
END;
$$;

CREATE OR REPLACE FUNCTION public.save_expense(
  p_id uuid DEFAULT NULL::uuid,
  p_expense_date date DEFAULT CURRENT_DATE,
  p_category text DEFAULT 'OTHER'::text,
  p_description text DEFAULT ''::text,
  p_amount_pence integer DEFAULT 0,
  p_payment_method text DEFAULT 'CASH'::text,
  p_reference text DEFAULT NULL::text,
  p_notes text DEFAULT NULL::text
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid;
  v_desc text;
  v_exp public.expenses;
BEGIN
  v_uid := public.require_staff();
  v_desc := trim(p_description);

  IF v_desc = '' THEN RAISE EXCEPTION 'Expense description is required.'; END IF;
  IF p_amount_pence <= 0 THEN RAISE EXCEPTION 'Expense amount must be greater than 0.'; END IF;

  IF p_id IS NOT NULL THEN
    IF NOT public.is_manager(v_uid) THEN RAISE EXCEPTION 'Only managers and owners can edit expenses.'; END IF;

    SELECT * INTO v_exp FROM public.expenses WHERE id = p_id;
    IF v_exp.id IS NULL THEN RAISE EXCEPTION 'Expense record not found.'; END IF;
    IF v_exp.status = 'VOIDED' THEN RAISE EXCEPTION 'Cannot edit a voided expense.'; END IF;

    UPDATE public.expenses
    SET expense_date = p_expense_date, category = p_category, description = v_desc,
        amount_pence = p_amount_pence, payment_method = p_payment_method, reference = p_reference,
        notes = p_notes, updated_at = now()
    WHERE id = p_id RETURNING * INTO v_exp;

    PERFORM public.log_audit('UPDATE_EXPENSE','expenses',v_exp.id,
      concat_ws(' - ', v_exp.category, v_exp.description),
      jsonb_build_object('amount_pence', v_exp.amount_pence));
  ELSE
    INSERT INTO public.expenses (expense_date, category, description, amount_pence, payment_method, reference, notes, created_by)
    VALUES (p_expense_date, p_category, v_desc, p_amount_pence, p_payment_method, p_reference, p_notes, v_uid)
    RETURNING * INTO v_exp;

    PERFORM public.log_audit('SAVE_EXPENSE','expenses',v_exp.id,
      concat_ws(' - ', v_exp.category, v_exp.description),
      jsonb_build_object('amount_pence', v_exp.amount_pence));
  END IF;

  RETURN to_jsonb(v_exp);
END;
$$;

CREATE OR REPLACE FUNCTION public.void_expense(p_id uuid, p_reason text DEFAULT 'Voided by manager'::text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid;
  v_exp public.expenses;
BEGIN
  v_uid := public.require_staff();
  IF NOT public.is_manager(v_uid) THEN RAISE EXCEPTION 'Only managers and owners can void expenses.'; END IF;

  SELECT * INTO v_exp FROM public.expenses WHERE id = p_id;
  IF v_exp.id IS NULL THEN RAISE EXCEPTION 'Expense record not found.'; END IF;
  IF v_exp.status = 'VOIDED' THEN RAISE EXCEPTION 'This expense has already been voided.'; END IF;

  UPDATE public.expenses SET status = 'VOIDED', void_reason = p_reason, updated_at = now()
  WHERE id = p_id RETURNING * INTO v_exp;

  PERFORM public.log_audit('VOID_EXPENSE','expenses',v_exp.id,
    concat_ws(' - ', v_exp.category, v_exp.description),
    jsonb_build_object('void_reason', p_reason));

  RETURN to_jsonb(v_exp);
END;
$$;

-- 8. ENABLE ROW LEVEL SECURITY
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doc_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_terms_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phone_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phone_purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repair_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repair_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_enquiries ENABLE ROW LEVEL SECURITY;

-- 9. RLS POLICIES
CREATE POLICY "Staff read profiles" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "Own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "Own profile or manager update" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid() OR public.is_manager(auth.uid())) WITH CHECK (id = auth.uid() OR public.is_manager(auth.uid()));

CREATE POLICY "Staff read roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_staff(auth.uid()));

CREATE POLICY "Business settings are publicly readable" ON public.business_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Managers manage business settings" ON public.business_settings FOR UPDATE TO authenticated USING (public.is_manager(auth.uid())) WITH CHECK (public.is_manager(auth.uid()));

CREATE POLICY "Staff read customers" ON public.customers FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff create customers" ON public.customers FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff update customers" ON public.customers FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "Staff read suppliers" ON public.suppliers FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff create suppliers" ON public.suppliers FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Managers update suppliers" ON public.suppliers FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "Staff read sequences" ON public.doc_sequences FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

CREATE POLICY "Categories are publicly readable" ON public.product_categories FOR SELECT TO anon, authenticated USING (active);
CREATE POLICY "Staff manage categories" ON public.product_categories FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "Visible products are publicly readable" ON public.products FOR SELECT TO anon, authenticated USING (public_visible AND active);
CREATE POLICY "Staff manage products" ON public.products FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "Product images are publicly readable" ON public.product_images FOR SELECT TO anon, authenticated USING (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_images.product_id AND p.public_visible AND p.active));
CREATE POLICY "Staff manage product images" ON public.product_images FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "Public can read visible stock phones" ON public.stock_items FOR SELECT TO anon, authenticated USING (public_visibility = true AND status = 'IN_STOCK');
CREATE POLICY "Staff read stock" ON public.stock_items FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff read stock movements" ON public.stock_movements FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff read invoices" ON public.invoices FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff read invoice items" ON public.invoice_items FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff can read invoice terms templates" ON public.invoice_terms_settings FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Managers can edit invoice terms templates" ON public.invoice_terms_settings FOR UPDATE TO authenticated USING (public.is_manager(auth.uid())) WITH CHECK (public.is_manager(auth.uid()));

CREATE POLICY "Staff can read invoice terms" ON public.invoice_terms FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff read payments" ON public.payments FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff read purchases" ON public.phone_purchases FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff read purchase items" ON public.phone_purchase_items FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff read repairs" ON public.repair_invoices FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

CREATE POLICY "Visible repair services are publicly readable" ON public.repair_services FOR SELECT TO anon, authenticated USING (public_visible);
CREATE POLICY "Staff manage repair services" ON public.repair_services FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "Staff read sales" ON public.sales FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff read sale items" ON public.sale_items FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff read customer ledger" ON public.customer_ledger_entries FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff read supplier ledger" ON public.supplier_ledger_entries FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff can read daily sales" ON public.daily_sales FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff can insert daily sales" ON public.daily_sales FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Managers can update daily sales" ON public.daily_sales FOR UPDATE TO authenticated USING (public.is_manager(auth.uid())) WITH CHECK (public.is_manager(auth.uid()));

CREATE POLICY "Staff can read expenses" ON public.expenses FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff can insert expenses" ON public.expenses FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Managers can update expenses" ON public.expenses FOR UPDATE TO authenticated USING (public.is_manager(auth.uid())) WITH CHECK (public.is_manager(auth.uid()));

CREATE POLICY "Managers read audit" ON public.audit_logs FOR SELECT TO authenticated USING (public.is_manager(auth.uid()));

CREATE POLICY "Public can read visible reviews" ON public.customer_reviews FOR SELECT TO anon, authenticated USING (public_visible = true);
CREATE POLICY "Staff manage reviews" ON public.customer_reviews FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "Public can read visible faqs" ON public.faqs FOR SELECT TO anon, authenticated USING (public_visible = true);
CREATE POLICY "Staff manage faqs" ON public.faqs FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "Anyone can submit an enquiry" ON public.website_enquiries FOR INSERT TO anon, authenticated
WITH CHECK (
  (type = ANY (ARRAY['REPAIR_QUOTE'::text, 'SELL_PHONE'::text, 'PRODUCT'::text, 'GENERAL'::text]))
  AND (status = 'NEW'::text)
  AND (length(name) >= 1 AND length(name) <= 100)
  AND (length(phone) >= 5 AND length(phone) <= 30)
  AND ((email IS NULL) OR (length(email) <= 255))
  AND ((message IS NULL) OR (length(message) <= 2000))
);
CREATE POLICY "Staff read enquiries" ON public.website_enquiries FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff update enquiries" ON public.website_enquiries FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- 10. TABLE GRANTS & RESTRICTIONS
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT SELECT ON public.business_settings TO anon, authenticated;
GRANT UPDATE ON public.business_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.customers TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.suppliers TO authenticated;
GRANT SELECT ON public.doc_sequences TO authenticated;
GRANT SELECT ON public.product_categories TO anon, authenticated;
GRANT ALL ON public.product_categories TO authenticated;
GRANT SELECT ON public.products TO anon, authenticated;
GRANT ALL ON public.products TO authenticated;
GRANT SELECT ON public.product_images TO anon, authenticated;
GRANT ALL ON public.product_images TO authenticated;
GRANT SELECT ON public.stock_items TO anon, authenticated;
GRANT SELECT ON public.stock_movements TO authenticated;
GRANT SELECT ON public.invoices TO authenticated;
GRANT SELECT ON public.invoice_items TO authenticated;
GRANT SELECT, UPDATE ON public.invoice_terms_settings TO authenticated;
GRANT SELECT ON public.invoice_terms TO authenticated;
REVOKE UPDATE, DELETE ON public.invoice_terms FROM authenticated; -- Strictly immutable
GRANT SELECT ON public.payments TO authenticated;
GRANT SELECT ON public.phone_purchases TO authenticated;
GRANT SELECT ON public.phone_purchase_items TO authenticated;
GRANT SELECT ON public.repair_invoices TO authenticated;
GRANT SELECT ON public.repair_services TO anon, authenticated;
GRANT ALL ON public.repair_services TO authenticated;
GRANT SELECT ON public.sales TO authenticated;
GRANT SELECT ON public.sale_items TO authenticated;
GRANT SELECT ON public.customer_ledger_entries TO authenticated;
GRANT SELECT ON public.supplier_ledger_entries TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.daily_sales TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.expenses TO authenticated;
GRANT SELECT ON public.audit_logs TO authenticated;
GRANT SELECT ON public.customer_reviews TO anon, authenticated;
GRANT ALL ON public.customer_reviews TO authenticated;
GRANT SELECT ON public.faqs TO anon, authenticated;
GRANT ALL ON public.faqs TO authenticated;
GRANT INSERT ON public.website_enquiries TO anon, authenticated;
GRANT SELECT, UPDATE ON public.website_enquiries TO authenticated;

-- 11. RPC PRIVILEGES
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.require_staff() FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_manager(uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.ensure_profile(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_profile(text, text) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.apply_invoice_terms(uuid, jsonb, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_invoice_terms(uuid, jsonb, uuid) TO service_role;

REVOKE ALL ON FUNCTION public.attach_invoice_terms(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.attach_invoice_terms(jsonb) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.validate_enquiry() FROM anon, authenticated, public;

REVOKE ALL ON FUNCTION public.create_repair_invoice(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_repair_invoice(jsonb) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.buy_phone(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.buy_phone(jsonb) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.sell_phone(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sell_phone(jsonb) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.direct_sale(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.direct_sale(jsonb) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.take_payment(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.take_payment(jsonb) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.void_invoice(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.void_invoice(jsonb) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.refund_invoice(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.refund_invoice(jsonb) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.save_daily_sale(uuid, date, text, integer, integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_daily_sale(uuid, date, text, integer, integer, text) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.void_daily_sale(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.void_daily_sale(uuid, text) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.save_expense(uuid, date, text, text, integer, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_expense(uuid, date, text, text, integer, text, text, text) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.void_expense(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.void_expense(uuid, text) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.save_product(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_product(jsonb) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.adjust_product_stock(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.adjust_product_stock(jsonb) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.add_existing_phone_stock(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_existing_phone_stock(jsonb) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.save_customer(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_customer(jsonb) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.save_supplier(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_supplier(jsonb) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.update_stock_item(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_stock_item(jsonb) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.set_user_role(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_user_role(jsonb) TO authenticated, service_role;

-- 12. REQUIRED CONFIGURATION SEED DATA

INSERT INTO public.business_settings (
  business_name, tagline, phone, whatsapp, email, address_line1, city, postcode, timezone,
  google_rating, google_review_count, payment_methods, opening_hours
) VALUES (
  'Phone Shop Ormskirk',
  'Phones, Repairs & Accessories in Ormskirk',
  '07496 499992',
  '07496 499992',
  'tefflakki188@gmail.com',
  '4 Aughton St',
  'Ormskirk',
  'L39 3BW',
  'Europe/London',
  4.8,
  156,
  ARRAY['CASH', 'CARD', 'CONTACTLESS', 'APPLE_PAY', 'GOOGLE_PAY'],
  '[
    {"day": "Monday", "open": "09:00", "close": "19:30"},
    {"day": "Tuesday", "open": "09:00", "close": "19:30"},
    {"day": "Wednesday", "open": "09:00", "close": "19:30"},
    {"day": "Thursday", "open": "09:00", "close": "19:30"},
    {"day": "Friday", "open": "09:00", "close": "19:30"},
    {"day": "Saturday", "open": "09:00", "close": "19:30"},
    {"day": "Sunday", "open": "09:00", "close": "18:00"}
  ]'::jsonb
) ON CONFLICT DO NOTHING;

INSERT INTO public.invoice_terms_settings (
  type, label, enable_warranty, default_warranty_days, warranty_title, warranty_text,
  exclusions_text, default_terms, footer_note, require_acknowledgement,
  customer_message, short_exclusions, show_exclusions
) VALUES
('REPAIR','Repair terms', true, 90, 'Repair warranty',
 'Warranty covers the specific repaired component only. Physical damage, liquid damage and unauthorised third-party repairs void this warranty.',
 E'Not covered:\n• Physical damage, drops or impact after the repair\n• Liquid damage or moisture ingress\n• Damage caused by unauthorised third-party repairs\n• Normal wear, tear and cosmetic damage\n• Pre-existing faults not reported at booking',
 'Repair carried out using quality replacement parts. The customer is advised to test the device before leaving the shop. To claim warranty, bring this receipt and the device to 4 Aughton St, Ormskirk. Warranty is void if the IMEI does not match our records.',
 'Thank you for choosing Phone Shop Ormskirk. Please retain this receipt for warranty claims.', false,
 'Dear customer, thank you for choosing us. We''ve fitted a quality replacement part to your device and tested it before handing it back. Your repair is covered for {{warranty_days}} days — if anything feels off, just pop back in or WhatsApp us.',
 'Warranty does not cover accidental or physical damage, liquid/water damage, misuse, further damage after repair, or work/opening carried out by another repairer.', true),

('PURCHASE','Purchase terms (buying from a customer)', false, 0, 'Seller declaration',
 'The seller confirms they are the lawful owner of this device. The device is not reported lost or stolen and is free from outstanding finance or network obligations. Information given about the condition of the device is accurate to the best of the seller''s knowledge.',
 '',
 'Phone Shop Ormskirk has purchased this device from the seller as seen. The IMEI has been logged and the condition assessed at the time of purchase. This purchase is final — no returns or exchanges on bought devices.',
 'Phone Shop Ormskirk, 4 Aughton St, Ormskirk L39 3BW · 07496 499992', false,
 'Dear {{customer_name}}, thank you for selling your device to us. We''ve checked it over the counter and agreed a fair price. Payment received in full. This purchase is final.',
 '', false),

('SALES','Sales terms (pre-owned phone)', true, 30, 'Pre-owned device warranty',
 'This pre-owned device is covered for the stated period against hardware faults only. Battery performance is not guaranteed as this is a used device. Physical damage, liquid damage and unauthorised repairs void this warranty.',
 E'Not covered:\n• Cracked or damaged screens\n• Liquid damage\n• Unauthorised repairs\n• Software or account issues\n• Wear, tear and cosmetic marks',
 'Device sold as pre-owned. The customer has inspected the device and accepted its condition as described at the point of sale.',
 'Thank you for your purchase. Please retain this receipt for warranty claims.', false,
 'Dear {{customer_name}}, thank you for your purchase. This pre-owned device has been tested in our shop before sale. Covered for {{warranty_days}} days for hardware faults. Battery health may vary as this is a used device.',
 'Warranty does not cover accidental or physical damage, liquid/water damage, misuse, software/account issues caused after sale, or work/opening carried out by another repairer.', true),

('NEW_PHONE','New phone terms', true, 14, 'Shop support warranty',
 'This device is covered by the manufacturer''s standard warranty. In addition, Phone Shop Ormskirk provides a support period for setup assistance and immediate exchange for dead-on-arrival faults within the stated number of days.',
 E'Not covered:\n• Accidental or liquid damage\n• Damage from unauthorised repairs\n• Loss of data or account lockouts',
 'Box, charger and cable are included as supplied by the manufacturer. The device must be activated within 14 days for the manufacturer warranty to remain valid.',
 'Manufacturer warranty terms apply in full. Phone Shop Ormskirk, 4 Aughton St, Ormskirk L39 3BW.', false,
 'Dear {{customer_name}}, thank you for your purchase. Your new device is covered by the manufacturer''s standard warranty where applicable. We also offer {{warranty_days}} days support for setup help or DOA exchange where applicable.',
 'Manufacturer warranty and shop support do not cover accidental or physical damage, liquid/water damage, misuse, or unauthorized repair/opening.', true)
ON CONFLICT (type) DO UPDATE SET
  enable_warranty = EXCLUDED.enable_warranty,
  default_warranty_days = EXCLUDED.default_warranty_days,
  warranty_title = EXCLUDED.warranty_title,
  warranty_text = EXCLUDED.warranty_text,
  exclusions_text = EXCLUDED.exclusions_text,
  default_terms = EXCLUDED.default_terms,
  footer_note = EXCLUDED.footer_note,
  customer_message = EXCLUDED.customer_message,
  short_exclusions = EXCLUDED.short_exclusions,
  show_exclusions = EXCLUDED.show_exclusions;

INSERT INTO public.faqs (question, answer, topic, public_visible, sort_order) VALUES
('How do I get a repair price?', 'WhatsApp us your model and what''s wrong. We''ll give you a starting price — a realistic range based on what you describe. When you bring it in we look at it properly and confirm the final price before any work starts.', 'REPAIRS', true, 10),
('Are the prices on the site final?', 'No. The "from" prices are starting points. The final cost depends on your exact model and what we find when we examine it. We confirm the price before we start — no surprises.', 'REPAIRS', true, 20),
('How long does a repair take?', 'Time depends on the model and what parts we have in stock. Many common jobs are assessed while you wait; others may need a part ordered. We''ll tell you upfront when you get in touch.', 'REPAIRS', true, 30),
('Do I need an appointment?', 'No. Walk into 4 Aughton St anytime we''re open. If you want to check we have a specific part in stock, WhatsApp or call ahead — it saves you a wasted trip.', 'GENERAL', true, 40),
('Is my data safe during a repair?', 'We don''t need your passcode for most repairs (screens, batteries, charging ports). For software issues we''ll ask you to back up first.', 'REPAIRS', true, 50),
('How do I pay?', 'Cash or card — whatever suits you.', 'GENERAL', true, 60),
('What if my phone is too old to repair?', 'We''ll tell you honestly. If a repair costs more than the phone is worth, we''ll say so — and suggest whether to sell it to us, trade it in, or recycle it responsibly.', 'REPAIRS', true, 70),
('Do you guarantee your repairs?', 'Yes — in writing on your receipt. The length depends on the repair, but it''s there in black and white.', 'REPAIRS', true, 80),
('Can you fix water damage?', 'Sometimes. Bring it in as soon as possible and don''t charge it. We''ll assess it honestly, and if it isn''t recoverable we''ll tell you straight.', 'REPAIRS', true, 90),
('Do you repair tablets or other devices?', 'Phones are our focus. Some basic tablet repairs we can do — WhatsApp us the model and we''ll tell you yes or no honestly.', 'REPAIRS', true, 100),
('How quickly do you reply on WhatsApp?', 'Usually within minutes during opening hours. It''s the fastest way to reach us.', 'GENERAL', true, 110),
('Where is the shop?', 'We''re at 4 Aughton St in Ormskirk town centre exactly opposite Costa Coffee.', 'GENERAL', true, 120)
ON CONFLICT DO NOTHING;

-- 13. OWNER BOOTSTRAP (tefflakki188@gmail.com / altaf1234)
DO $$
DECLARE
  v_user_id uuid := gen_random_uuid();
  v_email text := 'tefflakki188@gmail.com';
  v_password text := 'altaf1234';
  v_encrypted_pw text;
BEGIN
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = v_email) THEN
    SELECT id INTO v_user_id FROM auth.users WHERE email = v_email;
  ELSE
    v_encrypted_pw := crypt(v_password, gen_salt('bf'));

    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', v_user_id, 'authenticated', 'authenticated',
      v_email, v_encrypted_pw, now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Altaf"}'::jsonb,
      now(), now()
    );

    INSERT INTO auth.identities (
      id, provider_id, user_id, identity_data, provider,
      last_sign_in_at, created_at, updated_at
    ) VALUES (
      v_user_id::text, v_user_id::text, v_user_id,
      format('{"sub":"%s","email":"%s"}', v_user_id::text, v_email)::jsonb,
      'email', now(), now(), now()
    );
  END IF;

  INSERT INTO public.profiles (id, full_name, email, active)
  VALUES (v_user_id, 'Altaf', v_email, true)
  ON CONFLICT (id) DO UPDATE SET full_name = 'Altaf', email = EXCLUDED.email, active = true;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'OWNER')
  ON CONFLICT (user_id, role) DO NOTHING;
END $$;
