-- Migration 015: Dismissed schedule events tracking
-- Allows users to acknowledge/dismiss overdue schedule events
-- so they stop showing as "overdue" for the current cycle.

CREATE TABLE IF NOT EXISTS public.dismissed_schedule_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  event_key TEXT NOT NULL,          -- e.g. "Deposito de sueldo-2026-03-30-0"
  cycle_month TEXT NOT NULL,        -- e.g. "2026-03" (YYYY-MM)
  dismissed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (org_id, event_key, cycle_month)
);

CREATE INDEX IF NOT EXISTS dismissed_schedule_events_org_cycle_idx
  ON public.dismissed_schedule_events (org_id, cycle_month);

ALTER TABLE public.dismissed_schedule_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dismissed_schedule_events_select" ON public.dismissed_schedule_events;
CREATE POLICY "dismissed_schedule_events_select" ON public.dismissed_schedule_events
  FOR SELECT USING (is_org_member(org_id));

DROP POLICY IF EXISTS "dismissed_schedule_events_insert" ON public.dismissed_schedule_events;
CREATE POLICY "dismissed_schedule_events_insert" ON public.dismissed_schedule_events
  FOR INSERT WITH CHECK (can_write_org(org_id) AND user_id = auth.uid());

DROP POLICY IF EXISTS "dismissed_schedule_events_delete" ON public.dismissed_schedule_events;
CREATE POLICY "dismissed_schedule_events_delete" ON public.dismissed_schedule_events
  FOR DELETE USING (is_org_member(org_id));
