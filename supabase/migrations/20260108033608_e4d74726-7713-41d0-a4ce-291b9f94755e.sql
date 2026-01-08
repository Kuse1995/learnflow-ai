-- =============================================================================
-- FEE TERM CLOSURE SYSTEM
-- Enables term-level financial period closure with read-only enforcement
-- =============================================================================

-- Table: fee_term_closures
-- Tracks which academic terms have been financially closed
CREATE TABLE public.fee_term_closures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  academic_year INTEGER NOT NULL,
  term INTEGER NOT NULL CHECK (term BETWEEN 1 AND 3),
  
  -- Closure metadata
  is_closed BOOLEAN NOT NULL DEFAULT false,
  closed_at TIMESTAMPTZ,
  closed_by TEXT,
  
  -- Summary snapshot at closure time
  total_fees_charged NUMERIC(12, 2),
  total_payments_received NUMERIC(12, 2),
  total_adjustments NUMERIC(12, 2),
  outstanding_balance NUMERIC(12, 2),
  student_count INTEGER,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Ensure unique term per school per year
  UNIQUE (school_id, academic_year, term)
);

-- Enable RLS
ALTER TABLE public.fee_term_closures ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "School staff can view their term closures"
  ON public.fee_term_closures
  FOR SELECT
  USING (true);

CREATE POLICY "School staff can manage their term closures"
  ON public.fee_term_closures
  FOR ALL
  USING (true);

-- Indexes
CREATE INDEX idx_fee_term_closures_school_year ON public.fee_term_closures(school_id, academic_year);
CREATE INDEX idx_fee_term_closures_status ON public.fee_term_closures(school_id, is_closed);

-- Function: Check if a term is closed
CREATE OR REPLACE FUNCTION public.is_term_closed(
  p_school_id UUID,
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
    SELECT 1 
    FROM fee_term_closures 
    WHERE school_id = p_school_id 
      AND academic_year = p_academic_year 
      AND term = p_term 
      AND is_closed = true
  );
END;
$$;

-- Function: Close a term with summary snapshot
CREATE OR REPLACE FUNCTION public.close_fee_term(
  p_school_id UUID,
  p_academic_year INTEGER,
  p_term INTEGER,
  p_closed_by TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_summary RECORD;
  v_closure_id UUID;
  v_already_closed BOOLEAN;
BEGIN
  -- Check if already closed
  SELECT is_closed INTO v_already_closed
  FROM fee_term_closures
  WHERE school_id = p_school_id 
    AND academic_year = p_academic_year 
    AND term = p_term;
  
  IF v_already_closed = true THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Term is already closed'
    );
  END IF;

  -- Calculate summary from ledger entries
  SELECT 
    COALESCE(SUM(CASE WHEN entry_type IN ('charge', 'late_fee') THEN debit_amount ELSE 0 END), 0) AS total_fees,
    COALESCE(SUM(CASE WHEN entry_type = 'payment' THEN credit_amount ELSE 0 END), 0) AS total_payments,
    COALESCE(SUM(CASE WHEN entry_type IN ('waiver', 'discount', 'adjustment_credit') THEN credit_amount ELSE 0 END), 0) AS total_adjustments,
    COUNT(DISTINCT student_id) AS student_count
  INTO v_summary
  FROM student_fee_ledger
  WHERE school_id = p_school_id 
    AND academic_year = p_academic_year 
    AND term = p_term;

  -- Upsert the closure record
  INSERT INTO fee_term_closures (
    school_id,
    academic_year,
    term,
    is_closed,
    closed_at,
    closed_by,
    total_fees_charged,
    total_payments_received,
    total_adjustments,
    outstanding_balance,
    student_count,
    updated_at
  )
  VALUES (
    p_school_id,
    p_academic_year,
    p_term,
    true,
    now(),
    p_closed_by,
    v_summary.total_fees,
    v_summary.total_payments,
    v_summary.total_adjustments,
    v_summary.total_fees - v_summary.total_payments - v_summary.total_adjustments,
    v_summary.student_count
  )
  ON CONFLICT (school_id, academic_year, term) 
  DO UPDATE SET
    is_closed = true,
    closed_at = now(),
    closed_by = p_closed_by,
    total_fees_charged = v_summary.total_fees,
    total_payments_received = v_summary.total_payments,
    total_adjustments = v_summary.total_adjustments,
    outstanding_balance = v_summary.total_fees - v_summary.total_payments - v_summary.total_adjustments,
    student_count = v_summary.student_count,
    updated_at = now()
  RETURNING id INTO v_closure_id;

  RETURN jsonb_build_object(
    'success', true,
    'closure_id', v_closure_id,
    'summary', jsonb_build_object(
      'total_fees', v_summary.total_fees,
      'total_payments', v_summary.total_payments,
      'total_adjustments', v_summary.total_adjustments,
      'outstanding_balance', v_summary.total_fees - v_summary.total_payments - v_summary.total_adjustments,
      'student_count', v_summary.student_count
    )
  );
END;
$$;

-- Updated timestamp trigger
CREATE TRIGGER update_fee_term_closures_updated_at
  BEFORE UPDATE ON public.fee_term_closures
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();