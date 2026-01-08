-- Parent communication system: Offline-aware, Zambia-ready
-- Core principle: Respectful, non-pressuring, graceful fallbacks

-- Message categories enum
CREATE TYPE public.message_category AS ENUM (
  'learning_update',
  'attendance_notice',
  'fee_status',
  'school_announcement',
  'emergency_notice'
);

-- Delivery channel enum (priority order)
CREATE TYPE public.delivery_channel AS ENUM (
  'whatsapp',
  'sms',
  'email'
);

-- Delivery status enum
CREATE TYPE public.delivery_status AS ENUM (
  'pending',
  'queued',
  'sent',
  'delivered',
  'failed',
  'no_channel'
);

-- Parent contact preferences (what channels are available)
CREATE TABLE public.parent_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  parent_name TEXT NOT NULL,
  relationship TEXT, -- mother, father, guardian, etc.
  whatsapp_number TEXT, -- Primary channel
  sms_number TEXT, -- Secondary channel
  email TEXT, -- Optional channel
  preferred_language TEXT DEFAULT 'en',
  receives_learning_updates BOOLEAN DEFAULT true,
  receives_attendance_notices BOOLEAN DEFAULT true,
  receives_fee_updates BOOLEAN DEFAULT false, -- Opt-in only
  receives_announcements BOOLEAN DEFAULT true,
  receives_emergency BOOLEAN DEFAULT true, -- Always on by default
  last_successful_contact_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Communication rules table (configurable per school)
CREATE TABLE public.communication_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  category message_category NOT NULL,
  requires_approval BOOLEAN NOT NULL DEFAULT false,
  max_messages_per_week INTEGER DEFAULT 2, -- Prevent over-messaging
  allowed_send_hours_start INTEGER DEFAULT 8, -- 8 AM
  allowed_send_hours_end INTEGER DEFAULT 18, -- 6 PM
  priority_level INTEGER NOT NULL DEFAULT 2, -- 1=low, 2=normal, 3=high, 4=emergency
  retry_attempts INTEGER DEFAULT 1, -- Low retry to avoid pressure
  retry_delay_hours INTEGER DEFAULT 24, -- Wait before retry
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(school_id, category)
);

-- Message templates (pre-approved, respectful language)
CREATE TABLE public.message_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  category message_category NOT NULL,
  template_name TEXT NOT NULL,
  template_body TEXT NOT NULL, -- Use {{student_name}}, {{class_name}} placeholders
  is_active BOOLEAN DEFAULT true,
  requires_teacher_approval BOOLEAN DEFAULT false,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Parent messages (the actual communications)
CREATE TABLE public.parent_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  parent_contact_id UUID NOT NULL REFERENCES public.parent_contacts(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  category message_category NOT NULL,
  subject TEXT, -- Brief subject for internal reference
  message_body TEXT NOT NULL, -- The actual message content
  priority_level INTEGER NOT NULL DEFAULT 2,
  
  -- Approval workflow
  requires_approval BOOLEAN DEFAULT false,
  approved_by UUID, -- Teacher who approved
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  
  -- Delivery tracking (graceful, non-aggressive)
  attempted_channel delivery_channel,
  delivery_status delivery_status NOT NULL DEFAULT 'pending',
  first_attempt_at TIMESTAMPTZ,
  last_attempt_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  retry_count INTEGER DEFAULT 0,
  
  -- Fallback tracking
  whatsapp_attempted BOOLEAN DEFAULT false,
  whatsapp_failed_at TIMESTAMPTZ,
  sms_attempted BOOLEAN DEFAULT false,
  sms_failed_at TIMESTAMPTZ,
  email_attempted BOOLEAN DEFAULT false,
  email_failed_at TIMESTAMPTZ,
  
  -- Internal notes (never shown to parents)
  internal_notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Message queue for offline-aware delivery
CREATE TABLE public.message_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.parent_messages(id) ON DELETE CASCADE,
  channel delivery_channel NOT NULL,
  scheduled_for TIMESTAMPTZ NOT NULL DEFAULT now(),
  priority_level INTEGER NOT NULL DEFAULT 2,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 2, -- Low to avoid pressure
  last_error TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.parent_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_queue ENABLE ROW LEVEL SECURITY;

-- RLS Policies for parent_contacts
CREATE POLICY "Teachers can view parent contacts for their students"
  ON public.parent_contacts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.students s
      JOIN public.classes c ON s.class_id = c.id
      WHERE s.id = parent_contacts.student_id
      AND c.teacher_id = auth.uid()
    )
  );

CREATE POLICY "School admins can manage parent contacts"
  ON public.parent_contacts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.students s
      JOIN public.classes c ON s.class_id = c.id
      WHERE s.id = parent_contacts.student_id
      AND public.is_school_admin(auth.uid(), c.school_id)
    )
  );

-- RLS Policies for communication_rules
CREATE POLICY "School admins can manage communication rules"
  ON public.communication_rules FOR ALL
  USING (public.is_school_admin(auth.uid(), school_id));

CREATE POLICY "Teachers can view communication rules for their school"
  ON public.communication_rules FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.classes c
      WHERE c.school_id = communication_rules.school_id
      AND c.teacher_id = auth.uid()
    )
  );

-- RLS Policies for message_templates
CREATE POLICY "School admins can manage message templates"
  ON public.message_templates FOR ALL
  USING (public.is_school_admin(auth.uid(), school_id));

CREATE POLICY "Teachers can view message templates"
  ON public.message_templates FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.classes c
      WHERE c.school_id = message_templates.school_id
      AND c.teacher_id = auth.uid()
    )
  );

-- RLS Policies for parent_messages
CREATE POLICY "Teachers can manage messages for their students"
  ON public.parent_messages FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.students s
      JOIN public.classes c ON s.class_id = c.id
      WHERE s.id = parent_messages.student_id
      AND c.teacher_id = auth.uid()
    )
  );

CREATE POLICY "School admins can view all school messages"
  ON public.parent_messages FOR SELECT
  USING (public.is_school_admin(auth.uid(), school_id));

-- RLS Policies for message_queue
CREATE POLICY "School admins can view message queue"
  ON public.message_queue FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.parent_messages pm
      WHERE pm.id = message_queue.message_id
      AND public.is_school_admin(auth.uid(), pm.school_id)
    )
  );

-- Insert default communication rules function
CREATE OR REPLACE FUNCTION public.initialize_communication_rules(p_school_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Learning updates: Normal priority, teacher approval for sensitive content
  INSERT INTO communication_rules (school_id, category, requires_approval, max_messages_per_week, priority_level)
  VALUES (p_school_id, 'learning_update', true, 2, 2)
  ON CONFLICT (school_id, category) DO NOTHING;
  
  -- Attendance notices: Low priority, informational only
  INSERT INTO communication_rules (school_id, category, requires_approval, max_messages_per_week, priority_level)
  VALUES (p_school_id, 'attendance_notice', false, 3, 1)
  ON CONFLICT (school_id, category) DO NOTHING;
  
  -- Fee status: Requires approval, very limited, opt-in only
  INSERT INTO communication_rules (school_id, category, requires_approval, max_messages_per_week, priority_level)
  VALUES (p_school_id, 'fee_status', true, 1, 1)
  ON CONFLICT (school_id, category) DO NOTHING;
  
  -- Announcements: Normal priority
  INSERT INTO communication_rules (school_id, category, requires_approval, max_messages_per_week, priority_level)
  VALUES (p_school_id, 'school_announcement', false, 2, 2)
  ON CONFLICT (school_id, category) DO NOTHING;
  
  -- Emergency: High priority, immediate
  INSERT INTO communication_rules (school_id, category, requires_approval, max_messages_per_week, priority_level)
  VALUES (p_school_id, 'emergency_notice', false, 10, 4)
  ON CONFLICT (school_id, category) DO NOTHING;
END;
$$;

-- Function to get next available channel for a parent
CREATE OR REPLACE FUNCTION public.get_parent_delivery_channel(p_parent_contact_id UUID)
RETURNS delivery_channel
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
AS $$
DECLARE
  v_contact parent_contacts;
BEGIN
  SELECT * INTO v_contact FROM parent_contacts WHERE id = p_parent_contact_id;
  
  -- Priority: WhatsApp > SMS > Email
  IF v_contact.whatsapp_number IS NOT NULL AND v_contact.whatsapp_number != '' THEN
    RETURN 'whatsapp';
  ELSIF v_contact.sms_number IS NOT NULL AND v_contact.sms_number != '' THEN
    RETURN 'sms';
  ELSIF v_contact.email IS NOT NULL AND v_contact.email != '' THEN
    RETURN 'email';
  ELSE
    RETURN NULL;
  END IF;
END;
$$;

-- Trigger to update updated_at
CREATE TRIGGER update_parent_contacts_updated_at
  BEFORE UPDATE ON public.parent_contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_communication_rules_updated_at
  BEFORE UPDATE ON public.communication_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_message_templates_updated_at
  BEFORE UPDATE ON public.message_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_parent_messages_updated_at
  BEFORE UPDATE ON public.parent_messages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();