-- Payment Plan Workflow History Table
-- Tracks all state transitions with full audit trail

CREATE TABLE public.payment_plan_workflow_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.payment_plans(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  from_status TEXT NOT NULL,
  to_status TEXT NOT NULL,
  performed_by TEXT NOT NULL,
  performed_by_role TEXT NOT NULL,
  performed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reason TEXT,
  notes TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for efficient querying
CREATE INDEX idx_workflow_history_plan ON public.payment_plan_workflow_history(plan_id);
CREATE INDEX idx_workflow_history_performed_at ON public.payment_plan_workflow_history(performed_at DESC);
CREATE INDEX idx_workflow_history_action ON public.payment_plan_workflow_history(action);

-- Add workflow tracking columns to payment_plans if not present
ALTER TABLE public.payment_plans
ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS activated_by TEXT,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS completed_by TEXT,
ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS rejected_by TEXT,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Enable RLS
ALTER TABLE public.payment_plan_workflow_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for workflow history
CREATE POLICY "School staff can view workflow history" 
ON public.payment_plan_workflow_history 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.payment_plans pp
    JOIN public.classes c ON c.school_id = pp.school_id
    WHERE pp.id = payment_plan_workflow_history.plan_id
  )
);

CREATE POLICY "Finance roles can insert workflow history"
ON public.payment_plan_workflow_history
FOR INSERT
WITH CHECK (
  performed_by_role IN ('admin', 'bursar', 'finance_officer')
);

-- Function to validate workflow transitions
CREATE OR REPLACE FUNCTION public.validate_plan_transition(
  p_plan_id UUID,
  p_from_status TEXT,
  p_to_status TEXT,
  p_role TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_current_status TEXT;
  v_valid_transitions JSONB;
BEGIN
  -- Get current status
  SELECT status INTO v_current_status
  FROM public.payment_plans
  WHERE id = p_plan_id;
  
  IF v_current_status IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Check if current status matches expected
  IF v_current_status != p_from_status THEN
    RETURN FALSE;
  END IF;
  
  -- Define valid transitions per role
  v_valid_transitions := '{
    "admin": {
      "draft": ["pending_approval", "cancelled"],
      "pending_approval": ["approved", "draft", "cancelled"],
      "approved": ["active", "cancelled"],
      "active": ["completed", "cancelled"]
    },
    "bursar": {
      "draft": ["pending_approval", "cancelled"],
      "pending_approval": ["approved", "draft", "cancelled"],
      "approved": ["active", "cancelled"],
      "active": ["completed", "cancelled"]
    },
    "finance_officer": {
      "draft": ["pending_approval"],
      "pending_approval": ["approved", "draft"],
      "approved": ["active"],
      "active": ["completed"]
    }
  }'::JSONB;
  
  -- Check if role has permission for this transition
  IF v_valid_transitions->p_role IS NULL THEN
    RETURN FALSE;
  END IF;
  
  IF v_valid_transitions->p_role->p_from_status IS NULL THEN
    RETURN FALSE;
  END IF;
  
  RETURN p_to_status = ANY(
    SELECT jsonb_array_elements_text(v_valid_transitions->p_role->p_from_status)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.validate_plan_transition TO authenticated;

COMMENT ON TABLE public.payment_plan_workflow_history IS 'Audit trail for payment plan state transitions';
COMMENT ON FUNCTION public.validate_plan_transition IS 'Validates role-based workflow transitions for payment plans';