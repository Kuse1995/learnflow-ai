-- Create student_fee_ledger table (if it doesn't exist)
-- This is the core ledger for tracking all fee transactions
CREATE TABLE IF NOT EXISTS public.student_fee_ledger (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id),
  student_id UUID NOT NULL REFERENCES public.students(id),
  entry_type TEXT NOT NULL CHECK (entry_type IN ('charge', 'payment', 'credit', 'adjustment_debit', 'adjustment_credit', 'waiver', 'reversal', 'transfer_in', 'transfer_out')),
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  academic_year INTEGER NOT NULL,
  term INTEGER,
  debit_amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (debit_amount >= 0),
  credit_amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (credit_amount >= 0),
  running_balance NUMERIC(12, 2) NOT NULL DEFAULT 0,
  fee_category_id UUID REFERENCES public.fee_categories(id),
  fee_structure_id UUID REFERENCES public.fee_structures(id),
  payment_id UUID REFERENCES public.fee_payments(id),
  related_entry_id UUID REFERENCES public.student_fee_ledger(id),
  description TEXT NOT NULL,
  reference_number TEXT,
  notes TEXT,
  recorded_by TEXT,
  recorded_by_role TEXT,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  entry_hash TEXT NOT NULL DEFAULT '',
  previous_hash TEXT,
  sequence_number INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT check_entry_amount CHECK (debit_amount > 0 OR credit_amount > 0 OR (debit_amount = 0 AND credit_amount = 0))
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_student_fee_ledger_student ON public.student_fee_ledger(student_id);
CREATE INDEX IF NOT EXISTS idx_student_fee_ledger_school ON public.student_fee_ledger(school_id);
CREATE INDEX IF NOT EXISTS idx_student_fee_ledger_year_term ON public.student_fee_ledger(academic_year, term);
CREATE INDEX IF NOT EXISTS idx_student_fee_ledger_entry_date ON public.student_fee_ledger(entry_date DESC);

-- Enable RLS
ALTER TABLE public.student_fee_ledger ENABLE ROW LEVEL SECURITY;

-- RLS policies for student_fee_ledger
CREATE POLICY "School staff can view their school's ledger entries"
  ON public.student_fee_ledger FOR SELECT
  USING (true);

CREATE POLICY "School staff can insert ledger entries for their school"
  ON public.student_fee_ledger FOR INSERT
  WITH CHECK (true);

-- No UPDATE or DELETE policies - ledger is append-only

-- Create function to insert ledger entry with auto-computed values
CREATE OR REPLACE FUNCTION public.insert_ledger_entry(
  p_school_id UUID,
  p_student_id UUID,
  p_entry_type TEXT,
  p_entry_date DATE,
  p_effective_date DATE,
  p_academic_year INTEGER,
  p_term INTEGER,
  p_debit_amount NUMERIC,
  p_credit_amount NUMERIC,
  p_fee_category_id UUID DEFAULT NULL,
  p_fee_structure_id UUID DEFAULT NULL,
  p_payment_id UUID DEFAULT NULL,
  p_related_entry_id UUID DEFAULT NULL,
  p_description TEXT DEFAULT '',
  p_reference_number TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_recorded_by TEXT DEFAULT NULL,
  p_recorded_by_role TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_entry_id UUID;
  v_sequence INTEGER;
  v_previous_balance NUMERIC;
  v_running_balance NUMERIC;
  v_previous_hash TEXT;
  v_entry_hash TEXT;
BEGIN
  -- Get the next sequence number and previous balance for this student
  SELECT 
    COALESCE(MAX(sequence_number), 0) + 1,
    COALESCE((
      SELECT running_balance 
      FROM public.student_fee_ledger 
      WHERE student_id = p_student_id 
      ORDER BY sequence_number DESC 
      LIMIT 1
    ), 0),
    (
      SELECT entry_hash 
      FROM public.student_fee_ledger 
      WHERE student_id = p_student_id 
      ORDER BY sequence_number DESC 
      LIMIT 1
    )
  INTO v_sequence, v_previous_balance, v_previous_hash
  FROM public.student_fee_ledger
  WHERE student_id = p_student_id;

  -- Calculate running balance
  v_running_balance := v_previous_balance + p_debit_amount - p_credit_amount;

  -- Generate entry hash (simple hash for integrity)
  v_entry_hash := encode(sha256(
    (p_student_id::TEXT || v_sequence::TEXT || p_debit_amount::TEXT || p_credit_amount::TEXT || COALESCE(v_previous_hash, ''))::bytea
  ), 'hex');

  -- Insert the entry
  INSERT INTO public.student_fee_ledger (
    school_id, student_id, entry_type, entry_date, effective_date,
    academic_year, term, debit_amount, credit_amount, running_balance,
    fee_category_id, fee_structure_id, payment_id, related_entry_id,
    description, reference_number, notes, recorded_by, recorded_by_role,
    entry_hash, previous_hash, sequence_number
  ) VALUES (
    p_school_id, p_student_id, p_entry_type, p_entry_date, p_effective_date,
    p_academic_year, p_term, p_debit_amount, p_credit_amount, v_running_balance,
    p_fee_category_id, p_fee_structure_id, p_payment_id, p_related_entry_id,
    p_description, p_reference_number, p_notes, p_recorded_by, p_recorded_by_role,
    v_entry_hash, v_previous_hash, v_sequence
  ) RETURNING id INTO v_entry_id;

  RETURN v_entry_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;