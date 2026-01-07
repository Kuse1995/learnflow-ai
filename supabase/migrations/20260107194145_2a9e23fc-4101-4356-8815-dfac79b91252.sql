-- Create uploads table for tests, homework, assignments
CREATE TABLE public.uploads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  topic TEXT NOT NULL,
  date DATE NOT NULL,
  upload_type TEXT NOT NULL CHECK (upload_type IN ('test', 'homework', 'worksheet')),
  marking_scheme TEXT,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  uploaded_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.uploads ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Authenticated users can view uploads"
ON public.uploads
FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can manage uploads"
ON public.uploads
FOR ALL
USING (true)
WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_uploads_updated_at
BEFORE UPDATE ON public.uploads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('uploads', 'uploads', true, 10485760);

-- Storage policies
CREATE POLICY "Anyone can view uploads"
ON storage.objects
FOR SELECT
USING (bucket_id = 'uploads');

CREATE POLICY "Authenticated users can upload files"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'uploads');

CREATE POLICY "Authenticated users can update files"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'uploads');

CREATE POLICY "Authenticated users can delete files"
ON storage.objects
FOR DELETE
USING (bucket_id = 'uploads');