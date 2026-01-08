
-- Create adjustment type enum
CREATE TYPE public.fee_adjustment_type AS ENUM ('waiver', 'discount', 'arrangement_note');

-- Fee adjustments table (append-only)
CREATE TABLE public.fee_adjustments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  class_id UUID REFERENCES public.classes(id),
  adjustment_type fee_adjustment_type NOT NULL,
  amount NUMERIC(12,2),
  reason TEXT NOT NULL,
  approved_by UUID,
  approved_by_name TEXT,
  approved_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  academic_year INTEGER NOT NULL,
  applies_to_term INTEGER,
  parent_visible_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ledger_entry_id UUID REFERENCES public.student_fee_ledger(id),
  
  -- Constraint: amount required for waiver and discount
  CONSTRAINT amount_required_for_adjustments CHECK (
    (adjustment_type = 'arrangement_note') OR (amount IS NOT NULL AND amount > 0)
  )
);

-- Enable RLS
ALTER TABLE public.fee_adjustments ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Staff can view adjustments"
ON public.fee_adjustments
FOR SELECT
USING (true);

CREATE POLICY "Staff can create adjustments"
ON public.fee_adjustments
FOR INSERT
WITH CHECK (true);

-- Indexes for performance
CREATE INDEX idx_fee_adjustments_student ON public.fee_adjustments(student_id);
CREATE INDEX idx_fee_adjustments_school ON public.fee_adjustments(school_id);
CREATE INDEX idx_fee_adjustments_type ON public.fee_adjustments(adjustment_type);
CREATE INDEX idx_fee_adjustments_created ON public.fee_adjustments(created_at DESC);

-- Function to record adjustment and create ledger entry
CREATE OR REPLACE FUNCTION public.record_fee_adjustment(
  p_school_id UUID,
  p_student_id UUID,
  p_class_id UUID,
  p_adjustment_type fee_adjustment_type,
  p_amount NUMERIC,
  p_reason TEXT,
  p_approved_by_name TEXT,
  p_academic_year INTEGER,
  p_applies_to_term INTEGER,
  p_parent_visible_reason TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_adjustment_id UUID;
  v_ledger_entry_id UUID;
  v_entry_type TEXT;
  v_description TEXT;
BEGIN
  -- Only create ledger entry for waivers and discounts (not arrangement notes)
  IF p_adjustment_type != 'arrangement_note' AND p_amount IS NOT NULL AND p_amount > 0 THEN
    -- Determine entry type and description
    IF p_adjustment_type = 'waiver' THEN
      v_entry_type := 'waiver';
      v_description := 'Approved waiver: ' || LEFT(p_reason, 100);
    ELSE
      v_entry_type := 'credit';
      v_description := 'Approved discount: ' || LEFT(p_reason, 100);
    END IF;
    
    -- Insert ledger entry (credit reduces balance)
    INSERT INTO student_fee_ledger (
      school_id,
      student_id,
      academic_year,
      term,
      entry_type,
      description,
      debit_amount,
      credit_amount,
      running_balance,
      entry_hash,
      previous_hash
    )
    SELECT
      p_school_id,
      p_student_id,
      p_academic_year,
      p_applies_to_term,
      v_entry_type,
      v_description,
      0,
      p_amount,
      COALESCE(
        (SELECT running_balance FROM student_fee_ledger 
         WHERE student_id = p_student_id 
         ORDER BY created_at DESC LIMIT 1), 0
      ) - p_amount,
      encode(sha256(random()::text::bytea), 'hex'),
      (SELECT entry_hash FROM student_fee_ledger 
       WHERE student_id = p_student_id 
       ORDER BY created_at DESC LIMIT 1)
    RETURNING id INTO v_ledger_entry_id;
  END IF;
  
  -- Insert adjustment record
  INSERT INTO fee_adjustments (
    school_id,
    student_id,
    class_id,
    adjustment_type,
    amount,
    reason,
    approved_by_name,
    academic_year,
    applies_to_term,
    parent_visible_reason,
    ledger_entry_id
  ) VALUES (
    p_school_id,
    p_student_id,
    p_class_id,
    p_adjustment_type,
    p_amount,
    p_reason,
    p_approved_by_name,
    p_academic_year,
    p_applies_to_term,
    COALESCE(p_parent_visible_reason, 
      CASE p_adjustment_type 
        WHEN 'waiver' THEN 'Fee consideration applied'
        WHEN 'discount' THEN 'Approved discount applied'
        ELSE 'Payment arrangement noted'
      END
    ),
    v_ledger_entry_id
  )
  RETURNING id INTO v_adjustment_id;
  
  RETURN v_adjustment_id;
END;
$$;
