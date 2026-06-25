import Image, { type StaticImageData } from "next/image";

// Static imports of the real Ciel brand assets (copied into the app's source
// tree so they resolve cleanly under the Turbopack project root). The scaffold
// placeholders (next.svg / vercel.svg) are intentionally never referenced here.
import lockupAsset from "@/assets/brand/ciel-logo.svg";
import markAsset from "@/assets/brand/ciel-logomark.svg";

export type BrandLogoVariant = "lockup" | "mark";

export interface BrandLogoProps {
  /** `lockup` = logomark + wordmark; `mark` = logomark only. */
  variant: BrandLogoVariant;
  /** Descriptive accessible name conveying the brand identity (R5.3). */
  title: string;
  className?: string;
}

const ASSETS: Record<BrandLogoVariant, StaticImageData> = {
  lockup: lockupAsset,
  mark: markAsset,
};

/** Intrinsic dimensions aligned to SVG viewBox (used for Next/Image layout). */
const INTRINSIC: Record<BrandLogoVariant, { width: number; height: number }> = {
  mark: { width: 100, height: 100 },
  lockup: { width: 380, height: 120 },
};

/**
 * Renders a real Ciel brand asset (lockup or mark) with a descriptive
 * accessible name. Server-compatible: no client hooks or "use client".
 *
 * Requirements: 5.1 (real brand SVGs), 5.2 (no scaffold placeholders),
 * 5.3 (descriptive text alternative via role="img" + aria-label).
 */
export function BrandLogo({ variant, title, className }: BrandLogoProps) {
  const asset = ASSETS[variant];
  const { width, height } = INTRINSIC[variant];

  return (
    <Image
      src={asset}
      alt={title}
      role="img"
      aria-label={title}
      width={width}
      height={height}
      className={className}
      priority
    />
  );
}

export default BrandLogo;
