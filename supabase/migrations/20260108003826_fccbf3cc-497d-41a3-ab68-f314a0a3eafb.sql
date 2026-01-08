-- Drop if exists from previous failed attempt
DROP TABLE IF EXISTS public.guardian_phone_registry CASCADE;
DROP TABLE IF EXISTS public.guardian_student_links CASCADE;
DROP TABLE IF EXISTS public.guardians CASCADE;
DROP TYPE IF EXISTS public.guardian_role CASCADE;

-- Guardian relationship types
CREATE TYPE public.guardian_role AS ENUM (
  'primary_guardian',
  'secondary_guardian',
  'informational_contact'
);

-- Guardians table
CREATE TABLE public.guardians (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name text NOT NULL,
  internal_id text UNIQUE,
  primary_phone text,
  secondary_phone text,
  email text,
  whatsapp_number text,
  user_id uuid,
  has_account boolean DEFAULT false,
  preferred_language text DEFAULT 'en',
  notes text,
  school_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  deleted_at timestamptz,
  deleted_by uuid
);

ALTER TABLE public.guardians ADD CONSTRAINT guardians_school_fk 
  FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE CASCADE;

CREATE INDEX idx_guardians_phone ON public.guardians(primary_phone) WHERE deleted_at IS NULL;
CREATE INDEX idx_guardians_school ON public.guardians(school_id) WHERE deleted_at IS NULL;

-- Guardian-Student links
CREATE TABLE public.guardian_student_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guardian_id uuid NOT NULL,
  student_id uuid NOT NULL,
  role guardian_role NOT NULL DEFAULT 'secondary_guardian',
  relationship_label text,
  can_pickup boolean DEFAULT false,
  can_make_decisions boolean DEFAULT false,
  can_receive_reports boolean DEFAULT true,
  can_receive_emergency boolean DEFAULT true,
  receives_all_communications boolean DEFAULT true,
  contact_priority integer DEFAULT 1,
  verified_at timestamptz,
  verified_by uuid,
  verification_method text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  link_reason text,
  CONSTRAINT guardian_links_guardian_fk FOREIGN KEY (guardian_id) REFERENCES public.guardians(id) ON DELETE CASCADE,
  CONSTRAINT guardian_links_student_fk FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE,
  CONSTRAINT guardian_student_unique UNIQUE(guardian_id, student_id)
);

CREATE INDEX idx_guardian_links_student ON public.guardian_student_links(student_id);
CREATE INDEX idx_guardian_links_guardian ON public.guardian_student_links(guardian_id);

-- Phone registry
CREATE TABLE public.guardian_phone_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number text NOT NULL,
  guardian_id uuid NOT NULL,
  phone_type text NOT NULL DEFAULT 'primary',
  is_shared boolean DEFAULT false,
  shared_with_guardian_ids uuid[],
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT phone_registry_guardian_fk FOREIGN KEY (guardian_id) REFERENCES public.guardians(id) ON DELETE CASCADE,
  CONSTRAINT phone_registry_unique UNIQUE(phone_number, guardian_id, phone_type)
);

CREATE INDEX idx_phone_registry_number ON public.guardian_phone_registry(phone_number);

-- Enable RLS
ALTER TABLE public.guardians ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guardian_student_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guardian_phone_registry ENABLE ROW LEVEL SECURITY;

-- Guardians policies
CREATE POLICY "admins_manage_guardians" ON public.guardians FOR ALL TO authenticated
USING (school_id IN (SELECT ur.school_id FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'school_admin'))
WITH CHECK (school_id IN (SELECT ur.school_id FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'school_admin'));

CREATE POLICY "teachers_view_guardians" ON public.guardians FOR SELECT TO authenticated
USING (
  id IN (
    SELECT gsl.guardian_id FROM guardian_student_links gsl
    JOIN students s ON gsl.student_id = s.id
    JOIN classes c ON s.class_id = c.id
    WHERE c.teacher_id = auth.uid()
  )
);

-- Links policies
CREATE POLICY "admins_manage_links" ON public.guardian_student_links FOR ALL TO authenticated
USING (
  student_id IN (
    SELECT s.id FROM students s
    JOIN classes c ON s.class_id = c.id
    JOIN user_roles ur ON c.school_id = ur.school_id
    WHERE ur.user_id = auth.uid() AND ur.role = 'school_admin'
  )
);

CREATE POLICY "teachers_view_links" ON public.guardian_student_links FOR SELECT TO authenticated
USING (
  student_id IN (
    SELECT s.id FROM students s
    JOIN classes c ON s.class_id = c.id
    WHERE c.teacher_id = auth.uid()
  )
);

CREATE POLICY "teachers_create_links" ON public.guardian_student_links FOR INSERT TO authenticated
WITH CHECK (
  student_id IN (
    SELECT s.id FROM students s
    JOIN classes c ON s.class_id = c.id
    WHERE c.teacher_id = auth.uid()
  )
);

-- Phone registry policy
CREATE POLICY "admins_manage_phones" ON public.guardian_phone_registry FOR ALL TO authenticated
USING (
  guardian_id IN (
    SELECT g.id FROM guardians g
    JOIN user_roles ur ON g.school_id = ur.school_id
    WHERE ur.user_id = auth.uid() AND ur.role = 'school_admin'
  )
);

-- Trigger for default rights
CREATE OR REPLACE FUNCTION public.set_guardian_link_defaults()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.role = 'primary_guardian' THEN
    NEW.can_pickup := COALESCE(NEW.can_pickup, true);
    NEW.can_make_decisions := COALESCE(NEW.can_make_decisions, true);
    NEW.contact_priority := COALESCE(NEW.contact_priority, 1);
  ELSIF NEW.role = 'secondary_guardian' THEN
    NEW.can_pickup := COALESCE(NEW.can_pickup, false);
    NEW.can_make_decisions := COALESCE(NEW.can_make_decisions, false);
    NEW.contact_priority := COALESCE(NEW.contact_priority, 2);
  ELSIF NEW.role = 'informational_contact' THEN
    NEW.can_pickup := false;
    NEW.can_make_decisions := false;
    NEW.receives_all_communications := false;
    NEW.contact_priority := COALESCE(NEW.contact_priority, 99);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_guardian_link_defaults_trigger
BEFORE INSERT ON public.guardian_student_links
FOR EACH ROW EXECUTE FUNCTION public.set_guardian_link_defaults();