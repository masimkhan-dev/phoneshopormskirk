-- ============================================================================
-- Migration: Add Daily Sales & Expenses tables
-- Purpose: Fast manual recording of legacy/unentered daily sales & shop expenses
-- Note: Expenses are purely authoritative in the expenses table; daily_sales
--       stores ONLY (entry_date, staff_name, cash_sale_pence, card_sale_pence, description).
-- ============================================================================

-- 1. Create expenses table
CREATE TABLE IF NOT EXISTS public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  category text NOT NULL DEFAULT 'OTHER',
  description text NOT NULL,
  amount_pence integer NOT NULL CHECK (amount_pence > 0),
  payment_method text NOT NULL DEFAULT 'CASH' CHECK (payment_method IN ('CASH', 'CARD', 'BANK_TRANSFER', 'OTHER')),
  reference text,
  notes text,
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'VOIDED')),
  void_reason text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_status ON public.expenses(status);

-- 2. Create daily_sales table (NO duplicate expense column)
CREATE TABLE IF NOT EXISTS public.daily_sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  staff_name text NOT NULL CHECK (length(trim(staff_name)) > 0),
  cash_sale_pence integer NOT NULL DEFAULT 0 CHECK (cash_sale_pence >= 0),
  card_sale_pence integer NOT NULL DEFAULT 0 CHECK (card_sale_pence >= 0),
  description text,
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'VOIDED')),
  void_reason text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_daily_sales_date ON public.daily_sales(entry_date);
CREATE INDEX IF NOT EXISTS idx_daily_sales_staff ON public.daily_sales(staff_name);
CREATE INDEX IF NOT EXISTS idx_daily_sales_status ON public.daily_sales(status);

-- 3. Triggers for updated_at
DROP TRIGGER IF EXISTS expenses_updated ON public.expenses;
CREATE TRIGGER expenses_updated
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS daily_sales_updated ON public.daily_sales;
CREATE TRIGGER daily_sales_updated
  BEFORE UPDATE ON public.daily_sales
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4. Enable RLS
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_sales ENABLE ROW LEVEL SECURITY;

-- 5. Table Grants
GRANT SELECT, INSERT, UPDATE ON public.expenses TO authenticated;
GRANT ALL ON public.expenses TO service_role;

GRANT SELECT, INSERT, UPDATE ON public.daily_sales TO authenticated;
GRANT ALL ON public.daily_sales TO service_role;

-- 6. RLS policies for expenses
DROP POLICY IF EXISTS "Staff can read expenses" ON public.expenses;
CREATE POLICY "Staff can read expenses" ON public.expenses
  FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Staff can insert expenses" ON public.expenses;
CREATE POLICY "Staff can insert expenses" ON public.expenses
  FOR INSERT TO authenticated
  WITH CHECK (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Managers can update expenses" ON public.expenses;
CREATE POLICY "Managers can update expenses" ON public.expenses
  FOR UPDATE TO authenticated
  USING (public.is_manager(auth.uid()))
  WITH CHECK (public.is_manager(auth.uid()));

-- 7. RLS policies for daily_sales
DROP POLICY IF EXISTS "Staff can read daily sales" ON public.daily_sales;
CREATE POLICY "Staff can read daily sales" ON public.daily_sales
  FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Staff can insert daily sales" ON public.daily_sales;
CREATE POLICY "Staff can insert daily sales" ON public.daily_sales
  FOR INSERT TO authenticated
  WITH CHECK (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Managers can update daily sales" ON public.daily_sales;
CREATE POLICY "Managers can update daily sales" ON public.daily_sales
  FOR UPDATE TO authenticated
  USING (public.is_manager(auth.uid()))
  WITH CHECK (public.is_manager(auth.uid()));

-- 8. RPC: save_daily_sale (Staff can create; only managers/owners can edit existing records)
CREATE OR REPLACE FUNCTION public.save_daily_sale(
  p_id uuid DEFAULT NULL,
  p_entry_date date DEFAULT CURRENT_DATE,
  p_staff_name text DEFAULT '',
  p_cash_pence integer DEFAULT 0,
  p_card_pence integer DEFAULT 0,
  p_description text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_staff_name text;
  v_sale public.daily_sales;
BEGIN
  v_uid := public.require_staff();
  v_staff_name := trim(p_staff_name);

  IF v_staff_name = '' THEN
    RAISE EXCEPTION 'Staff Name is required.';
  END IF;

  IF p_cash_pence < 0 OR p_card_pence < 0 THEN
    RAISE EXCEPTION 'Amounts cannot be negative.';
  END IF;

  IF p_id IS NOT NULL THEN
    -- Explicit manager check on update path
    IF NOT public.is_manager(v_uid) THEN
      RAISE EXCEPTION 'Only managers and owners can edit daily sales entries.';
    END IF;

    -- Update existing record
    SELECT * INTO v_sale FROM public.daily_sales WHERE id = p_id;
    IF v_sale.id IS NULL THEN
      RAISE EXCEPTION 'Daily sale record not found.';
    END IF;
    IF v_sale.status = 'VOIDED' THEN
      RAISE EXCEPTION 'Cannot edit a voided entry.';
    END IF;

    UPDATE public.daily_sales
    SET
      entry_date = p_entry_date,
      staff_name = v_staff_name,
      cash_sale_pence = p_cash_pence,
      card_sale_pence = p_card_pence,
      description = p_description,
      updated_at = now()
    WHERE id = p_id
    RETURNING * INTO v_sale;

    PERFORM public.log_audit(
      'UPDATE_DAILY_SALE',
      'daily_sales',
      v_sale.id,
      concat_ws(' - ', v_sale.staff_name, to_char(v_sale.entry_date, 'YYYY-MM-DD')),
      jsonb_build_object(
        'cash_sale_pence', v_sale.cash_sale_pence,
        'card_sale_pence', v_sale.card_sale_pence
      )
    );
  ELSE
    -- Insert new record (permitted for all staff)
    INSERT INTO public.daily_sales (
      entry_date,
      staff_name,
      cash_sale_pence,
      card_sale_pence,
      description,
      created_by
    ) VALUES (
      p_entry_date,
      v_staff_name,
      p_cash_pence,
      p_card_pence,
      p_description,
      v_uid
    )
    RETURNING * INTO v_sale;

    PERFORM public.log_audit(
      'SAVE_DAILY_SALE',
      'daily_sales',
      v_sale.id,
      concat_ws(' - ', v_sale.staff_name, to_char(v_sale.entry_date, 'YYYY-MM-DD')),
      jsonb_build_object(
        'cash_sale_pence', v_sale.cash_sale_pence,
        'card_sale_pence', v_sale.card_sale_pence
      )
    );
  END IF;

  RETURN to_jsonb(v_sale);
END;
$$;

-- 9. RPC: void_daily_sale (Manager only)
CREATE OR REPLACE FUNCTION public.void_daily_sale(
  p_id uuid,
  p_reason text DEFAULT 'Voided by manager'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_sale public.daily_sales;
BEGIN
  v_uid := public.require_staff();
  IF NOT public.is_manager(v_uid) THEN
    RAISE EXCEPTION 'Only managers and owners can void daily sales entries.';
  END IF;

  SELECT * INTO v_sale FROM public.daily_sales WHERE id = p_id;
  IF v_sale.id IS NULL THEN
    RAISE EXCEPTION 'Daily sale record not found.';
  END IF;
  IF v_sale.status = 'VOIDED' THEN
    RAISE EXCEPTION 'This entry has already been voided.';
  END IF;

  UPDATE public.daily_sales
  SET
    status = 'VOIDED',
    void_reason = p_reason,
    updated_at = now()
  WHERE id = p_id
  RETURNING * INTO v_sale;

  PERFORM public.log_audit(
    'VOID_DAILY_SALE',
    'daily_sales',
    v_sale.id,
    concat_ws(' - ', v_sale.staff_name, to_char(v_sale.entry_date, 'YYYY-MM-DD')),
    jsonb_build_object('void_reason', p_reason)
  );

  RETURN to_jsonb(v_sale);
END;
$$;

-- 10. RPC: save_expense (Staff can create; only managers/owners can edit existing records)
CREATE OR REPLACE FUNCTION public.save_expense(
  p_id uuid DEFAULT NULL,
  p_expense_date date DEFAULT CURRENT_DATE,
  p_category text DEFAULT 'OTHER',
  p_description text DEFAULT '',
  p_amount_pence integer DEFAULT 0,
  p_payment_method text DEFAULT 'CASH',
  p_reference text DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_desc text;
  v_exp public.expenses;
BEGIN
  v_uid := public.require_staff();
  v_desc := trim(p_description);

  IF v_desc = '' THEN
    RAISE EXCEPTION 'Expense description is required.';
  END IF;

  IF p_amount_pence <= 0 THEN
    RAISE EXCEPTION 'Expense amount must be greater than 0.';
  END IF;

  IF p_id IS NOT NULL THEN
    -- Explicit manager check on update path
    IF NOT public.is_manager(v_uid) THEN
      RAISE EXCEPTION 'Only managers and owners can edit expenses.';
    END IF;

    SELECT * INTO v_exp FROM public.expenses WHERE id = p_id;
    IF v_exp.id IS NULL THEN
      RAISE EXCEPTION 'Expense record not found.';
    END IF;
    IF v_exp.status = 'VOIDED' THEN
      RAISE EXCEPTION 'Cannot edit a voided expense.';
    END IF;

    UPDATE public.expenses
    SET
      expense_date = p_expense_date,
      category = p_category,
      description = v_desc,
      amount_pence = p_amount_pence,
      payment_method = p_payment_method,
      reference = p_reference,
      notes = p_notes,
      updated_at = now()
    WHERE id = p_id
    RETURNING * INTO v_exp;

    PERFORM public.log_audit(
      'UPDATE_EXPENSE',
      'expenses',
      v_exp.id,
      concat_ws(' - ', v_exp.category, v_exp.description),
      jsonb_build_object('amount_pence', v_exp.amount_pence)
    );
  ELSE
    -- Insert new expense (permitted for all staff)
    INSERT INTO public.expenses (
      expense_date,
      category,
      description,
      amount_pence,
      payment_method,
      reference,
      notes,
      created_by
    ) VALUES (
      p_expense_date,
      p_category,
      v_desc,
      p_amount_pence,
      p_payment_method,
      p_reference,
      p_notes,
      v_uid
    )
    RETURNING * INTO v_exp;

    PERFORM public.log_audit(
      'SAVE_EXPENSE',
      'expenses',
      v_exp.id,
      concat_ws(' - ', v_exp.category, v_exp.description),
      jsonb_build_object('amount_pence', v_exp.amount_pence)
    );
  END IF;

  RETURN to_jsonb(v_exp);
END;
$$;

-- 11. RPC: void_expense (Manager only)
CREATE OR REPLACE FUNCTION public.void_expense(
  p_id uuid,
  p_reason text DEFAULT 'Voided by manager'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_exp public.expenses;
BEGIN
  v_uid := public.require_staff();
  IF NOT public.is_manager(v_uid) THEN
    RAISE EXCEPTION 'Only managers and owners can void expenses.';
  END IF;

  SELECT * INTO v_exp FROM public.expenses WHERE id = p_id;
  IF v_exp.id IS NULL THEN
    RAISE EXCEPTION 'Expense record not found.';
  END IF;
  IF v_exp.status = 'VOIDED' THEN
    RAISE EXCEPTION 'This expense has already been voided.';
  END IF;

  UPDATE public.expenses
  SET
    status = 'VOIDED',
    void_reason = p_reason,
    updated_at = now()
  WHERE id = p_id
  RETURNING * INTO v_exp;

  PERFORM public.log_audit(
    'VOID_EXPENSE',
    'expenses',
    v_exp.id,
    concat_ws(' - ', v_exp.category, v_exp.description),
    jsonb_build_object('void_reason', p_reason)
  );

  RETURN to_jsonb(v_exp);
END;
$$;

-- 12. Explicit EXECUTE privileges for SECURITY DEFINER functions
REVOKE ALL ON FUNCTION public.save_daily_sale(uuid, date, text, integer, integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_daily_sale(uuid, date, text, integer, integer, text) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.void_daily_sale(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.void_daily_sale(uuid, text) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.save_expense(uuid, date, text, text, integer, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_expense(uuid, date, text, text, integer, text, text, text) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.void_expense(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.void_expense(uuid, text) TO authenticated, service_role;