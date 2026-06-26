"use client";

import * as React from "react";
import { useShellOrg } from "./dashboard-shell";

/** Syncs the workspace shell org switcher to a project's org. */
export function WorkspaceOrgSync({ orgId }: { orgId: string }) {
  const { setActiveOrgId } = useShellOrg();

  React.useEffect(() => {
    setActiveOrgId(orgId);
  }, [orgId, setActiveOrgId]);

  return null;
}
