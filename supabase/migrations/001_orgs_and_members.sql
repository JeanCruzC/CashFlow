-- Migration 001: Organizations and Members
-- Core identity and multi-tenant structure

CREATE TYPE org_type AS ENUM ('personal', 'business');
CREATE TYPE member_role AS ENUM ('owner', 'admin', 'member', 'viewer');

CREATE TABLE orgs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type org_type NOT NULL,
  name TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'US',
  currency TEXT NOT NULL DEFAULT 'USD',
  fiscal_year_start INT NOT NULL DEFAULT 1 CHECK (fiscal_year_start BETWEEN 1 AND 12),
  accounting_basis TEXT CHECK (accounting_basis IN ('cash_basis', 'accrual_basis')),
  timezone TEXT NOT NULL DEFAULT 'UTC',
  preferred_locale TEXT NOT NULL DEFAULT 'en',
  detracciones_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE org_members (
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role member_role NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (org_id, user_id)
);

CREATE INDEX idx_org_members_user ON org_members(user_id);

CREATE TABLE onboarding_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_type org_type NOT NULL,
  step INT NOT NULL DEFAULT 1,
  answers JSONB NOT NULL DEFAULT '{}',
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (org_id, user_id)
);
