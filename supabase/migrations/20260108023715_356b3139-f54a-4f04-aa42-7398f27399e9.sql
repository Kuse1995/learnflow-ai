-- Payment plans table
CREATE TABLE public.payment_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  
  -- Term scope
  academic_year INTEGER NOT NULL,
  term INTEGER NOT NULL,
  
  -- Plan details
  plan_name TEXT,
  total_amount NUMERIC(12, 2) NOT NULL,
  balance_at_creation NUMERIC(12, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'ZMW',
  installment_count INTEGER NOT NULL CHECK (installment_count >= 1 AND installment_count <= 12),
  
  -- Dates
  start_date DATE NOT NULL,
  end_date DATE,
  
  -- Status workflow
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft',
    'pending_approval',
    'approved',
    'active',
    'completed',
    'defaulted',
    'cancelled'
  )),
  
  -- Tracking
  total_paid NUMERIC(12, 2) NOT NULL DEFAULT 0,
  remaining_amount NUMERIC(12, 2) NOT NULL,
  last_payment_date DATE,
  missed_installments INTEGER NOT NULL DEFAULT 0,
  
  -- Approval workflow
  created_by UUID,
  created_by_role TEXT,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  approval_notes TEXT,
  
  -- Cancellation
  cancelled_by UUID,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  
  -- Offline support
  offline_id TEXT,
  created_offline BOOLEAN NOT NULL DEFAULT false,
  synced_at TIMESTAMPTZ,
  
  -- Notes
  notes TEXT,
  parent_agreement_date DATE,
  parent_agreement_method TEXT CHECK (
    parent_agreement_method IS NULL OR 
    parent_agreement_method IN ('in_person', 'phone', 'written', 'sms')
  ),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Partial unique index for one active plan per student per term
CREATE UNIQUE INDEX idx_unique_active_plan_per_term 
ON public.payment_plans(student_id, academic_year, term) 
WHERE status IN ('approved', 'active');

-- Payment plan installments
CREATE TABLE public.payment_plan_installments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID NOT NULL REFERENCES public.payment_plans(id) ON DELETE CASCADE,
  
  -- Installment details
  installment_number INTEGER NOT NULL CHECK (installment_number >= 1),
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  due_date DATE NOT NULL,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',
    'partial',
    'paid',
    'overdue',
    'waived'
  )),
  
  -- Payment tracking
  amount_paid NUMERIC(12, 2) NOT NULL DEFAULT 0,
  paid_date DATE,
  payment_reference TEXT,
  ledger_entry_ids UUID[],
  
  -- Notes
  notes TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT unique_installment_number UNIQUE (plan_id, installment_number)
);

-- Indexes
CREATE INDEX idx_payment_plans_student ON public.payment_plans(student_id, academic_year, term);
CREATE INDEX idx_payment_plans_school_status ON public.payment_plans(school_id, status);
CREATE INDEX idx_installments_plan ON public.payment_plan_installments(plan_id, installment_number);
CREATE INDEX idx_installments_due ON public.payment_plan_installments(due_date) 
  WHERE status IN ('pending', 'partial', 'overdue');

-- Function to check if student has active plan for term
CREATE OR REPLACE FUNCTION public.has_active_payment_plan(
  p_student_id UUID,
  p_academic_year INTEGER,
  p_term INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM payment_plans
    WHERE student_id = p_student_id
      AND academic_year = p_academic_year
      AND term = p_term
      AND status IN ('approved', 'active')
  );
END;
$$;

-- Function to get active plan for student
CREATE OR REPLACE FUNCTION public.get_active_payment_plan(
  p_student_id UUID,
  p_academic_year INTEGER,
  p_term INTEGER
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan_id UUID;
BEGIN
  SELECT id INTO v_plan_id
  FROM payment_plans
  WHERE student_id = p_student_id
    AND academic_year = p_academic_year
    AND term = p_term
    AND status IN ('approved', 'active')
  LIMIT 1;
  
  RETURN v_plan_id;
END;
$$;

-- Function to update plan totals when payment is made
CREATE OR REPLACE FUNCTION public.update_payment_plan_totals()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_paid NUMERIC(12, 2);
  v_plan_total NUMERIC(12, 2);
  v_last_payment DATE;
BEGIN
  SELECT 
    COALESCE(SUM(amount_paid), 0),
    MAX(paid_date)
  INTO v_total_paid, v_last_payment
  FROM payment_plan_installments
  WHERE plan_id = NEW.plan_id;
  
  SELECT total_amount INTO v_plan_total
  FROM payment_plans
  WHERE id = NEW.plan_id;
  
  UPDATE payment_plans
  SET 
    total_paid = v_total_paid,
    remaining_amount = v_plan_total - v_total_paid,
    last_payment_date = v_last_payment,
    status = CASE 
      WHEN v_total_paid >= v_plan_total THEN 'completed'
      WHEN status = 'approved' THEN 'active'
      ELSE status
    END,
    updated_at = now()
  WHERE id = NEW.plan_id;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_plan_totals_on_installment_change
AFTER INSERT OR UPDATE ON public.payment_plan_installments
FOR EACH ROW
EXECUTE FUNCTION public.update_payment_plan_totals();

-- Enable RLS
ALTER TABLE public.payment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_plan_installments ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view payment plans"
ON public.payment_plans FOR SELECT USING (true);

CREATE POLICY "Authorized users can create payment plans"
ON public.payment_plans FOR INSERT WITH CHECK (true);

CREATE POLICY "Authorized users can update payment plans"
ON public.payment_plans FOR UPDATE USING (true);

CREATE POLICY "Users can view installments"
ON public.payment_plan_installments FOR SELECT USING (true);

CREATE POLICY "Authorized users can manage installments"
ON public.payment_plan_installments FOR INSERT WITH CHECK (true);

CREATE POLICY "Authorized users can update installments"
ON public.payment_plan_installments FOR UPDATE USING (true);

-- Triggers for updated_at
CREATE TRIGGER update_payment_plans_updated_at
BEFORE UPDATE ON public.payment_plans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_installments_updated_at
BEFORE UPDATE ON public.payment_plan_installments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();