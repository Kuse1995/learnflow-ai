-- Add billing period column to school_subscriptions
ALTER TABLE public.school_subscriptions 
ADD COLUMN IF NOT EXISTS billing_period text DEFAULT 'monthly' CHECK (billing_period IN ('monthly', 'termly', 'annual'));