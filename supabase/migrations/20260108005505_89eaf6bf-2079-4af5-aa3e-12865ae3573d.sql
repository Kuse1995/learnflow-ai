
-- Create message templates table (skip if exists)
CREATE TABLE IF NOT EXISTS public.message_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  category message_category NOT NULL,
  template_name TEXT NOT NULL,
  template_body TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  requires_teacher_approval BOOLEAN DEFAULT false,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create parent contacts table (skip if exists)
CREATE TABLE IF NOT EXISTS public.parent_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  parent_name TEXT NOT NULL,
  relationship TEXT,
  whatsapp_number TEXT,
  sms_number TEXT,
  email TEXT,
  preferred_channel TEXT DEFAULT 'whatsapp',
  preferred_language TEXT DEFAULT 'en',
  receives_learning_updates BOOLEAN DEFAULT true,
  receives_attendance_notices BOOLEAN DEFAULT true,
  receives_announcements BOOLEAN DEFAULT true,
  receives_fee_updates BOOLEAN DEFAULT false,
  receives_emergency BOOLEAN DEFAULT true,
  global_opt_out BOOLEAN DEFAULT false,
  opt_out_reason TEXT,
  opt_out_at TIMESTAMP WITH TIME ZONE,
  quiet_hours_start INTEGER,
  quiet_hours_end INTEGER,
  max_messages_per_week INTEGER DEFAULT 10,
  last_successful_contact_at TIMESTAMP WITH TIME ZONE,
  preferences_updated_at TIMESTAMP WITH TIME ZONE,
  preferences_updated_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create parent messages table (skip if exists)
CREATE TABLE IF NOT EXISTS public.parent_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  parent_contact_id UUID NOT NULL REFERENCES public.parent_contacts(id) ON DELETE CASCADE,
  category message_category NOT NULL,
  subject TEXT,
  message_body TEXT NOT NULL,
  priority_level INTEGER DEFAULT 2,
  delivery_status delivery_status NOT NULL DEFAULT 'draft',
  attempted_channel delivery_channel,
  first_attempt_at TIMESTAMP WITH TIME ZONE,
  last_attempt_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  retry_count INTEGER DEFAULT 0,
  whatsapp_attempted BOOLEAN DEFAULT false,
  whatsapp_failed_at TIMESTAMP WITH TIME ZONE,
  sms_attempted BOOLEAN DEFAULT false,
  sms_failed_at TIMESTAMP WITH TIME ZONE,
  email_attempted BOOLEAN DEFAULT false,
  email_failed_at TIMESTAMP WITH TIME ZONE,
  requires_approval BOOLEAN DEFAULT false,
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  created_by UUID,
  internal_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create message queue table (skip if exists)
CREATE TABLE IF NOT EXISTS public.message_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.parent_messages(id) ON DELETE CASCADE,
  channel delivery_channel NOT NULL,
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  priority_level INTEGER DEFAULT 2,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  last_error TEXT,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_queue ENABLE ROW LEVEL SECURITY;

-- RLS Policies for message_templates
DROP POLICY IF EXISTS "School staff can view templates" ON public.message_templates;
CREATE POLICY "School staff can view templates" ON public.message_templates
  FOR SELECT USING (
    public.has_school_role(auth.uid(), 'teacher'::app_role, school_id) OR
    public.has_school_role(auth.uid(), 'school_admin'::app_role, school_id) OR
    public.is_super_admin(auth.uid())
  );

DROP POLICY IF EXISTS "School admins can manage templates" ON public.message_templates;
CREATE POLICY "School admins can manage templates" ON public.message_templates
  FOR ALL USING (
    public.has_school_role(auth.uid(), 'school_admin'::app_role, school_id) OR
    public.is_super_admin(auth.uid())
  );

-- RLS Policies for parent_contacts
DROP POLICY IF EXISTS "School staff can view parent contacts" ON public.parent_contacts;
CREATE POLICY "School staff can view parent contacts" ON public.parent_contacts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.students s
      JOIN public.classes c ON s.class_id = c.id
      WHERE s.id = parent_contacts.student_id
      AND (
        public.has_school_role(auth.uid(), 'teacher'::app_role, c.school_id) OR
        public.has_school_role(auth.uid(), 'school_admin'::app_role, c.school_id) OR
        public.is_super_admin(auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "School staff can manage parent contacts" ON public.parent_contacts;
CREATE POLICY "School staff can manage parent contacts" ON public.parent_contacts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.students s
      JOIN public.classes c ON s.class_id = c.id
      WHERE s.id = parent_contacts.student_id
      AND (
        public.has_school_role(auth.uid(), 'teacher'::app_role, c.school_id) OR
        public.has_school_role(auth.uid(), 'school_admin'::app_role, c.school_id) OR
        public.is_super_admin(auth.uid())
      )
    )
  );

-- RLS Policies for parent_messages
DROP POLICY IF EXISTS "School staff can view messages" ON public.parent_messages;
CREATE POLICY "School staff can view messages" ON public.parent_messages
  FOR SELECT USING (
    public.has_school_role(auth.uid(), 'teacher'::app_role, school_id) OR
    public.has_school_role(auth.uid(), 'school_admin'::app_role, school_id) OR
    public.is_super_admin(auth.uid())
  );

DROP POLICY IF EXISTS "School staff can create messages" ON public.parent_messages;
CREATE POLICY "School staff can create messages" ON public.parent_messages
  FOR INSERT WITH CHECK (
    public.has_school_role(auth.uid(), 'teacher'::app_role, school_id) OR
    public.has_school_role(auth.uid(), 'school_admin'::app_role, school_id) OR
    public.is_super_admin(auth.uid())
  );

DROP POLICY IF EXISTS "School staff can update messages" ON public.parent_messages;
CREATE POLICY "School staff can update messages" ON public.parent_messages
  FOR UPDATE USING (
    public.has_school_role(auth.uid(), 'teacher'::app_role, school_id) OR
    public.has_school_role(auth.uid(), 'school_admin'::app_role, school_id) OR
    public.is_super_admin(auth.uid())
  );

-- RLS Policies for message_queue
DROP POLICY IF EXISTS "School staff can view queue" ON public.message_queue;
CREATE POLICY "School staff can view queue" ON public.message_queue
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.parent_messages pm
      WHERE pm.id = message_queue.message_id
      AND (
        public.has_school_role(auth.uid(), 'teacher'::app_role, pm.school_id) OR
        public.has_school_role(auth.uid(), 'school_admin'::app_role, pm.school_id) OR
        public.is_super_admin(auth.uid())
      )
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_parent_messages_school_status ON public.parent_messages(school_id, delivery_status);
CREATE INDEX IF NOT EXISTS idx_parent_messages_student ON public.parent_messages(student_id);
CREATE INDEX IF NOT EXISTS idx_parent_messages_created ON public.parent_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_message_queue_scheduled ON public.message_queue(scheduled_for) WHERE processed_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_parent_contacts_student ON public.parent_contacts(student_id);
