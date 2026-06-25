-- Ciel Initial Schema Migration
-- Implements SDD §3 core tables for PRD-F1 (Theory of Change Generator)
-- Date: 2026-06-25
-- Migration: 20260625000001_initial_schema.sql

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- Organizations table
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    org_type TEXT NOT NULL CHECK (org_type IN ('ngo', 'lgu', 'foundation', 'csr')),
    mission TEXT,
    region TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Users table (maps to Supabase auth.users)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    display_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index on email for faster lookups
CREATE INDEX idx_users_email ON users(email);

-- Memberships table (org ↔ user with role)
CREATE TABLE memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'program' CHECK (role IN ('admin', 'program', 'field', 'viewer')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(org_id, user_id)
);

-- Create composite index for role-based queries
CREATE INDEX idx_memberships_org_role ON memberships(org_id, role);

-- Projects table
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    need TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'scaling', 'stopped')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create composite index for org project queries
CREATE INDEX idx_projects_org_created ON projects(org_id, created_at DESC);

-- Theories of Change table (one current + versions per project)
CREATE TABLE theories_of_change (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    version INT NOT NULL DEFAULT 1,
    graph JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'locked', 'superseded')),
    failure_prompts_ack BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(project_id, version)
);

-- Create composite index for version queries
CREATE INDEX idx_toc_project_version ON theories_of_change(project_id, version DESC);

-- ToC Assumptions table (the measurable links M&E watches)
CREATE TABLE toc_assumptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    toc_id UUID NOT NULL REFERENCES theories_of_change(id) ON DELETE CASCADE,
    statement TEXT NOT NULL,
    indicator TEXT NOT NULL,
    threshold NUMERIC,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for ToC assumption lookups
CREATE INDEX idx_toc_assumptions_toc ON toc_assumptions(toc_id);

-- Evidence Sources table (RAG corpus + provenance)
CREATE TABLE evidence_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    url TEXT,
    tier TEXT NOT NULL CHECK (tier IN ('T1', 'T2', 'T3', 'T4')),
    chunk TEXT NOT NULL,
    embedding VECTOR(1536),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create ivfflat index for vector similarity search
CREATE INDEX idx_evidence_embedding ON evidence_sources 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- ToC Critiques table (intelligent failure prompts)
CREATE TABLE toc_critiques (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    toc_id UUID NOT NULL REFERENCES theories_of_change(id) ON DELETE CASCADE,
    prompt TEXT NOT NULL,
    source_ids UUID[] DEFAULT '{}',
    acknowledged BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for critique lookups
CREATE INDEX idx_toc_critiques_toc ON toc_critiques(toc_id);

-- Grant Proposals table
CREATE TABLE grant_proposals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    funder_id UUID,
    sections JSONB NOT NULL,
    amount_php NUMERIC,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for project proposal queries
CREATE INDEX idx_grant_proposals_project ON grant_proposals(project_id);

-- Field Entries table (web / PWA / SMS ingestion)
CREATE TABLE field_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    source TEXT NOT NULL CHECK (source IN ('web', 'pwa', 'sms')),
    payload JSONB NOT NULL,
    client_uuid UUID UNIQUE,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create composite index for time-series queries
CREATE INDEX idx_field_entries_project_time ON field_entries(project_id, recorded_at DESC);

-- Signals table (scale/adapt/stop recommendations)
CREATE TABLE signals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    assumption_id UUID REFERENCES toc_assumptions(id) ON DELETE SET NULL,
    signal_type TEXT NOT NULL CHECK (signal_type IN ('scale', 'adapt', 'stop')),
    rationale TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for project signal queries
CREATE INDEX idx_signals_project ON signals(project_id, created_at DESC);

-- Audit Log table (append-only)
CREATE TABLE audit_log (
    id BIGSERIAL PRIMARY KEY,
    org_id UUID NOT NULL,
    actor_id UUID,
    action TEXT NOT NULL,
    entity TEXT NOT NULL,
    entity_id UUID,
    metadata JSONB,
    at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create composite index for audit queries
CREATE INDEX idx_audit_log_org_time ON audit_log(org_id, at DESC);

-- Indicator Points table (rollup for fast dashboards + forecasting)
CREATE TABLE indicator_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    assumption_id UUID REFERENCES toc_assumptions(id) ON DELETE SET NULL,
    indicator TEXT NOT NULL,
    value NUMERIC NOT NULL,
    observed_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_point UNIQUE (project_id, indicator, observed_at)
);

-- Create index for time-series queries
CREATE INDEX idx_indicator_points_series ON indicator_points(project_id, indicator, observed_at DESC);

-- ============================================================================
-- COMMENTS (documentation)
-- ============================================================================

COMMENT ON TABLE organizations IS 'Organizations using Ciel (NGOs, LGUs, foundations, CSR)';
COMMENT ON TABLE users IS 'User accounts mapped to Supabase auth.users';
COMMENT ON TABLE memberships IS 'Many-to-many relationship between users and organizations with roles';
COMMENT ON TABLE projects IS 'Social intervention projects with their identified needs';
COMMENT ON TABLE theories_of_change IS 'Versioned Theory of Change graphs for projects';
COMMENT ON TABLE toc_assumptions IS 'Measurable assumptions extracted from ToCs for M&E monitoring';
COMMENT ON TABLE evidence_sources IS 'Curated development evidence corpus for RAG grounding';
COMMENT ON TABLE toc_critiques IS 'Intelligent failure prompts that must be acknowledged before ToC lock';
COMMENT ON TABLE grant_proposals IS 'AI-generated grant proposals matched to funders';
COMMENT ON TABLE field_entries IS 'Raw field data entries from web/PWA/SMS sources';
COMMENT ON TABLE signals IS 'Scale/adapt/stop recommendations based on indicator analysis';
COMMENT ON TABLE audit_log IS 'Immutable audit trail for compliance (RA 10173)';
COMMENT ON TABLE indicator_points IS 'Aggregated indicator time-series for dashboard performance';