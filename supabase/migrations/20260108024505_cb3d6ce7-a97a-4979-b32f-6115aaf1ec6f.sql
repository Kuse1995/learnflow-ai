-- Payment Allocation Table
-- Links payments to installments without modifying original payment records

CREATE TABLE public.payment_installment_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES public.fee_payments(id) ON DELETE RESTRICT,
  installment_id UUID NOT NULL REFERENCES public.payment_plan_installments(id) ON DELETE RESTRICT,
  plan_id UUID NOT NULL REFERENCES public.payment_plans(id) ON DELETE CASCADE,
  allocated_amount NUMERIC(12,2) NOT NULL CHECK (allocated_amount > 0),
  allocation_order INTEGER NOT NULL DEFAULT 1,
  allocated_by TEXT NOT NULL,
  allocated_by_role TEXT NOT NULL,
  allocated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  
  -- For tracking edits (original allocation is immutable, we create new records)
  supersedes_allocation_id UUID REFERENCES public.payment_installment_allocations(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_allocations_payment ON public.payment_installment_allocations(payment_id) WHERE is_active = true;
CREATE INDEX idx_allocations_installment ON public.payment_installment_allocations(installment_id) WHERE is_active = true;
CREATE INDEX idx_allocations_plan ON public.payment_installment_allocations(plan_id) WHERE is_active = true;

-- Unique constraint: one active allocation per payment-installment pair
CREATE UNIQUE INDEX idx_unique_active_allocation 
ON public.payment_installment_allocations(payment_id, installment_id) 
WHERE is_active = true;

-- Enable RLS
ALTER TABLE public.payment_installment_allocations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "School staff can view allocations"
ON public.payment_installment_allocations
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.payment_plans pp
    WHERE pp.id = payment_installment_allocations.plan_id
  )
);

CREATE POLICY "Finance roles can insert allocations"
ON public.payment_installment_allocations
FOR INSERT
WITH CHECK (
  allocated_by_role IN ('admin', 'bursar', 'finance_officer')
);

CREATE POLICY "Admins can update allocations"
ON public.payment_installment_allocations
FOR UPDATE
USING (allocated_by_role = 'admin');

-- Function to calculate total allocated for an installment
CREATE OR REPLACE FUNCTION public.get_installment_allocated_total(p_installment_id UUID)
RETURNS NUMERIC AS $$
  SELECT COALESCE(SUM(allocated_amount), 0)
  FROM public.payment_installment_allocations
  WHERE installment_id = p_installment_id AND is_active = true;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- Function to calculate unallocated amount from a payment
CREATE OR REPLACE FUNCTION public.get_payment_unallocated_amount(p_payment_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  v_payment_amount NUMERIC;
  v_allocated_total NUMERIC;
BEGIN
  SELECT amount INTO v_payment_amount
  FROM public.fee_payments
  WHERE id = p_payment_id;
  
  SELECT COALESCE(SUM(allocated_amount), 0) INTO v_allocated_total
  FROM public.payment_installment_allocations
  WHERE payment_id = p_payment_id AND is_active = true;
  
  RETURN COALESCE(v_payment_amount, 0) - v_allocated_total;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- Function to update installment status after allocation changes
CREATE OR REPLACE FUNCTION public.update_installment_from_allocation()
RETURNS TRIGGER AS $$
DECLARE
  v_installment_amount NUMERIC;
  v_total_allocated NUMERIC;
  v_new_status TEXT;
BEGIN
  -- Get installment amount
  SELECT amount INTO v_installment_amount
  FROM public.payment_plan_installments
  WHERE id = COALESCE(NEW.installment_id, OLD.installment_id);
  
  -- Calculate total active allocations
  SELECT COALESCE(SUM(allocated_amount), 0) INTO v_total_allocated
  FROM public.payment_installment_allocations
  WHERE installment_id = COALESCE(NEW.installment_id, OLD.installment_id)
  AND is_active = true;
  
  -- Determine new status
  IF v_total_allocated >= v_installment_amount THEN
    v_new_status := 'paid';
  ELSIF v_total_allocated > 0 THEN
    v_new_status := 'partial';
  ELSE
    v_new_status := 'pending';
  END IF;
  
  -- Update installment
  UPDATE public.payment_plan_installments
  SET 
    amount_paid = v_total_allocated,
    status = v_new_status,
    updated_at = now()
  WHERE id = COALESCE(NEW.installment_id, OLD.installment_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for allocation changes
CREATE TRIGGER trg_allocation_update_installment
AFTER INSERT OR UPDATE ON public.payment_installment_allocations
FOR EACH ROW
EXECUTE FUNCTION public.update_installment_from_allocation();

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_installment_allocated_total TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_payment_unallocated_amount TO authenticated;

COMMENT ON TABLE public.payment_installment_allocations IS 'Links payments to installments - original payments remain immutable';
COMMENT ON COLUMN public.payment_installment_allocations.supersedes_allocation_id IS 'Points to the allocation this one replaces when edited';
COMMENT ON COLUMN public.payment_installment_allocations.is_active IS 'False when superseded by a new allocation';