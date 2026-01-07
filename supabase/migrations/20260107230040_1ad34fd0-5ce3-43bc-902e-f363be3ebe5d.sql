-- PART 1: Super Admin Role (hard separation from schools)
CREATE TABLE public.super_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  email TEXT NOT NULL,
  name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID, -- another super admin who created this one
  notes TEXT
);

-- Security definer function to check super admin status
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.super_admins
    WHERE user_id = _user_id AND is_active = true
  )
$$;

-- RLS for super_admins (only super admins can view)
ALTER TABLE public.super_admins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can view super_admins"
ON public.super_admins FOR SELECT
USING (public.is_super_admin(auth.uid()));

-- No INSERT/UPDATE/DELETE via RLS - must be done via direct DB access

-- PART 2: Plans Table (Stripe-ready)
CREATE TABLE public.plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  features JSONB NOT NULL DEFAULT '{}',
  ai_limits JSONB NOT NULL DEFAULT '{}',
  max_students INTEGER,
  max_teachers INTEGER,
  stripe_price_id TEXT, -- nullable for future Stripe integration
  stripe_product_id TEXT, -- nullable for future Stripe integration
  price_monthly DECIMAL(10,2),
  price_annual DECIMAL(10,2),
  currency TEXT DEFAULT 'USD',
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active plans"
ON public.plans FOR SELECT
USING (is_active = true OR public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can manage plans"
ON public.plans FOR ALL
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

-- Insert default plans
INSERT INTO public.plans (name, display_name, description, features, ai_limits, max_students, max_teachers, sort_order) VALUES
('free', 'Free', 'Basic access for small schools', 
  '{"upload_analysis": false, "ai_insights": false, "parent_insights": false, "learning_paths": false, "adaptive_support": false}'::jsonb,
  '{"uploads_analyzed": 0, "ai_generations": 0, "parent_insights": 0, "adaptive_support_plans": 0}'::jsonb,
  50, 3, 0),
('starter', 'Starter', 'Essential features for growing schools',
  '{"upload_analysis": true, "ai_insights": true, "parent_insights": false, "learning_paths": false, "adaptive_support": false}'::jsonb,
  '{"uploads_analyzed": 30, "ai_generations": 100, "parent_insights": 0, "adaptive_support_plans": 0}'::jsonb,
  150, 10, 1),
('pro', 'Pro', 'Full AI-powered features',
  '{"upload_analysis": true, "ai_insights": true, "parent_insights": true, "learning_paths": true, "adaptive_support": true}'::jsonb,
  '{"uploads_analyzed": 200, "ai_generations": 500, "parent_insights": 100, "adaptive_support_plans": 50}'::jsonb,
  500, 30, 2),
('enterprise', 'Enterprise', 'Unlimited access with priority support',
  '{"upload_analysis": true, "ai_insights": true, "parent_insights": true, "learning_paths": true, "adaptive_support": true, "priority_support": true, "custom_integrations": true}'::jsonb,
  '{"uploads_analyzed": -1, "ai_generations": -1, "parent_insights": -1, "adaptive_support_plans": -1}'::jsonb,
  NULL, NULL, 3);

-- PART 2b: School Subscriptions (manual activation)
CREATE TYPE public.subscription_status AS ENUM ('active', 'suspended', 'expired', 'pending');

CREATE TABLE public.school_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.plans(id),
  status subscription_status NOT NULL DEFAULT 'pending',
  activated_by UUID REFERENCES public.super_admins(id),
  activated_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  suspended_at TIMESTAMPTZ,
  suspended_by UUID REFERENCES public.super_admins(id),
  suspension_reason TEXT,
  notes TEXT,
  stripe_subscription_id TEXT, -- nullable for future Stripe
  stripe_customer_id TEXT, -- nullable for future Stripe
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(school_id)
);

ALTER TABLE public.school_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Schools can view own subscription"
ON public.school_subscriptions FOR SELECT
USING (true); -- Will be refined with proper auth

CREATE POLICY "Super admins can manage subscriptions"
ON public.school_subscriptions FOR ALL
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

-- PART 5: Billing Events (manual, Stripe-ready)
CREATE TYPE public.billing_event_type AS ENUM (
  'manual_activation', 
  'plan_change', 
  'extension', 
  'credit', 
  'suspension',
  'reinstatement',
  'downgrade',
  'stripe_payment', -- future
  'stripe_refund'   -- future
);

CREATE TABLE public.billing_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  event_type billing_event_type NOT NULL,
  plan_id UUID REFERENCES public.plans(id),
  previous_plan_id UUID REFERENCES public.plans(id),
  amount DECIMAL(10,2),
  currency TEXT DEFAULT 'USD',
  stripe_payment_intent_id TEXT, -- nullable for future
  stripe_invoice_id TEXT, -- nullable for future
  notes TEXT,
  created_by UUID REFERENCES public.super_admins(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.billing_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can view billing events"
ON public.billing_events FOR SELECT
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can create billing events"
ON public.billing_events FOR INSERT
WITH CHECK (public.is_super_admin(auth.uid()));

-- PART 6: AI Governance Controls
CREATE TABLE public.platform_ai_controls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ai_globally_enabled BOOLEAN NOT NULL DEFAULT true,
  kill_switch_active BOOLEAN NOT NULL DEFAULT false,
  kill_switch_activated_at TIMESTAMPTZ,
  kill_switch_activated_by UUID REFERENCES public.super_admins(id),
  kill_switch_reason TEXT,
  feature_toggles JSONB NOT NULL DEFAULT '{
    "upload_analysis": true,
    "teaching_suggestions": true,
    "learning_paths": true,
    "adaptive_support": true,
    "parent_insights": true,
    "practice_generation": true
  }'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES public.super_admins(id)
);

ALTER TABLE public.platform_ai_controls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view AI controls"
ON public.platform_ai_controls FOR SELECT
USING (true);

CREATE POLICY "Super admins can update AI controls"
ON public.platform_ai_controls FOR UPDATE
USING (public.is_super_admin(auth.uid()));

-- Insert default AI controls
INSERT INTO public.platform_ai_controls (id) VALUES (gen_random_uuid());

-- PART 7: Platform Audit Logs (immutable)
CREATE TYPE public.platform_audit_action AS ENUM (
  'plan_activated',
  'plan_changed',
  'school_suspended',
  'school_reinstated',
  'subscription_extended',
  'ai_toggle_changed',
  'ai_kill_switch_activated',
  'ai_kill_switch_deactivated',
  'super_admin_action',
  'override_applied',
  'school_archived'
);

CREATE TABLE public.platform_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action platform_audit_action NOT NULL,
  actor_id UUID NOT NULL REFERENCES public.super_admins(id),
  target_school_id UUID REFERENCES public.schools(id),
  target_subscription_id UUID REFERENCES public.school_subscriptions(id),
  previous_state JSONB,
  new_state JSONB,
  reason TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- No UPDATE or DELETE policies - logs are immutable
ALTER TABLE public.platform_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can view audit logs"
ON public.platform_audit_logs FOR SELECT
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can create audit logs"
ON public.platform_audit_logs FOR INSERT
WITH CHECK (public.is_super_admin(auth.uid()));

-- Add archived flag to schools (no deletion allowed)
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS archived_by UUID;

-- Create indexes for performance
CREATE INDEX idx_school_subscriptions_school ON public.school_subscriptions(school_id);
CREATE INDEX idx_school_subscriptions_status ON public.school_subscriptions(status);
CREATE INDEX idx_billing_events_school ON public.billing_events(school_id);
CREATE INDEX idx_platform_audit_logs_action ON public.platform_audit_logs(action);
CREATE INDEX idx_platform_audit_logs_school ON public.platform_audit_logs(target_school_id);
CREATE INDEX idx_platform_audit_logs_created ON public.platform_audit_logs(created_at DESC);

-- Trigger to update updated_at
CREATE TRIGGER update_plans_updated_at
  BEFORE UPDATE ON public.plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_school_subscriptions_updated_at
  BEFORE UPDATE ON public.school_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_platform_ai_controls_updated_at
  BEFORE UPDATE ON public.platform_ai_controls
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();