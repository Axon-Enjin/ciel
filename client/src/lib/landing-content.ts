/**
 * Typed landing-page content model (Brand Mode).
 *
 * Why data, not inline JSX: modeling copy as typed data structurally enforces two
 * locked rules from the spec —
 *   1. "Bilingual-ready slots": every string lives in a {@link LocalizedText} slot
 *      (English now, Filipino later) and is rendered as live HTML text, never baked
 *      into an image (R5.4, R16.5).
 *   2. "Grounded or silent": every {@link ProofPoint} REQUIRES a `source`, so a
 *      factual claim cannot exist in the model without an external attribution
 *      (R7.1, R7.3).
 *
 * Sources for the copy below: docs/gtm-ciel.md (§2 audience, §3 tiers, §4
 * positioning/proof points) and docs/prd-ciel.md (§3 modules).
 */

/**
 * A text slot carrying English now and an optional Filipino slot for future
 * localization. Text is never baked into images (R5.4, R16.5).
 */
export interface LocalizedText {
  en: string;
  /** Bilingual-ready; optional until Filipino translation lands. */
  fil?: string;
}

/**
 * A factual marketing claim that MUST carry an external attribution
 * ("grounded or silent", R7). The required `source` makes an ungrounded claim
 * unrepresentable.
 */
export interface ProofPoint {
  claim: LocalizedText;
  /** e.g., "McKinsey", "BCG with Anthropic/Claude", "Deloitte". Required. */
  source: string;
  /** Optional supporting line. */
  detail?: LocalizedText;
}

export interface CtaContent {
  label: LocalizedText;
  href: string;
  variant: "primary";
}

export interface SecondaryCtaContent {
  label: LocalizedText;
  href: string;
  variant: "ghost";
}

export interface ModuleCard {
  /** Fixed order enforced by array position (R11.1). */
  name: LocalizedText;
  blurb: LocalizedText;
  /** Drives the asymmetric bento layout (R11.2). */
  span: "wide" | "tall" | "regular";
}

export interface SectionContent {
  /** Anchor + IntersectionObserver target. */
  id: string;
  /** Optional civic/editorial label above the heading (hero). */
  eyebrow?: LocalizedText;
  heading?: LocalizedText;
  body?: LocalizedText[];
  proofPoints?: ProofPoint[];
  modules?: ModuleCard[];
  cta?: CtaContent;
  secondaryCta?: SecondaryCtaContent;
}

export interface NavLink {
  id: string;
  label: LocalizedText;
  href: `#${string}`;
}

export interface NavAction {
  label: LocalizedText;
  href: string;
}

export interface LandingNavContent {
  links: NavLink[];
  signIn: NavAction;
  cta: CtaContent;
}

export interface LandingContent {
  hero: SectionContent; // R9
  problem: SectionContent; // R10 — proofPoints attributed to McKinsey
  modules: SectionContent; // R11 — exactly 3 ModuleCards, fixed order
  differentiator: SectionContent; // R12
  trust: SectionContent; // R13 — proofPoints: BCG, McKinsey, Deloitte; + RA 10173
  audience: SectionContent; // R14
  finalCta: SectionContent; // R15 — cta + footer attribution
}

/**
 * The single, static landing content set. Narrative order matches the seven
 * sections in requirements R9–R15.
 */
export const landingContent: LandingContent = {
  // R9 — Hero: locked tagline, candid sub-line, exactly one primary CTA.
  hero: {
    id: "hero",
    eyebrow: { en: "Impact Operating System" },
    heading: {
      en: "From pilot to scale.",
    },
    body: [
      {
        en: "We'll also tell you when to stop.",
      },
      {
        en: "Ciel is the Impact Operating System that turns a social need into a rigorous plan, a funded grant, and a live signal that tells you when to scale — or stop.",
      },
    ],
    cta: {
      label: { en: "Generate a Theory of Change free" },
      href: "#final-cta",
      variant: "primary",
    },
    secondaryCta: {
      label: { en: "See the three modules" },
      href: "#modules",
      variant: "ghost",
    },
  },

  // R10 — Problem/Gap: McKinsey statistics as a grouped block, attributed.
  problem: {
    id: "problem",
    heading: {
      en: "The social sector is brilliant at finding problems and stuck at scaling solutions.",
    },
    body: [
      {
        en: "The gap between adopting AI and seeing impact is real — and measured.",
      },
    ],
    proofPoints: [
      {
        claim: { en: "88% of organizations use AI" },
        source: "McKinsey",
      },
      {
        claim: { en: "approximately two-thirds have not scaled it" },
        source: "McKinsey",
      },
      {
        claim: { en: "39% see impact" },
        source: "McKinsey",
      },
    ],
  },

  // R11 — Three modules in FIXED order with non-uniform bento spans (PRD §3).
  modules: {
    id: "modules",
    heading: { en: "Three modules. One operating system." },
    modules: [
      {
        name: { en: "Theory of Change Generator" },
        blurb: {
          en: "Turn a plain-language need into a rigorous, RAG-grounded Theory of Change — root causes over symptoms, with evidence-backed outcomes and a prompt to confront what has failed before.",
        },
        span: "wide",
      },
      {
        name: { en: "Grant Writing" },
        blurb: {
          en: "Translate a locked Theory of Change into compliance-ready, donor-matched proposals — every claim cited, human-edited, never silently overwritten.",
        },
        span: "tall",
      },
      {
        name: { en: "Predictive M&E" },
        blurb: {
          en: "Ingest field data over offline PWA and SMS, track it against your ToC assumptions, and fire scale / adapt / stop signals before the funding runs out.",
        },
        span: "regular",
      },
    ],
  },

  // R12 — Differentiator: "intelligent failure" + scale/adapt/stop signal.
  differentiator: {
    id: "differentiator",
    heading: { en: "Honest about intelligent failure." },
    body: [
      {
        en: "Most tools only celebrate launches. Ciel surfaces historical failures in similar contexts before you lock a plan, then watches the live data against your assumptions.",
      },
      {
        en: "When an assumption breaks, Ciel recommends one of three things — scale, adapt, or stop — tied to the exact assumption that failed. The decision stays with you.",
      },
    ],
  },

  // R13 — Trust & Method: BCG, McKinsey, Deloitte + RA 10173.
  trust: {
    id: "trust",
    heading: { en: "Trust is the product." },
    body: [
      {
        en: "Grounded-only outputs, human-in-the-loop on every decision, and provenance on every AI claim — built on a proven method.",
      },
    ],
    proofPoints: [
      {
        claim: { en: "Built on the 10-20-70 model for AI value creation." },
        source: "BCG",
      },
      {
        claim: { en: "Grounded in the Rewired playbook for scaling AI transformation." },
        source: "McKinsey",
      },
      {
        claim: {
          en: "Governed by the seven Trustworthy AI dimensions.",
        },
        source: "Deloitte",
      },
      {
        claim: {
          en: "Built to comply with the Philippine Data Privacy Act (RA 10173).",
        },
        source: "Republic Act No. 10173 (Data Privacy Act of 2012)",
      },
    ],
  },

  // R14 — Audience: the "missing middle" (GTM §2).
  audience: {
    id: "audience",
    heading: { en: "Built for the missing middle." },
    body: [
      {
        en: "Mid-sized NGOs and progressive LGUs that need digital transformation but can't afford Big-Four consultants or a full-time Salesforce admin.",
      },
      {
        en: "Your organization is the subject — the frontline program manager designing a defensible program in an afternoon, the planning officer who has to justify every peso with evidence.",
      },
    ],
  },

  // R15 — Final CTA referencing free ToC tier (Ciel Start) + footer attribution.
  finalCta: {
    id: "final-cta",
    heading: { en: "Design a fundable program in an afternoon." },
    body: [
      {
        en: "Start free with Ciel Start — the Theory of Change generator, one active project, and the community evidence corpus. No credit card.",
      },
      {
        // Footer attribution (Create & Conquer 2026).
        en: "Ciel — an AI-native Impact Operating System for the social sector. Built for Create & Conquer 2026.",
      },
    ],
    cta: {
      label: { en: "Generate a Theory of Change free" },
      href: "/auth/sign-up",
      variant: "primary",
    },
  },
};

/** Sticky header anchor links — derived from section ids in landingContent. */
export const landingNav: LandingNavContent = {
  links: [
    { id: "problem", label: { en: "Problem" }, href: "#problem" },
    { id: "modules", label: { en: "Modules" }, href: "#modules" },
    {
      id: "differentiator",
      label: { en: "Why Ciel" },
      href: "#differentiator",
    },
    { id: "trust", label: { en: "Trust" }, href: "#trust" },
    { id: "audience", label: { en: "Audience" }, href: "#audience" },
  ],
  signIn: { label: { en: "Sign in" }, href: "/auth/sign-in" },
  cta: landingContent.hero.cta!,
};

export default landingContent;
