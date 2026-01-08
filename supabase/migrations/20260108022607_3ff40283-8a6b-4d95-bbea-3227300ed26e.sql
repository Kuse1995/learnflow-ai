-- Fee audit log table for detailed fee-specific tracking
CREATE TABLE public.fee_audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  
  -- What changed
  action_type TEXT NOT NULL CHECK (action_type IN (
    'charge_created',
    'payment_recorded',
    'payment_corrected',
    'waiver_applied',
    'waiver_reversed',
    'fee_assigned',
    'fee_unassigned',
    'structure_changed',
    'balance_adjusted',
    'arrangement_created',
    'arrangement_updated',
    'arrangement_completed',
    'arrangement_defaulted',
    'reversal_created',
    'refund_issued',
    'category_changed',
    'late_fee_applied',
    'late_fee_waived'
  )),
  
  -- Entity references
  entity_type TEXT NOT NULL CHECK (entity_type IN (
    'ledger_entry',
    'fee_payment',
    'fee_structure',
    'fee_assignment',
    'fee_category',
    'payment_arrangement'
  )),
  entity_id UUID NOT NULL,
  related_entity_id UUID, -- For corrections, links to original
  
  -- Change details
  previous_values JSONB,
  new_values JSONB NOT NULL,
  amount_affected NUMERIC(12, 2),
  currency TEXT NOT NULL DEFAULT 'ZMW',
  
  -- Who and why
  performed_by UUID,
  performed_by_role TEXT NOT NULL CHECK (performed_by_role IN (
    'bursar', 'admin', 'school_admin', 'system', 'teacher'
  )),
  reason TEXT NOT NULL,
  notes TEXT,
  
  -- Correction chain
  is_correction BOOLEAN NOT NULL DEFAULT false,
  corrects_audit_id UUID REFERENCES public.fee_audit_logs(id),
  correction_type TEXT CHECK (
    correction_type IS NULL OR correction_type IN (
      'amount_error',
      'wrong_student',
      'wrong_category',
      'duplicate_entry',
      'date_error',
      'method_error',
      'other'
    )
  ),
  
  -- Approval tracking
  requires_approval BOOLEAN NOT NULL DEFAULT false,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  approval_notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  academic_year INTEGER NOT NULL,
  term INTEGER,
  
  -- Integrity
  entry_hash TEXT NOT NULL,
  previous_hash TEXT,
  sequence_number INTEGER NOT NULL
);

-- Index for efficient queries
CREATE INDEX idx_fee_audit_student ON public.fee_audit_logs(student_id, created_at DESC);
CREATE INDEX idx_fee_audit_school ON public.fee_audit_logs(school_id, created_at DESC);
CREATE INDEX idx_fee_audit_entity ON public.fee_audit_logs(entity_type, entity_id);
CREATE INDEX idx_fee_audit_corrections ON public.fee_audit_logs(corrects_audit_id) WHERE corrects_audit_id IS NOT NULL;
CREATE INDEX idx_fee_audit_pending_approval ON public.fee_audit_logs(school_id) WHERE requires_approval = true AND approved_at IS NULL;

-- Payment correction requests table
CREATE TABLE public.fee_correction_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  
  -- Original entry
  original_ledger_entry_id UUID NOT NULL,
  original_payment_id UUID REFERENCES public.fee_payments(id),
  original_amount NUMERIC(12, 2) NOT NULL,
  original_payment_method TEXT,
  original_payment_date DATE,
  
  -- Correction details
  correction_type TEXT NOT NULL CHECK (correction_type IN (
    'amount_error',
    'wrong_student',
    'wrong_category',
    'duplicate_entry',
    'date_error',
    'method_error',
    'other'
  )),
  corrected_amount NUMERIC(12, 2),
  corrected_payment_method TEXT,
  corrected_payment_date DATE,
  corrected_category_id UUID REFERENCES public.fee_categories(id),
  
  -- Request info
  reason TEXT NOT NULL,
  supporting_evidence TEXT,
  requested_by UUID NOT NULL,
  requested_by_role TEXT NOT NULL,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Status workflow
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',
    'under_review',
    'approved',
    'rejected',
    'applied',
    'cancelled'
  )),
  
  -- Review
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  rejection_reason TEXT,
  
  -- Application
  applied_by UUID,
  applied_at TIMESTAMPTZ,
  resulting_ledger_entry_id UUID,
  resulting_audit_log_id UUID REFERENCES public.fee_audit_logs(id),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for correction requests
CREATE INDEX idx_correction_requests_status ON public.fee_correction_requests(school_id, status);
CREATE INDEX idx_correction_requests_student ON public.fee_correction_requests(student_id);

-- Function to get next sequence number for fee audit
CREATE OR REPLACE FUNCTION public.get_next_fee_audit_sequence(p_student_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_seq INTEGER;
BEGIN
  SELECT COALESCE(MAX(sequence_number), 0) + 1 INTO next_seq
  FROM fee_audit_logs
  WHERE student_id = p_student_id;
  
  RETURN next_seq;
END;
$$;

-- Function to compute fee audit hash
CREATE OR REPLACE FUNCTION public.compute_fee_audit_hash(
  p_action_type TEXT,
  p_entity_id UUID,
  p_amount NUMERIC,
  p_performed_by UUID,
  p_reason TEXT,
  p_created_at TIMESTAMPTZ,
  p_previous_hash TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
BEGIN
  RETURN encode(
    sha256(
      (COALESCE(p_action_type, '') || '|' ||
       COALESCE(p_entity_id::TEXT, '') || '|' ||
       COALESCE(p_amount::TEXT, '0') || '|' ||
       COALESCE(p_performed_by::TEXT, '') || '|' ||
       COALESCE(p_reason, '') || '|' ||
       COALESCE(p_created_at::TEXT, '') || '|' ||
       COALESCE(p_previous_hash, 'genesis'))::bytea
    ),
    'hex'
  );
END;
$$;

-- Function to insert fee audit log with hash chain
CREATE OR REPLACE FUNCTION public.insert_fee_audit_log(
  p_school_id UUID,
  p_student_id UUID,
  p_action_type TEXT,
  p_entity_type TEXT,
  p_entity_id UUID,
  p_new_values JSONB,
  p_amount_affected NUMERIC,
  p_performed_by UUID,
  p_performed_by_role TEXT,
  p_reason TEXT,
  p_academic_year INTEGER,
  p_term INTEGER DEFAULT NULL,
  p_previous_values JSONB DEFAULT NULL,
  p_related_entity_id UUID DEFAULT NULL,
  p_is_correction BOOLEAN DEFAULT false,
  p_corrects_audit_id UUID DEFAULT NULL,
  p_correction_type TEXT DEFAULT NULL,
  p_requires_approval BOOLEAN DEFAULT false,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sequence_number INTEGER;
  v_previous_hash TEXT;
  v_entry_hash TEXT;
  v_created_at TIMESTAMPTZ;
  v_new_id UUID;
BEGIN
  -- Get sequence and previous hash
  v_sequence_number := get_next_fee_audit_sequence(p_student_id);
  
  SELECT entry_hash INTO v_previous_hash
  FROM fee_audit_logs
  WHERE student_id = p_student_id
  ORDER BY sequence_number DESC
  LIMIT 1;
  
  v_created_at := now();
  
  -- Compute hash
  v_entry_hash := compute_fee_audit_hash(
    p_action_type,
    p_entity_id,
    p_amount_affected,
    p_performed_by,
    p_reason,
    v_created_at,
    v_previous_hash
  );
  
  -- Insert audit log
  INSERT INTO fee_audit_logs (
    school_id,
    student_id,
    action_type,
    entity_type,
    entity_id,
    related_entity_id,
    previous_values,
    new_values,
    amount_affected,
    performed_by,
    performed_by_role,
    reason,
    notes,
    is_correction,
    corrects_audit_id,
    correction_type,
    requires_approval,
    created_at,
    academic_year,
    term,
    entry_hash,
    previous_hash,
    sequence_number
  ) VALUES (
    p_school_id,
    p_student_id,
    p_action_type,
    p_entity_type,
    p_entity_id,
    p_related_entity_id,
    p_previous_values,
    p_new_values,
    p_amount_affected,
    p_performed_by,
    p_performed_by_role,
    p_reason,
    p_notes,
    p_is_correction,
    p_corrects_audit_id,
    p_correction_type,
    p_requires_approval,
    v_created_at,
    p_academic_year,
    p_term,
    v_entry_hash,
    v_previous_hash,
    v_sequence_number
  )
  RETURNING id INTO v_new_id;
  
  RETURN v_new_id;
END;
$$;

-- Enable RLS
ALTER TABLE public.fee_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_correction_requests ENABLE ROW LEVEL SECURITY;

-- RLS policies for fee_audit_logs
CREATE POLICY "School staff can view fee audit logs"
ON public.fee_audit_logs FOR SELECT
USING (true);

CREATE POLICY "Authorized staff can create fee audit logs"
ON public.fee_audit_logs FOR INSERT
WITH CHECK (true);

-- RLS policies for fee_correction_requests
CREATE POLICY "School staff can view correction requests"
ON public.fee_correction_requests FOR SELECT
USING (true);

CREATE POLICY "Authorized staff can create correction requests"
ON public.fee_correction_requests FOR INSERT
WITH CHECK (true);

CREATE POLICY "Authorized staff can update correction requests"
ON public.fee_correction_requests FOR UPDATE
USING (true);

-- Trigger to update updated_at
CREATE TRIGGER update_fee_correction_requests_updated_at
BEFORE UPDATE ON public.fee_correction_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();