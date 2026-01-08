-- Create fee_receipts table for payment receipts
CREATE TABLE IF NOT EXISTS public.fee_receipts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ledger_entry_id UUID NOT NULL REFERENCES public.student_fee_ledger(id),
  receipt_number TEXT NOT NULL UNIQUE,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  issued_by TEXT,
  school_id UUID NOT NULL REFERENCES public.schools(id),
  school_name_snapshot TEXT NOT NULL,
  student_id UUID NOT NULL REFERENCES public.students(id),
  student_name_snapshot TEXT NOT NULL,
  class_name_snapshot TEXT,
  grade_snapshot TEXT,
  academic_year INTEGER NOT NULL,
  term INTEGER,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'ZMW',
  payment_method TEXT NOT NULL,
  payment_date DATE NOT NULL,
  reference_number TEXT,
  voided BOOLEAN NOT NULL DEFAULT false,
  voided_at TIMESTAMPTZ,
  voided_by TEXT,
  void_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_fee_receipts_school ON public.fee_receipts(school_id);
CREATE INDEX IF NOT EXISTS idx_fee_receipts_student ON public.fee_receipts(student_id);
CREATE INDEX IF NOT EXISTS idx_fee_receipts_ledger_entry ON public.fee_receipts(ledger_entry_id);
CREATE INDEX IF NOT EXISTS idx_fee_receipts_number ON public.fee_receipts(receipt_number);
CREATE INDEX IF NOT EXISTS idx_fee_receipts_issued ON public.fee_receipts(issued_at DESC);

-- Enable RLS
ALTER TABLE public.fee_receipts ENABLE ROW LEVEL SECURITY;

-- RLS policies for fee_receipts
CREATE POLICY "Users can view receipts"
  ON public.fee_receipts FOR SELECT
  USING (true);

CREATE POLICY "Staff can insert receipts"
  ON public.fee_receipts FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Staff can update receipts for voiding"
  ON public.fee_receipts FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Receipt number sequence table (per school per year)
CREATE TABLE IF NOT EXISTS public.fee_receipt_sequences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id),
  year INTEGER NOT NULL,
  last_sequence INTEGER NOT NULL DEFAULT 0,
  school_code TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(school_id, year)
);

-- Enable RLS on sequences
ALTER TABLE public.fee_receipt_sequences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage sequences"
  ON public.fee_receipt_sequences FOR ALL
  USING (true)
  WITH CHECK (true);

-- Function to generate next receipt number
CREATE OR REPLACE FUNCTION public.generate_receipt_number(
  p_school_id UUID,
  p_school_code TEXT,
  p_year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER
) RETURNS TEXT AS $$
DECLARE
  v_sequence INTEGER;
  v_receipt_number TEXT;
BEGIN
  -- Upsert sequence and get next number
  INSERT INTO public.fee_receipt_sequences (school_id, year, school_code, last_sequence)
  VALUES (p_school_id, p_year, p_school_code, 1)
  ON CONFLICT (school_id, year)
  DO UPDATE SET 
    last_sequence = fee_receipt_sequences.last_sequence + 1,
    updated_at = now()
  RETURNING last_sequence INTO v_sequence;

  -- Format receipt number: SCHOOLCODE-YYYY-NNNNNN
  v_receipt_number := p_school_code || '-' || p_year::TEXT || '-' || LPAD(v_sequence::TEXT, 6, '0');

  RETURN v_receipt_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to create a receipt from a ledger entry
CREATE OR REPLACE FUNCTION public.create_fee_receipt(
  p_ledger_entry_id UUID,
  p_issued_by TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_entry RECORD;
  v_student RECORD;
  v_school RECORD;
  v_class RECORD;
  v_receipt_number TEXT;
  v_receipt_id UUID;
BEGIN
  -- Get ledger entry
  SELECT * INTO v_entry FROM public.student_fee_ledger WHERE id = p_ledger_entry_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ledger entry not found';
  END IF;

  -- Only create receipts for payment entries
  IF v_entry.entry_type != 'payment' THEN
    RAISE EXCEPTION 'Receipts can only be created for payment entries';
  END IF;

  -- Check if receipt already exists
  IF EXISTS (SELECT 1 FROM public.fee_receipts WHERE ledger_entry_id = p_ledger_entry_id AND NOT voided) THEN
    RAISE EXCEPTION 'A receipt already exists for this payment';
  END IF;

  -- Get student info
  SELECT id, name INTO v_student FROM public.students WHERE id = v_entry.student_id;
  
  -- Get school info
  SELECT id, name, COALESCE(settings->>'code', 'SCH') as code 
  INTO v_school FROM public.schools WHERE id = v_entry.school_id;

  -- Get class info (optional)
  SELECT name, grade INTO v_class FROM public.classes 
  WHERE id = (SELECT class_id FROM public.students WHERE id = v_entry.student_id);

  -- Generate receipt number
  v_receipt_number := public.generate_receipt_number(v_school.id, v_school.code);

  -- Create receipt
  INSERT INTO public.fee_receipts (
    ledger_entry_id, receipt_number, issued_by, school_id,
    school_name_snapshot, student_id, student_name_snapshot,
    class_name_snapshot, grade_snapshot, academic_year, term,
    amount, payment_method, payment_date, reference_number
  ) VALUES (
    p_ledger_entry_id, v_receipt_number, p_issued_by, v_school.id,
    v_school.name, v_student.id, v_student.name,
    v_class.name, v_class.grade, v_entry.academic_year, v_entry.term,
    v_entry.credit_amount, 
    COALESCE(SPLIT_PART(v_entry.description, ': ', 2), 'Cash'),
    v_entry.entry_date,
    v_entry.reference_number
  ) RETURNING id INTO v_receipt_id;

  RETURN v_receipt_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to void a receipt
CREATE OR REPLACE FUNCTION public.void_fee_receipt(
  p_receipt_id UUID,
  p_voided_by TEXT,
  p_void_reason TEXT
) RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.fee_receipts
  SET 
    voided = true,
    voided_at = now(),
    voided_by = p_voided_by,
    void_reason = p_void_reason
  WHERE id = p_receipt_id AND NOT voided;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;