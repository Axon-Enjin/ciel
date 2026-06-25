-- Ciel Row-Level Security (RLS) Policies
-- Implements SDD §5 security model for multi-tenant data isolation
-- Date: 2026-06-25
-- Migration: 20260625000002_rls_policies.sql

-- ============================================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE theories_of_change ENABLE ROW LEVEL SECURITY;
ALTER TABLE toc_assumptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE toc_critiques ENABLE ROW LEVEL SECURITY;
ALTER TABLE grant_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE field_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE indicator_points ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- HELPER FUNCTION: Get user's organizations
-- ============================================================================

CREATE OR REPLACE FUNCTION auth.user_orgs()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT org_id 
  FROM memberships 
  WHERE user_id = auth.uid();
$$;

-- ============================================================================
-- HELPER FUNCTION: Check if user has role in org
-- ============================================================================

CREATE OR REPLACE FUNCTION auth.has_org_role(org_id UUID, required_role TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM memberships 
    WHERE memberships.org_id = has_org_role.org_id
      AND memberships.user_id = auth.uid()
      AND (
        memberships.role = required_role
        OR memberships.role = 'admin'  -- admins have all permissions
      )
  );
$$;

-- ============================================================================
-- ORGANIZATIONS POLICIES
-- ============================================================================

-- Users can view organizations they belong to
CREATE POLICY "Users can view their organizations"
ON organizations FOR SELECT
USING (id IN (SELECT auth.user_orgs()));

-- Admins can update their organizations
CREATE POLICY "Admins can update their organizations"
ON organizations FOR UPDATE
USING (auth.has_org_role(id, 'admin'));

-- Authenticated users can create organizations (for onboarding)
CREATE POLICY "Authenticated users can create organizations"
ON organizations FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================================
-- USERS POLICIES
-- ============================================================================

-- Users can view their own record
CREATE POLICY "Users can view their own record"
ON users FOR SELECT
USING (id = auth.uid());

-- Users can view other users in their organizations
CREATE POLICY "Users can view org members"
ON users FOR SELECT
USING (
  id IN (
    SELECT user_id 
    FROM memberships 
    WHERE org_id IN (SELECT auth.user_orgs())
  )
);

-- Users can insert their own record (on first sign-in)
CREATE POLICY "Users can insert their own record"
ON users FOR INSERT
WITH CHECK (id = auth.uid());

-- Users can update their own record
CREATE POLICY "Users can update their own record"
ON users FOR UPDATE
USING (id = auth.uid());

-- ============================================================================
-- MEMBERSHIPS POLICIES
-- ============================================================================

-- Users can view memberships in their organizations
CREATE POLICY "Users can view org memberships"
ON memberships FOR SELECT
USING (org_id IN (SELECT auth.user_orgs()));

-- Admins can manage memberships in their organizations
CREATE POLICY "Admins can insert memberships"
ON memberships FOR INSERT
WITH CHECK (auth.has_org_role(org_id, 'admin'));

CREATE POLICY "Admins can update memberships"
ON memberships FOR UPDATE
USING (auth.has_org_role(org_id, 'admin'));

CREATE POLICY "Admins can delete memberships"
ON memberships FOR DELETE
USING (auth.has_org_role(org_id, 'admin'));

-- ============================================================================
-- PROJECTS POLICIES
-- ============================================================================

-- Users can view projects in their organizations
CREATE POLICY "Users can view org projects"
ON projects FOR SELECT
USING (org_id IN (SELECT auth.user_orgs()));

-- Program and admin roles can create projects
CREATE POLICY "Program users can create projects"
ON projects FOR INSERT
WITH CHECK (
  auth.has_org_role(org_id, 'program')
  OR auth.has_org_role(org_id, 'admin')
);

-- Program and admin roles can update projects
CREATE POLICY "Program users can update projects"
ON projects FOR UPDATE
USING (
  org_id IN (SELECT auth.user_orgs())
  AND (
    auth.has_org_role(org_id, 'program')
    OR auth.has_org_role(org_id, 'admin')
  )
);

-- ============================================================================
-- THEORIES OF CHANGE POLICIES
-- ============================================================================

-- Users can view ToCs for projects in their organizations
CREATE POLICY "Users can view org ToCs"
ON theories_of_change FOR SELECT
USING (
  project_id IN (
    SELECT id FROM projects WHERE org_id IN (SELECT auth.user_orgs())
  )
);

-- Program and admin roles can create ToCs
CREATE POLICY "Program users can create ToCs"
ON theories_of_change FOR INSERT
WITH CHECK (
  project_id IN (
    SELECT id FROM projects 
    WHERE org_id IN (SELECT auth.user_orgs())
  )
);

-- Program and admin roles can update draft ToCs
CREATE POLICY "Program users can update draft ToCs"
ON theories_of_change FOR UPDATE
USING (
  status = 'draft'
  AND project_id IN (
    SELECT id FROM projects WHERE org_id IN (SELECT auth.user_orgs())
  )
);

-- ============================================================================
-- TOC ASSUMPTIONS POLICIES
-- ============================================================================

-- Users can view assumptions for ToCs in their organizations
CREATE POLICY "Users can view org ToC assumptions"
ON toc_assumptions FOR SELECT
USING (
  toc_id IN (
    SELECT id FROM theories_of_change
    WHERE project_id IN (
      SELECT id FROM projects WHERE org_id IN (SELECT auth.user_orgs())
    )
  )
);

-- System can insert assumptions (via API)
CREATE POLICY "System can insert assumptions"
ON toc_assumptions FOR INSERT
WITH CHECK (
  toc_id IN (
    SELECT id FROM theories_of_change
    WHERE project_id IN (
      SELECT id FROM projects WHERE org_id IN (SELECT auth.user_orgs())
    )
  )
);

-- ============================================================================
-- EVIDENCE SOURCES POLICIES (shared corpus)
-- ============================================================================

-- All authenticated users can read evidence sources
CREATE POLICY "Authenticated users can read evidence"
ON evidence_sources FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Only service role can insert evidence (corpus management)
-- (No policy needed - service role bypasses RLS)

-- ============================================================================
-- TOC CRITIQUES POLICIES
-- ============================================================================

-- Users can view critiques for ToCs in their organizations
CREATE POLICY "Users can view org ToC critiques"
ON toc_critiques FOR SELECT
USING (
  toc_id IN (
    SELECT id FROM theories_of_change
    WHERE project_id IN (
      SELECT id FROM projects WHERE org_id IN (SELECT auth.user_orgs())
    )
  )
);

-- System can insert critiques (via AI pipeline)
CREATE POLICY "System can insert critiques"
ON toc_critiques FOR INSERT
WITH CHECK (
  toc_id IN (
    SELECT id FROM theories_of_change
    WHERE project_id IN (
      SELECT id FROM projects WHERE org_id IN (SELECT auth.user_orgs())
    )
  )
);

-- Program users can acknowledge critiques
CREATE POLICY "Program users can acknowledge critiques"
ON toc_critiques FOR UPDATE
USING (
  toc_id IN (
    SELECT id FROM theories_of_change
    WHERE project_id IN (
      SELECT id FROM projects WHERE org_id IN (SELECT auth.user_orgs())
    )
  )
);

-- ============================================================================
-- GRANT PROPOSALS POLICIES
-- ============================================================================

-- Users can view proposals for projects in their organizations
CREATE POLICY "Users can view org proposals"
ON grant_proposals FOR SELECT
USING (
  project_id IN (
    SELECT id FROM projects WHERE org_id IN (SELECT auth.user_orgs())
  )
);

-- Program and admin roles can create proposals
CREATE POLICY "Program users can create proposals"
ON grant_proposals FOR INSERT
WITH CHECK (
  project_id IN (
    SELECT id FROM projects WHERE org_id IN (SELECT auth.user_orgs())
  )
);

-- Program and admin roles can update proposals
CREATE POLICY "Program users can update proposals"
ON grant_proposals FOR UPDATE
USING (
  project_id IN (
    SELECT id FROM projects WHERE org_id IN (SELECT auth.user_orgs())
  )
);

-- ============================================================================
-- FIELD ENTRIES POLICIES
-- ============================================================================

-- Users can view field entries for projects in their organizations
CREATE POLICY "Users can view org field entries"
ON field_entries FOR SELECT
USING (
  project_id IN (
    SELECT id FROM projects WHERE org_id IN (SELECT auth.user_orgs())
  )
);

-- Field, program, and admin roles can insert field entries
CREATE POLICY "Field users can insert entries"
ON field_entries FOR INSERT
WITH CHECK (
  project_id IN (
    SELECT id FROM projects WHERE org_id IN (SELECT auth.user_orgs())
  )
);

-- ============================================================================
-- SIGNALS POLICIES
-- ============================================================================

-- Users can view signals for projects in their organizations
CREATE POLICY "Users can view org signals"
ON signals FOR SELECT
USING (
  project_id IN (
    SELECT id FROM projects WHERE org_id IN (SELECT auth.user_orgs())
  )
);

-- System can insert signals (via M&E engine)
CREATE POLICY "System can insert signals"
ON signals FOR INSERT
WITH CHECK (
  project_id IN (
    SELECT id FROM projects WHERE org_id IN (SELECT auth.user_orgs())
  )
);

-- ============================================================================
-- INDICATOR POINTS POLICIES
-- ============================================================================

-- Users can view indicator points for projects in their organizations
CREATE POLICY "Users can view org indicator points"
ON indicator_points FOR SELECT
USING (
  project_id IN (
    SELECT id FROM projects WHERE org_id IN (SELECT auth.user_orgs())
  )
);

-- System can insert indicator points (via ingestion pipeline)
CREATE POLICY "System can insert indicator points"
ON indicator_points FOR INSERT
WITH CHECK (
  project_id IN (
    SELECT id FROM projects WHERE org_id IN (SELECT auth.user_orgs())
  )
);

-- ============================================================================
-- AUDIT LOG POLICIES
-- ============================================================================

-- Users can view audit logs for their organizations
CREATE POLICY "Users can view org audit logs"
ON audit_log FOR SELECT
USING (org_id IN (SELECT auth.user_orgs()));

-- System can insert audit logs (append-only)
CREATE POLICY "System can insert audit logs"
ON audit_log FOR INSERT
WITH CHECK (org_id IN (SELECT auth.user_orgs()));

-- No update or delete policies (immutable audit trail)

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON FUNCTION auth.user_orgs() IS 'Returns UUIDs of all organizations the current user belongs to';
COMMENT ON FUNCTION auth.has_org_role(UUID, TEXT) IS 'Checks if current user has specified role (or admin) in given organization';