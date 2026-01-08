-- Payment plan templates for schools
CREATE TABLE payment_plan_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  installment_count INTEGER NOT NULL CHECK (installment_count >= 1 AND installment_count <= 12),
  frequency TEXT NOT NULL CHECK (frequency IN ('weekly', 'bi-weekly', 'monthly', 'custom')),
  frequency_days INTEGER, -- For custom: days between installments
  split_percentages DECIMAL[] DEFAULT NULL, -- For custom splits: [50, 25, 25]
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient lookups
CREATE INDEX idx_payment_plan_templates_school ON payment_plan_templates(school_id);
CREATE INDEX idx_payment_plan_templates_active ON payment_plan_templates(school_id, is_active);

-- RLS
ALTER TABLE payment_plan_templates ENABLE ROW LEVEL SECURITY;

-- Policy for school admins
CREATE POLICY "School admins can manage payment plan templates" ON payment_plan_templates
  FOR ALL USING (
    school_id IN (
      SELECT school_id FROM user_roles 
      WHERE user_id = auth.uid() AND role IN ('school_admin', 'bursar', 'platform_admin')
    )
  );

-- Trigger to update updated_at
CREATE TRIGGER update_payment_plan_templates_updated_at
  BEFORE UPDATE ON payment_plan_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Ensure only one default per school
CREATE UNIQUE INDEX idx_payment_plan_templates_default 
  ON payment_plan_templates(school_id) 
  WHERE is_default = true AND is_active = true;