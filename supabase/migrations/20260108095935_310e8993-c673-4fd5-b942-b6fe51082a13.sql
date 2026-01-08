-- Add is_demo column to uploads for demo isolation
ALTER TABLE public.uploads ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;

-- Add is_demo column to upload_analyses for demo isolation
ALTER TABLE public.upload_analyses ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;

-- Add is_demo column to student_learning_profiles for demo isolation
ALTER TABLE public.student_learning_profiles ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;

-- Create indexes for demo filtering
CREATE INDEX IF NOT EXISTS idx_uploads_is_demo ON public.uploads(is_demo);
CREATE INDEX IF NOT EXISTS idx_upload_analyses_is_demo ON public.upload_analyses(is_demo);
CREATE INDEX IF NOT EXISTS idx_learning_profiles_is_demo ON public.student_learning_profiles(is_demo);