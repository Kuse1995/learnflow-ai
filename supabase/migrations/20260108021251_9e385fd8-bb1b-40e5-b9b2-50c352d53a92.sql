-- Create enum for fee frequency
CREATE TYPE public.fee_frequency AS ENUM ('term', 'annual', 'once_off');

-- Create enum for payment methods (manual entry)
CREATE TYPE public.payment_method AS ENUM ('cash', 'bank_deposit', 'mobile_money', 'cheque', 'other');

-- Create enum for payment status
CREATE TYPE public.payment_status AS ENUM ('pending', 'confirmed', 'cancelled', 'refunded');

-- Fee categories table
CREATE TABLE public.fee_categories (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT NOT NULL, -- e.g., 'TUITION', 'PTA', 'EXAM'
    description TEXT,
    is_mandatory BOOLEAN NOT NULL DEFAULT true,
    is_active BOOLEAN NOT NULL DEFAULT true,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(school_id, code)
);

-- Fee structures table (defines amounts per grade/term)
CREATE TABLE public.fee_structures (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES public.fee_categories(id) ON DELETE CASCADE,
    academic_year INTEGER NOT NULL, -- e.g., 2024
    term INTEGER, -- NULL for annual fees, 1-3 for term fees
    grade TEXT, -- NULL means applies to all grades
    amount DECIMAL(12, 2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'ZMW',
    frequency fee_frequency NOT NULL DEFAULT 'term',
    due_date DATE,
    late_fee_amount DECIMAL(12, 2),
    late_fee_after_days INTEGER,
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID,
    CONSTRAINT valid_term CHECK (term IS NULL OR (term >= 1 AND term <= 3)),
    CONSTRAINT positive_amount CHECK (amount >= 0)
);

-- Student fee assignments (tracks what each student owes)
CREATE TABLE public.student_fee_assignments (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    fee_structure_id UUID NOT NULL REFERENCES public.fee_structures(id) ON DELETE CASCADE,
    assigned_amount DECIMAL(12, 2) NOT NULL, -- May differ from structure (discounts, etc.)
    discount_amount DECIMAL(12, 2) DEFAULT 0,
    discount_reason TEXT,
    waived BOOLEAN NOT NULL DEFAULT false,
    waiver_reason TEXT,
    waiver_approved_by UUID,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(student_id, fee_structure_id)
);

-- Payment records (offline-first, manual entry)
CREATE TABLE public.fee_payments (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    assignment_id UUID REFERENCES public.student_fee_assignments(id),
    amount DECIMAL(12, 2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'ZMW',
    payment_method payment_method NOT NULL,
    payment_date DATE NOT NULL,
    receipt_number TEXT,
    reference_number TEXT, -- Bank ref, mobile money ID, etc.
    payer_name TEXT, -- Who made the payment
    payer_phone TEXT,
    status payment_status NOT NULL DEFAULT 'pending',
    confirmed_by UUID,
    confirmed_at TIMESTAMP WITH TIME ZONE,
    cancelled_by UUID,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    cancellation_reason TEXT,
    notes TEXT,
    -- Offline sync fields
    recorded_offline BOOLEAN NOT NULL DEFAULT false,
    offline_id TEXT, -- Local ID from offline device
    synced_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    recorded_by UUID,
    CONSTRAINT positive_payment CHECK (amount > 0)
);

-- Fee balance view helper table (materialized for offline)
CREATE TABLE public.student_fee_balances (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    academic_year INTEGER NOT NULL,
    term INTEGER,
    total_fees DECIMAL(12, 2) NOT NULL DEFAULT 0,
    total_paid DECIMAL(12, 2) NOT NULL DEFAULT 0,
    total_waived DECIMAL(12, 2) NOT NULL DEFAULT 0,
    balance DECIMAL(12, 2) NOT NULL DEFAULT 0,
    last_payment_date DATE,
    last_calculated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(student_id, academic_year, term)
);

-- Indexes for performance
CREATE INDEX idx_fee_structures_school_year ON public.fee_structures(school_id, academic_year);
CREATE INDEX idx_fee_structures_category ON public.fee_structures(category_id);
CREATE INDEX idx_fee_payments_student ON public.fee_payments(student_id);
CREATE INDEX idx_fee_payments_date ON public.fee_payments(payment_date);
CREATE INDEX idx_fee_payments_status ON public.fee_payments(status);
CREATE INDEX idx_fee_payments_offline ON public.fee_payments(recorded_offline, synced_at);
CREATE INDEX idx_student_assignments_student ON public.student_fee_assignments(student_id);
CREATE INDEX idx_student_balances_student ON public.student_fee_balances(student_id, academic_year);

-- Enable RLS
ALTER TABLE public.fee_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_fee_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_fee_balances ENABLE ROW LEVEL SECURITY;

-- RLS Policies for fee_categories (school-scoped)
CREATE POLICY "School members can view fee categories"
ON public.fee_categories FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage fee categories"
ON public.fee_categories FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- RLS Policies for fee_structures
CREATE POLICY "School members can view fee structures"
ON public.fee_structures FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage fee structures"
ON public.fee_structures FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- RLS Policies for student_fee_assignments
CREATE POLICY "School members can view fee assignments"
ON public.student_fee_assignments FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage fee assignments"
ON public.student_fee_assignments FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- RLS Policies for fee_payments
CREATE POLICY "School members can view payments"
ON public.fee_payments FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "School members can record payments"
ON public.fee_payments FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Admins can manage payments"
ON public.fee_payments FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- RLS Policies for student_fee_balances
CREATE POLICY "School members can view balances"
ON public.student_fee_balances FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "System can update balances"
ON public.student_fee_balances FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_fee_categories_updated_at
    BEFORE UPDATE ON public.fee_categories
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_fee_structures_updated_at
    BEFORE UPDATE ON public.fee_structures
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_fee_assignments_updated_at
    BEFORE UPDATE ON public.student_fee_assignments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_fee_payments_updated_at
    BEFORE UPDATE ON public.fee_payments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();