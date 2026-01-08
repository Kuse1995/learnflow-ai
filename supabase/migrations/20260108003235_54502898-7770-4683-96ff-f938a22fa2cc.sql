-- Add channel preference and opt-out fields to parent_contacts
ALTER TABLE public.parent_contacts 
ADD COLUMN IF NOT EXISTS preferred_channel text DEFAULT 'whatsapp' CHECK (preferred_channel IN ('whatsapp', 'sms', 'email', 'none')),
ADD COLUMN IF NOT EXISTS global_opt_out boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS opt_out_reason text,
ADD COLUMN IF NOT EXISTS opt_out_at timestamptz,
ADD COLUMN IF NOT EXISTS preferences_updated_by uuid,
ADD COLUMN IF NOT EXISTS preferences_updated_at timestamptz,
ADD COLUMN IF NOT EXISTS quiet_hours_start integer DEFAULT 18 CHECK (quiet_hours_start >= 0 AND quiet_hours_start <= 23),
ADD COLUMN IF NOT EXISTS quiet_hours_end integer DEFAULT 8 CHECK (quiet_hours_end >= 0 AND quiet_hours_end <= 23),
ADD COLUMN IF NOT EXISTS max_messages_per_week integer DEFAULT 5;

-- Create parent_preference_history table for audit trail
CREATE TABLE IF NOT EXISTS public.parent_preference_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_contact_id uuid NOT NULL REFERENCES public.parent_contacts(id) ON DELETE CASCADE,
  changed_by uuid,
  changed_by_role text NOT NULL, -- 'parent', 'teacher', 'admin'
  change_type text NOT NULL, -- 'channel_change', 'opt_out', 'opt_in', 'category_change'
  previous_value jsonb,
  new_value jsonb,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.parent_preference_history ENABLE ROW LEVEL SECURITY;

-- RLS policies for preference history
CREATE POLICY "School admins can view preference history"
ON public.parent_preference_history
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM parent_contacts pc
    JOIN students s ON pc.student_id = s.id
    JOIN classes c ON s.class_id = c.id
    WHERE pc.id = parent_contact_id
    AND public.is_school_admin(auth.uid(), c.school_id)
  )
);

CREATE POLICY "Teachers can view preference history for their students"
ON public.parent_preference_history
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM parent_contacts pc
    JOIN students s ON pc.student_id = s.id
    JOIN classes c ON s.class_id = c.id
    WHERE pc.id = parent_contact_id
    AND c.teacher_id = auth.uid()
  )
);

-- Function to log preference changes
CREATE OR REPLACE FUNCTION public.log_preference_change(
  p_parent_contact_id uuid,
  p_changed_by uuid,
  p_changed_by_role text,
  p_change_type text,
  p_previous_value jsonb,
  p_new_value jsonb,
  p_reason text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO parent_preference_history (
    parent_contact_id, changed_by, changed_by_role, 
    change_type, previous_value, new_value, reason
  ) VALUES (
    p_parent_contact_id, p_changed_by, p_changed_by_role,
    p_change_type, p_previous_value, p_new_value, p_reason
  )
  RETURNING id INTO v_id;
  
  -- Update preferences_updated_by and preferences_updated_at
  UPDATE parent_contacts
  SET preferences_updated_by = p_changed_by,
      preferences_updated_at = now()
  WHERE id = p_parent_contact_id;
  
  RETURN v_id;
END;
$$;

-- Function to check if message can be sent based on preferences
CREATE OR REPLACE FUNCTION public.can_send_to_parent(
  p_parent_contact_id uuid,
  p_category message_category,
  p_is_emergency boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contact parent_contacts;
  v_result jsonb;
BEGIN
  SELECT * INTO v_contact FROM parent_contacts WHERE id = p_parent_contact_id;
  
  IF v_contact IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'contact_not_found');
  END IF;
  
  -- Emergency notices ALWAYS override opt-out
  IF p_is_emergency OR p_category = 'emergency_notice' THEN
    -- Find any available channel
    IF v_contact.sms_number IS NOT NULL THEN
      RETURN jsonb_build_object('allowed', true, 'channel', 'sms', 'emergency_override', true);
    ELSIF v_contact.whatsapp_number IS NOT NULL THEN
      RETURN jsonb_build_object('allowed', true, 'channel', 'whatsapp', 'emergency_override', true);
    ELSIF v_contact.email IS NOT NULL THEN
      RETURN jsonb_build_object('allowed', true, 'channel', 'email', 'emergency_override', true);
    ELSE
      RETURN jsonb_build_object('allowed', false, 'reason', 'no_channel_available');
    END IF;
  END IF;
  
  -- Check global opt-out
  IF v_contact.global_opt_out THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'global_opt_out');
  END IF;
  
  -- Check preferred channel is 'none'
  IF v_contact.preferred_channel = 'none' THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'no_channel_preferred');
  END IF;
  
  -- Check category-specific preferences
  CASE p_category
    WHEN 'learning_update' THEN
      IF NOT COALESCE(v_contact.receives_learning_updates, true) THEN
        RETURN jsonb_build_object('allowed', false, 'reason', 'category_opt_out');
      END IF;
    WHEN 'attendance_notice' THEN
      IF NOT COALESCE(v_contact.receives_attendance_notices, true) THEN
        RETURN jsonb_build_object('allowed', false, 'reason', 'category_opt_out');
      END IF;
    WHEN 'fee_status' THEN
      IF NOT COALESCE(v_contact.receives_fee_updates, false) THEN
        RETURN jsonb_build_object('allowed', false, 'reason', 'category_opt_out');
      END IF;
    WHEN 'school_announcement' THEN
      IF NOT COALESCE(v_contact.receives_announcements, true) THEN
        RETURN jsonb_build_object('allowed', false, 'reason', 'category_opt_out');
      END IF;
    ELSE
      NULL;
  END CASE;
  
  -- Determine channel to use
  CASE v_contact.preferred_channel
    WHEN 'whatsapp' THEN
      IF v_contact.whatsapp_number IS NOT NULL THEN
        RETURN jsonb_build_object('allowed', true, 'channel', 'whatsapp');
      ELSIF v_contact.sms_number IS NOT NULL THEN
        RETURN jsonb_build_object('allowed', true, 'channel', 'sms', 'fallback', true);
      ELSE
        RETURN jsonb_build_object('allowed', false, 'reason', 'preferred_channel_unavailable');
      END IF;
    WHEN 'sms' THEN
      IF v_contact.sms_number IS NOT NULL THEN
        RETURN jsonb_build_object('allowed', true, 'channel', 'sms');
      ELSE
        RETURN jsonb_build_object('allowed', false, 'reason', 'preferred_channel_unavailable');
      END IF;
    WHEN 'email' THEN
      IF v_contact.email IS NOT NULL THEN
        RETURN jsonb_build_object('allowed', true, 'channel', 'email');
      ELSE
        RETURN jsonb_build_object('allowed', false, 'reason', 'preferred_channel_unavailable');
      END IF;
    ELSE
      RETURN jsonb_build_object('allowed', false, 'reason', 'no_channel_configured');
  END CASE;
END;
$$;