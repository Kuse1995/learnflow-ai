
-- Create tone enum for reminder templates
CREATE TYPE public.reminder_tone AS ENUM ('gentle', 'neutral', 'informative');

-- Create delivery method enum
CREATE TYPE public.reminder_delivery_method AS ENUM ('in_person', 'phone_call', 'printed_notice', 'whatsapp_manual');

-- Fee reminder templates table
CREATE TABLE public.fee_reminder_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message_body TEXT NOT NULL,
  tone reminder_tone NOT NULL DEFAULT 'gentle',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID
);

-- Fee reminder logs table (immutable once created)
CREATE TABLE public.fee_reminder_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  class_id UUID REFERENCES public.classes(id),
  ledger_balance_snapshot NUMERIC(12,2) NOT NULL,
  template_id UUID REFERENCES public.fee_reminder_templates(id),
  custom_message TEXT,
  final_message TEXT NOT NULL,
  sent_via reminder_delivery_method NOT NULL,
  sent_by UUID,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  academic_year INTEGER NOT NULL,
  term INTEGER,
  student_name_snapshot TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.fee_reminder_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_reminder_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for templates
CREATE POLICY "Users can view active templates for their school"
ON public.fee_reminder_templates
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage templates"
ON public.fee_reminder_templates
FOR ALL
USING (true);

-- RLS policies for reminder logs
CREATE POLICY "Staff can view reminder logs"
ON public.fee_reminder_logs
FOR SELECT
USING (true);

CREATE POLICY "Staff can create reminder logs"
ON public.fee_reminder_logs
FOR INSERT
WITH CHECK (true);

-- Indexes for performance
CREATE INDEX idx_fee_reminder_templates_school ON public.fee_reminder_templates(school_id);
CREATE INDEX idx_fee_reminder_templates_active ON public.fee_reminder_templates(is_active);
CREATE INDEX idx_fee_reminder_logs_student ON public.fee_reminder_logs(student_id);
CREATE INDEX idx_fee_reminder_logs_school ON public.fee_reminder_logs(school_id);
CREATE INDEX idx_fee_reminder_logs_sent_at ON public.fee_reminder_logs(sent_at DESC);

-- Insert default gentle templates
INSERT INTO public.fee_reminder_templates (school_id, title, message_body, tone)
SELECT id, 'Gentle Term Reminder', 
'Dear Parent/Guardian,

This is a gentle reminder regarding school fees for {term}. Our records show that {student_name} has an outstanding balance of {balance}.

Please feel free to contact the school office if you have any questions or would like to discuss payment arrangements.

Thank you for your continued support.

Warm regards,
School Administration', 
'gentle'
FROM public.schools;

INSERT INTO public.fee_reminder_templates (school_id, title, message_body, tone)
SELECT id, 'Balance Information Notice', 
'Dear Parent/Guardian,

We hope this message finds you well.

Kindly note that the current fee balance for {student_name} reflects {balance} for {term}.

Should you require any clarification or wish to discuss this matter, please do not hesitate to reach out to us.

Best regards,
School Administration', 
'neutral'
FROM public.schools;

INSERT INTO public.fee_reminder_templates (school_id, title, message_body, tone)
SELECT id, 'Fee Status Update', 
'Dear Parent/Guardian,

For your information, the fee records for {student_name} currently show a balance of {balance} for {term}.

If you have recently made a payment that may not yet be reflected, please bring your receipt to the school office for verification.

Thank you.

School Administration', 
'informative'
FROM public.schools;
