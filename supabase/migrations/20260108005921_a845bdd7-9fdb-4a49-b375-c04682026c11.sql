
-- Create message edit history table for tracking all changes
CREATE TABLE public.message_edit_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.parent_messages(id) ON DELETE CASCADE,
  edited_by UUID NOT NULL,
  edited_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  edit_type TEXT NOT NULL, -- 'created', 'edited', 'approved', 'rejected'
  previous_body TEXT,
  new_body TEXT,
  previous_subject TEXT,
  new_subject TEXT,
  change_summary TEXT,
  metadata JSONB DEFAULT '{}'
);

-- Create message approval log for detailed approval tracking
CREATE TABLE public.message_approval_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.parent_messages(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- 'submitted', 'approved', 'rejected', 'edited', 'locked'
  performed_by UUID NOT NULL,
  performed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  role_at_action TEXT NOT NULL, -- 'teacher', 'school_admin'
  reason TEXT,
  previous_status TEXT,
  new_status TEXT,
  ip_address TEXT,
  metadata JSONB DEFAULT '{}'
);

-- Add AI-related and immutability columns to parent_messages
ALTER TABLE public.parent_messages 
ADD COLUMN IF NOT EXISTS is_ai_generated BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS ai_source_type TEXT, -- 'learning_insight', 'attendance_summary', 'support_tip'
ADD COLUMN IF NOT EXISTS ai_source_id UUID, -- Reference to the AI generation source
ADD COLUMN IF NOT EXISTS original_ai_body TEXT, -- Keep original for comparison
ADD COLUMN IF NOT EXISTS was_edited_before_approval BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS locked_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS locked_by UUID,
ADD COLUMN IF NOT EXISTS submitted_for_approval_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS submitted_for_approval_by UUID,
ADD COLUMN IF NOT EXISTS last_edited_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_edited_by UUID,
ADD COLUMN IF NOT EXISTS edit_count INTEGER DEFAULT 0;

-- Enable RLS
ALTER TABLE public.message_edit_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_approval_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for message_edit_history
CREATE POLICY "School staff can view edit history" ON public.message_edit_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.parent_messages pm
      WHERE pm.id = message_edit_history.message_id
      AND (
        public.has_school_role(auth.uid(), 'teacher'::app_role, pm.school_id) OR
        public.has_school_role(auth.uid(), 'school_admin'::app_role, pm.school_id) OR
        public.is_super_admin(auth.uid())
      )
    )
  );

CREATE POLICY "School staff can insert edit history" ON public.message_edit_history
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.parent_messages pm
      WHERE pm.id = message_edit_history.message_id
      AND (
        public.has_school_role(auth.uid(), 'teacher'::app_role, pm.school_id) OR
        public.has_school_role(auth.uid(), 'school_admin'::app_role, pm.school_id) OR
        public.is_super_admin(auth.uid())
      )
    )
  );

-- RLS Policies for message_approval_log
CREATE POLICY "School staff can view approval log" ON public.message_approval_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.parent_messages pm
      WHERE pm.id = message_approval_log.message_id
      AND (
        public.has_school_role(auth.uid(), 'teacher'::app_role, pm.school_id) OR
        public.has_school_role(auth.uid(), 'school_admin'::app_role, pm.school_id) OR
        public.is_super_admin(auth.uid())
      )
    )
  );

CREATE POLICY "School staff can insert approval log" ON public.message_approval_log
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.parent_messages pm
      WHERE pm.id = message_approval_log.message_id
      AND (
        public.has_school_role(auth.uid(), 'teacher'::app_role, pm.school_id) OR
        public.has_school_role(auth.uid(), 'school_admin'::app_role, pm.school_id) OR
        public.is_super_admin(auth.uid())
      )
    )
  );

-- Function to edit a message (with history tracking)
CREATE OR REPLACE FUNCTION public.edit_message_draft(
  p_message_id UUID,
  p_new_subject TEXT,
  p_new_body TEXT,
  p_change_summary TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_message parent_messages;
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  -- Get the message
  SELECT * INTO v_message FROM parent_messages WHERE id = p_message_id;
  
  IF v_message IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Message not found');
  END IF;
  
  -- Check if message is locked (approved)
  IF v_message.is_locked THEN
    RETURN jsonb_build_object('success', false, 'error', 'Message is locked and cannot be edited');
  END IF;
  
  -- Check if message is in editable state
  IF v_message.delivery_status NOT IN ('draft', 'pending') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Message cannot be edited in current state');
  END IF;
  
  -- Record the edit in history
  INSERT INTO message_edit_history (
    message_id, edited_by, edit_type,
    previous_subject, new_subject,
    previous_body, new_body,
    change_summary
  ) VALUES (
    p_message_id, v_user_id, 'edited',
    v_message.subject, p_new_subject,
    v_message.message_body, p_new_body,
    p_change_summary
  );
  
  -- Update the message
  UPDATE parent_messages
  SET 
    subject = COALESCE(p_new_subject, subject),
    message_body = COALESCE(p_new_body, message_body),
    last_edited_at = now(),
    last_edited_by = v_user_id,
    edit_count = edit_count + 1,
    was_edited_before_approval = CASE 
      WHEN is_ai_generated THEN true 
      ELSE was_edited_before_approval 
    END,
    updated_at = now()
  WHERE id = p_message_id;
  
  RETURN jsonb_build_object('success', true, 'message_id', p_message_id);
END;
$$;

-- Function to submit AI message for approval
CREATE OR REPLACE FUNCTION public.submit_message_for_approval(p_message_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_message parent_messages;
  v_user_id UUID;
  v_user_role TEXT;
BEGIN
  v_user_id := auth.uid();
  
  SELECT * INTO v_message FROM parent_messages WHERE id = p_message_id;
  
  IF v_message IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Message not found');
  END IF;
  
  IF v_message.delivery_status != 'draft' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only drafts can be submitted');
  END IF;
  
  -- Determine user role
  IF has_school_role(v_user_id, 'school_admin'::app_role, v_message.school_id) THEN
    v_user_role := 'school_admin';
  ELSE
    v_user_role := 'teacher';
  END IF;
  
  -- Update message status
  UPDATE parent_messages
  SET 
    delivery_status = 'pending',
    submitted_for_approval_at = now(),
    submitted_for_approval_by = v_user_id,
    updated_at = now()
  WHERE id = p_message_id;
  
  -- Log the submission
  INSERT INTO message_approval_log (
    message_id, action, performed_by, role_at_action,
    previous_status, new_status
  ) VALUES (
    p_message_id, 'submitted', v_user_id, v_user_role,
    'draft', 'pending'
  );
  
  RETURN jsonb_build_object('success', true, 'status', 'pending');
END;
$$;

-- Function to approve a message (locks it)
CREATE OR REPLACE FUNCTION public.approve_and_lock_message(
  p_message_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_message parent_messages;
  v_user_id UUID;
  v_user_role TEXT;
BEGIN
  v_user_id := auth.uid();
  
  SELECT * INTO v_message FROM parent_messages WHERE id = p_message_id;
  
  IF v_message IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Message not found');
  END IF;
  
  IF v_message.delivery_status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only pending messages can be approved');
  END IF;
  
  -- Determine user role
  IF has_school_role(v_user_id, 'school_admin'::app_role, v_message.school_id) THEN
    v_user_role := 'school_admin';
  ELSE
    v_user_role := 'teacher';
  END IF;
  
  -- Update message - lock it and set to queued
  UPDATE parent_messages
  SET 
    delivery_status = 'queued',
    approved_by = v_user_id,
    approved_at = now(),
    is_locked = true,
    locked_at = now(),
    locked_by = v_user_id,
    updated_at = now()
  WHERE id = p_message_id;
  
  -- Log the approval
  INSERT INTO message_approval_log (
    message_id, action, performed_by, role_at_action,
    previous_status, new_status, reason
  ) VALUES (
    p_message_id, 'approved', v_user_id, v_user_role,
    'pending', 'queued', p_reason
  );
  
  -- Also log the lock
  INSERT INTO message_approval_log (
    message_id, action, performed_by, role_at_action,
    reason
  ) VALUES (
    p_message_id, 'locked', v_user_id, v_user_role,
    'Message locked after approval - now immutable'
  );
  
  RETURN jsonb_build_object(
    'success', true, 
    'status', 'queued',
    'is_locked', true,
    'approved_at', now()
  );
END;
$$;

-- Function to reject a message
CREATE OR REPLACE FUNCTION public.reject_message_with_reason(
  p_message_id UUID,
  p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_message parent_messages;
  v_user_id UUID;
  v_user_role TEXT;
BEGIN
  v_user_id := auth.uid();
  
  IF p_reason IS NULL OR p_reason = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Rejection reason is required');
  END IF;
  
  SELECT * INTO v_message FROM parent_messages WHERE id = p_message_id;
  
  IF v_message IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Message not found');
  END IF;
  
  IF v_message.delivery_status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only pending messages can be rejected');
  END IF;
  
  -- Determine user role
  IF has_school_role(v_user_id, 'school_admin'::app_role, v_message.school_id) THEN
    v_user_role := 'school_admin';
  ELSE
    v_user_role := 'teacher';
  END IF;
  
  -- Update message - back to draft so it can be edited
  UPDATE parent_messages
  SET 
    delivery_status = 'draft',
    rejection_reason = p_reason,
    updated_at = now()
  WHERE id = p_message_id;
  
  -- Log the rejection
  INSERT INTO message_approval_log (
    message_id, action, performed_by, role_at_action,
    previous_status, new_status, reason
  ) VALUES (
    p_message_id, 'rejected', v_user_id, v_user_role,
    'pending', 'draft', p_reason
  );
  
  RETURN jsonb_build_object(
    'success', true, 
    'status', 'draft',
    'can_edit', true
  );
END;
$$;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_message_edit_history_message ON public.message_edit_history(message_id);
CREATE INDEX IF NOT EXISTS idx_message_approval_log_message ON public.message_approval_log(message_id);
CREATE INDEX IF NOT EXISTS idx_parent_messages_ai_generated ON public.parent_messages(school_id, is_ai_generated) WHERE is_ai_generated = true;
CREATE INDEX IF NOT EXISTS idx_parent_messages_pending ON public.parent_messages(school_id) WHERE delivery_status = 'pending';
