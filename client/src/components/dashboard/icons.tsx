import * as React from "react";

/**
 * Ultra-light line icons for the Ciel app surface.
 *
 * Hand-drawn at strokeWidth 1.5, round joins/caps, currentColor — the precise,
 * thin civic line the DSD asks for (no thick Lucide/Material defaults). Every
 * icon inherits text color so it composes with the dawn palette via tokens.
 */
export type IconProps = React.SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 20, children, ...props }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

/** Horizon / dashboard — a sun cresting a baseline (the dawn motif). */
export function IconHorizon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3 18h18" />
      <path d="M6.5 18a5.5 5.5 0 0 1 11 0" />
      <path d="M12 4.5v2M5 7l1.4 1.4M19 7l-1.4 1.4M2.5 12.5h1.5M20 12.5h1.5" />
    </Svg>
  );
}

/** Theory of Change — connected nodes. */
export function IconNodes(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="6" cy="6" r="2.2" />
      <circle cx="18" cy="9" r="2.2" />
      <circle cx="9" cy="18" r="2.2" />
      <path d="M7.9 7.1 16 8.6M7.5 7.7 8.6 16" />
    </Svg>
  );
}

/** M&E signal — a measured pulse. */
export function IconPulse(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3 12h4l2-6 4 12 2-6h6" />
    </Svg>
  );
}

/** Reports — a document with rule lines. */
export function IconReport(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6 3.5h8l4 4V20a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z" />
      <path d="M13.5 3.5V8h4.5M8.5 12.5h7M8.5 16h7M8.5 9h2.5" />
    </Svg>
  );
}

/** Field capture — a location pin. */
export function IconPin(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 21s6-5.2 6-10a6 6 0 1 0-12 0c0 4.8 6 10 6 10Z" />
      <circle cx="12" cy="11" r="2.2" />
    </Svg>
  );
}

/** Settings — a thin gear. */
export function IconGear(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2.8v2.2M12 19v2.2M4.9 4.9l1.6 1.6M17.5 17.5l1.6 1.6M2.8 12H5M19 12h2.2M4.9 19.1l1.6-1.6M17.5 6.5l1.6-1.6" />
    </Svg>
  );
}

/** Diagonal arrow for CTAs. */
export function IconArrowUpRight(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M7 17 17 7M9 7h8v8" />
    </Svg>
  );
}

export function IconPlus(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 5v14M5 12h14" />
    </Svg>
  );
}

export function IconChevronDown(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m6 9 6 6 6-6" />
    </Svg>
  );
}

export function IconCheck(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m5 12.5 4.5 4.5L19 7" />
    </Svg>
  );
}

export function IconClock(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </Svg>
  );
}
