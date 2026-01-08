-- Add payment history tracking to installments
ALTER TABLE public.payment_plan_installments 
ADD COLUMN IF NOT EXISTS payment_history JSONB DEFAULT '[]'::jsonb;

-- Update status check to include 'missed' instead of 'overdue'
ALTER TABLE public.payment_plan_installments 
DROP CONSTRAINT IF EXISTS payment_plan_installments_status_check;

ALTER TABLE public.payment_plan_installments 
ADD CONSTRAINT payment_plan_installments_status_check 
CHECK (status IN ('pending', 'partial', 'paid', 'missed', 'waived'));

-- Update any existing 'overdue' to 'missed'
UPDATE public.payment_plan_installments 
SET status = 'missed' 
WHERE status = 'overdue';

-- Function to calculate installment status
CREATE OR REPLACE FUNCTION public.calculate_installment_status(
  p_amount NUMERIC,
  p_amount_paid NUMERIC,
  p_due_date DATE
)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
BEGIN
  -- Fully paid
  IF p_amount_paid >= p_amount THEN
    RETURN 'paid';
  END IF;
  
  -- Partially paid
  IF p_amount_paid > 0 THEN
    RETURN 'partial';
  END IF;
  
  -- Past due with no payment = missed (informational only)
  IF p_due_date < CURRENT_DATE AND p_amount_paid = 0 THEN
    RETURN 'missed';
  END IF;
  
  -- Not yet due
  RETURN 'pending';
END;
$$;

-- Function to record a payment to an installment
CREATE OR REPLACE FUNCTION public.record_installment_payment(
  p_installment_id UUID,
  p_amount NUMERIC,
  p_payment_date DATE,
  p_payment_reference TEXT DEFAULT NULL,
  p_ledger_entry_id UUID DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_installment RECORD;
  v_new_amount_paid NUMERIC;
  v_new_status TEXT;
  v_payment_record JSONB;
  v_payment_history JSONB;
  v_ledger_ids UUID[];
BEGIN
  -- Get current installment
  SELECT * INTO v_installment
  FROM payment_plan_installments
  WHERE id = p_installment_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Installment not found');
  END IF;
  
  -- Calculate new amount paid
  v_new_amount_paid := v_installment.amount_paid + p_amount;
  
  -- Calculate new status
  v_new_status := calculate_installment_status(
    v_installment.amount, 
    v_new_amount_paid, 
    v_installment.due_date
  );
  
  -- Build payment record
  v_payment_record := jsonb_build_object(
    'amount', p_amount,
    'date', p_payment_date,
    'reference', p_payment_reference,
    'ledger_entry_id', p_ledger_entry_id,
    'notes', p_notes,
    'recorded_at', now()
  );
  
  -- Append to payment history
  v_payment_history := COALESCE(v_installment.payment_history, '[]'::jsonb) || v_payment_record;
  
  -- Update ledger entry IDs array
  v_ledger_ids := COALESCE(v_installment.ledger_entry_ids, ARRAY[]::UUID[]);
  IF p_ledger_entry_id IS NOT NULL AND NOT (p_ledger_entry_id = ANY(v_ledger_ids)) THEN
    v_ledger_ids := v_ledger_ids || p_ledger_entry_id;
  END IF;
  
  -- Update installment
  UPDATE payment_plan_installments
  SET 
    amount_paid = v_new_amount_paid,
    status = v_new_status,
    paid_date = CASE 
      WHEN v_new_status = 'paid' THEN p_payment_date 
      ELSE paid_date 
    END,
    payment_reference = COALESCE(p_payment_reference, payment_reference),
    payment_history = v_payment_history,
    ledger_entry_ids = v_ledger_ids,
    updated_at = now()
  WHERE id = p_installment_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'new_amount_paid', v_new_amount_paid,
    'new_status', v_new_status,
    'remaining', v_installment.amount - v_new_amount_paid
  );
END;
$$;

-- Function to refresh all installment statuses for a plan
CREATE OR REPLACE FUNCTION public.refresh_plan_installment_statuses(p_plan_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated INTEGER := 0;
BEGIN
  UPDATE payment_plan_installments
  SET status = calculate_installment_status(amount, amount_paid, due_date),
      updated_at = now()
  WHERE plan_id = p_plan_id
    AND status != 'waived'
    AND status != calculate_installment_status(amount, amount_paid, due_date);
  
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  
  RETURN v_updated;
END;
$$;