-- Add termly price column to plans table
ALTER TABLE public.plans 
ADD COLUMN IF NOT EXISTS price_termly numeric(10,2) DEFAULT NULL;