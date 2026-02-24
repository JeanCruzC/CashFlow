-- Create financial profile table
CREATE TABLE IF NOT EXISTS public.org_financial_profile (
    org_id UUID PRIMARY KEY REFERENCES public.orgs(id) ON DELETE CASCADE,
    monthly_income_net NUMERIC(14,2) NOT NULL DEFAULT 0,
    additional_income NUMERIC(14,2) NOT NULL DEFAULT 0,
    partner_contribution NUMERIC(14,2) NOT NULL DEFAULT 0,
    consolidated_income NUMERIC(14,2) GENERATED ALWAYS AS (
        monthly_income_net + additional_income + partner_contribution
    ) STORED,
    distribution_rule VARCHAR(20) NOT NULL DEFAULT '50_30_20',
    needs_pct NUMERIC(5,2) NOT NULL DEFAULT 50,
    wants_pct NUMERIC(5,2) NOT NULL DEFAULT 30,
    savings_pct NUMERIC(5,2) NOT NULL DEFAULT 20,
    debt_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
    savings_priorities TEXT[] NOT NULL DEFAULT ARRAY['fixed_expenses', 'debt_payments', 'savings_goals'],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for org_financial_profile
ALTER TABLE public.org_financial_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their org financial profile" ON public.org_financial_profile
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.org_members om 
            WHERE om.org_id = org_financial_profile.org_id 
            AND om.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their org financial profile" ON public.org_financial_profile
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.org_members om 
            WHERE om.org_id = org_financial_profile.org_id 
            AND om.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their org financial profile" ON public.org_financial_profile
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.org_members om 
            WHERE om.org_id = org_financial_profile.org_id 
            AND om.user_id = auth.uid()
        )
    );
-- Enable the moddatetime extension
CREATE EXTENSION IF NOT EXISTS moddatetime SCHEMA extensions;


CREATE POLICY "Users can delete their org financial profile" ON public.org_financial_profile
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.org_members om 
            WHERE om.org_id = org_financial_profile.org_id 
            AND om.user_id = auth.uid()
        )
    );

-- Add updated_at trigger
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.org_financial_profile
    FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime('updated_at');

-- Add new columns to savings_goals
ALTER TABLE public.savings_goals
ADD COLUMN IF NOT EXISTS goal_weight NUMERIC(10,2) NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS monthly_contribution NUMERIC(14,2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS estimated_completion_date DATE;
