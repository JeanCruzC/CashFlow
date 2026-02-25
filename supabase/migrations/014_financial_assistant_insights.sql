-- Migration 014: Financial assistant insights log

CREATE TABLE IF NOT EXISTS public.assistant_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  source TEXT NOT NULL DEFAULT 'onboarding_income_plan'
    CHECK (source IN ('onboarding_income_plan', 'manual_query')),
  title TEXT NOT NULL,
  recommendation JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS assistant_insights_org_created_idx
  ON public.assistant_insights (org_id, created_at DESC);

ALTER TABLE public.assistant_insights ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "assistant_insights_select" ON public.assistant_insights;
CREATE POLICY "assistant_insights_select" ON public.assistant_insights
  FOR SELECT USING (is_org_member(org_id));

DROP POLICY IF EXISTS "assistant_insights_insert" ON public.assistant_insights;
CREATE POLICY "assistant_insights_insert" ON public.assistant_insights
  FOR INSERT WITH CHECK (can_write_org(org_id) AND user_id = auth.uid());

DROP POLICY IF EXISTS "assistant_insights_update" ON public.assistant_insights;
CREATE POLICY "assistant_insights_update" ON public.assistant_insights
  FOR UPDATE USING (is_org_admin(org_id));

DROP POLICY IF EXISTS "assistant_insights_delete" ON public.assistant_insights;
CREATE POLICY "assistant_insights_delete" ON public.assistant_insights
  FOR DELETE USING (is_org_admin(org_id));
