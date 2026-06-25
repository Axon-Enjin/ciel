-- Allow org creators to insert their first admin membership during onboarding
-- Date: 2026-06-25

CREATE POLICY "Creators can insert initial admin membership"
ON memberships FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND role = 'admin'
  AND NOT EXISTS (
    SELECT 1 FROM memberships existing WHERE existing.org_id = memberships.org_id
  )
);
