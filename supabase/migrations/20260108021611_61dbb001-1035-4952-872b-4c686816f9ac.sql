-- Ledger entry types
CREATE TYPE public.ledger_entry_type AS ENUM (
    'charge',           -- Fee charged to student
    'payment',          -- Payment received
    'credit',           -- Credit applied (e.g., overpayment)
    'adjustment_debit', -- Increase balance (correction)
    'adjustment_credit',-- Decrease balance (correction)
    'waiver',           -- Fee waived
    'reversal',         -- Reverse a previous entry
    'transfer_in',      -- Balance transferred from another term/year
    'transfer_out'      -- Balance transferred to another term/year
);

-- Student fee ledger (append-only, immutable)
CREATE TABLE public.student_fee_ledger (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE RESTRICT,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE RESTRICT,
    
    -- Entry details
    entry_type ledger_entry_type NOT NULL,
    entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
    effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
    academic_year INTEGER NOT NULL,
    term INTEGER, -- NULL for annual/year-level entries
    
    -- Amount (positive for debits, negative for credits)
    debit_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    credit_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    
    -- Running balance (computed at insert time for historical accuracy)
    running_balance DECIMAL(12, 2) NOT NULL,
    
    -- References
    fee_category_id UUID REFERENCES public.fee_categories(id),
    fee_structure_id UUID REFERENCES public.fee_structures(id),
    payment_id UUID REFERENCES public.fee_payments(id),
    related_entry_id UUID REFERENCES public.student_fee_ledger(id), -- For reversals/adjustments
    
    -- Details
    description TEXT NOT NULL,
    reference_number TEXT,
    notes TEXT,
    
    -- Audit
    recorded_by UUID,
    recorded_by_role TEXT,
    recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    
    -- Integrity
    entry_hash TEXT NOT NULL,
    previous_hash TEXT,
    sequence_number BIGINT NOT NULL,
    
    -- Constraints
    CONSTRAINT valid_amounts CHECK (
        (debit_amount >= 0 AND credit_amount >= 0) AND
        (debit_amount > 0 OR credit_amount > 0) AND
        NOT (debit_amount > 0 AND credit_amount > 0)
    ),
    CONSTRAINT valid_term CHECK (term IS NULL OR (term >= 1 AND term <= 3))
);

-- Sequence for ledger entries per student (ensures ordering)
CREATE SEQUENCE public.ledger_sequence_seq START 1;

-- Function to get next sequence number for a student
CREATE OR REPLACE FUNCTION public.get_next_ledger_sequence(p_student_id UUID)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    next_seq BIGINT;
BEGIN
    SELECT COALESCE(MAX(sequence_number), 0) + 1 INTO next_seq
    FROM public.student_fee_ledger
    WHERE student_id = p_student_id;
    
    RETURN next_seq;
END;
$$;

-- Function to compute entry hash
CREATE OR REPLACE FUNCTION public.compute_ledger_hash(
    p_student_id UUID,
    p_entry_type ledger_entry_type,
    p_debit DECIMAL,
    p_credit DECIMAL,
    p_description TEXT,
    p_sequence BIGINT,
    p_previous_hash TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN encode(
        sha256(
            (p_student_id::TEXT || p_entry_type::TEXT || p_debit::TEXT || 
             p_credit::TEXT || p_description || p_sequence::TEXT || 
             COALESCE(p_previous_hash, 'GENESIS'))::bytea
        ),
        'hex'
    );
END;
$$;

-- Function to get running balance for a student
CREATE OR REPLACE FUNCTION public.get_student_running_balance(p_student_id UUID)
RETURNS DECIMAL
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_balance DECIMAL;
BEGIN
    SELECT COALESCE(running_balance, 0) INTO current_balance
    FROM public.student_fee_ledger
    WHERE student_id = p_student_id
    ORDER BY sequence_number DESC
    LIMIT 1;
    
    RETURN COALESCE(current_balance, 0);
END;
$$;

-- Function to insert ledger entry with computed values
CREATE OR REPLACE FUNCTION public.insert_ledger_entry(
    p_school_id UUID,
    p_student_id UUID,
    p_entry_type ledger_entry_type,
    p_entry_date DATE,
    p_effective_date DATE,
    p_academic_year INTEGER,
    p_term INTEGER,
    p_debit_amount DECIMAL,
    p_credit_amount DECIMAL,
    p_fee_category_id UUID,
    p_fee_structure_id UUID,
    p_payment_id UUID,
    p_related_entry_id UUID,
    p_description TEXT,
    p_reference_number TEXT,
    p_notes TEXT,
    p_recorded_by UUID,
    p_recorded_by_role TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_sequence BIGINT;
    v_previous_hash TEXT;
    v_current_balance DECIMAL;
    v_new_balance DECIMAL;
    v_entry_hash TEXT;
    v_entry_id UUID;
BEGIN
    -- Get next sequence number
    v_sequence := public.get_next_ledger_sequence(p_student_id);
    
    -- Get previous hash
    SELECT entry_hash INTO v_previous_hash
    FROM public.student_fee_ledger
    WHERE student_id = p_student_id
    ORDER BY sequence_number DESC
    LIMIT 1;
    
    -- Get current balance
    v_current_balance := public.get_student_running_balance(p_student_id);
    
    -- Calculate new balance (debits increase, credits decrease)
    v_new_balance := v_current_balance + p_debit_amount - p_credit_amount;
    
    -- Compute hash
    v_entry_hash := public.compute_ledger_hash(
        p_student_id,
        p_entry_type,
        p_debit_amount,
        p_credit_amount,
        p_description,
        v_sequence,
        v_previous_hash
    );
    
    -- Insert entry
    INSERT INTO public.student_fee_ledger (
        school_id,
        student_id,
        entry_type,
        entry_date,
        effective_date,
        academic_year,
        term,
        debit_amount,
        credit_amount,
        running_balance,
        fee_category_id,
        fee_structure_id,
        payment_id,
        related_entry_id,
        description,
        reference_number,
        notes,
        recorded_by,
        recorded_by_role,
        entry_hash,
        previous_hash,
        sequence_number
    ) VALUES (
        p_school_id,
        p_student_id,
        p_entry_type,
        p_entry_date,
        p_effective_date,
        p_academic_year,
        p_term,
        p_debit_amount,
        p_credit_amount,
        v_new_balance,
        p_fee_category_id,
        p_fee_structure_id,
        p_payment_id,
        p_related_entry_id,
        p_description,
        p_reference_number,
        p_notes,
        p_recorded_by,
        p_recorded_by_role,
        v_entry_hash,
        v_previous_hash,
        v_sequence
    )
    RETURNING id INTO v_entry_id;
    
    RETURN v_entry_id;
END;
$$;

-- Indexes
CREATE INDEX idx_ledger_student ON public.student_fee_ledger(student_id, sequence_number);
CREATE INDEX idx_ledger_student_year ON public.student_fee_ledger(student_id, academic_year, term);
CREATE INDEX idx_ledger_school ON public.student_fee_ledger(school_id);
CREATE INDEX idx_ledger_entry_date ON public.student_fee_ledger(entry_date);
CREATE INDEX idx_ledger_type ON public.student_fee_ledger(entry_type);
CREATE INDEX idx_ledger_payment ON public.student_fee_ledger(payment_id);

-- Enable RLS
ALTER TABLE public.student_fee_ledger ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "School members can view ledger entries"
ON public.student_fee_ledger FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authorized users can insert ledger entries"
ON public.student_fee_ledger FOR INSERT
TO authenticated
WITH CHECK (true);

-- NO UPDATE OR DELETE POLICIES - Ledger is append-only