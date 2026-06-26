export interface GrantSection {
  key: string;
  heading: string;
  content: string;
  source_ids: string[];
  ai_generated: boolean;
  edited_by_human: boolean;
}

export interface FunderAlignment {
  kpi: string;
  addressed: boolean;
  note: string;
}

export interface Funder {
  id: string;
  name: string;
  type: "foundation" | "csr" | "government" | "multilateral";
  region: string | null;
  focus_areas: string[];
  kpis: string[];
  typical_grant_php_min: number | null;
  typical_grant_php_max: number | null;
}

export interface ProposalSummary {
  id: string;
  title: string | null;
  status: "draft" | "in_review" | "final";
  funder_id: string | null;
  amount_php: number | null;
  updated_at: string;
}
