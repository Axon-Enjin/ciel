import { ImageResponse } from "next/og";

/**
 * Open Graph image for the Ciel landing page (R brand stance, DSD §0).
 *
 * Rendered at build time via `next/og` (Satori). Honors Brand Mode: the dark
 * twilight canvas (#0B1533), the Dawn_Gold (#F2B450) horizon line, the Ciel
 * logomark (C-as-sky-dome with a rising dawn sun), the locked tagline, and the
 * product descriptor — no anti-slop (no indigo→violet gradient, no glassmorphism,
 * no AI orb).
 *
 * Fraunces (display) and Public Sans are fetched from Google Fonts for brand
 * fidelity; if the fetch fails (e.g. offline build), the image falls back to the
 * bundled default font so the build never breaks.
 */

export const alt =
  "Ciel — an AI-native Impact Operating System for the social sector. From pilot to scale.";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Brand tokens (DSD §2).
const TWILIGHT = "#0B1533";
const SURFACE = "#13224C";
const BORDER = "#26365F";
const DAWN_GOLD = "#F2B450";
const TEXT = "#EAF0FF";
const TEXT_MUTED = "#9FB0D6";
// A lighter Horizon Blue tint for the mark so the C reads on the twilight canvas
// (the locked #2456C8 is too dark on #0B1533).
const HORIZON_LIGHT = "#6F9BF0";

// The Ciel logomark recolored for the dark canvas: C in a light horizon tint,
// dawn sun in Dawn_Gold. Embedded as a data URI so Satori renders it reliably.
const logomark = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <path d="M75.3,28.8 A33,33 0 1,0 75.3,71.2" fill="none" stroke="${HORIZON_LIGHT}" stroke-width="13" stroke-linecap="round"/>
  <line x1="28" y1="56" x2="60" y2="56" stroke="${HORIZON_LIGHT}" stroke-opacity="0.5" stroke-width="3" stroke-linecap="round"/>
  <path d="M37,56 A11,11 0 0,1 59,56 Z" fill="${DAWN_GOLD}"/>
</svg>`;
const logomarkSrc = `data:image/svg+xml;base64,${Buffer.from(logomark).toString("base64")}`;

/** Fetch a single Google font as an ArrayBuffer, scoped to the glyphs we use. */
async function loadGoogleFont(
  family: string,
  weight: number,
  text: string,
): Promise<ArrayBuffer | null> {
  try {
    const url = `https://fonts.googleapis.com/css2?family=${family.replace(
      / /g,
      "+",
    )}:wght@${weight}&text=${encodeURIComponent(text)}`;
    const cssRes = await fetch(url, {
      headers: {
        // Ask for a TTF so Satori can parse it.
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });
    if (!cssRes.ok) return null;
    const css = await cssRes.text();
    const match = css.match(/src:\s*url\((.+?)\)\s*format/);
    if (!match) return null;
    const fontRes = await fetch(match[1]);
    if (!fontRes.ok) return null;
    return await fontRes.arrayBuffer();
  } catch {
    return null;
  }
}

export default async function OpengraphImage() {
  const tagline = "From pilot to scale.";
  const wordmark = "Ciel";
  const descriptor =
    "AI-native Impact Operating System for the social sector — turn a social need into a grounded Theory of Change, funded grants, and a predictive M&E loop.";

  const [frauncesTag, frauncesWord, publicSans] = await Promise.all([
    loadGoogleFont("Fraunces", 600, tagline),
    loadGoogleFont("Fraunces", 600, wordmark),
    loadGoogleFont(
      "Public Sans",
      500,
      `${descriptor}SI-YEL · IMPACT OSCreate & Conquer 2026`,
    ),
  ]);

  const fonts: { name: string; data: ArrayBuffer; weight: 400 | 500 | 600; style: "normal" }[] =
    [];
  const fraunces = frauncesTag ?? frauncesWord;
  if (fraunces) {
    fonts.push({ name: "Fraunces", data: fraunces, weight: 600, style: "normal" });
  }
  if (publicSans) {
    fonts.push({ name: "Public Sans", data: publicSans, weight: 500, style: "normal" });
  }

  const display = fraunces ? "Fraunces" : "serif";
  const sans = publicSans ? "Public Sans" : "sans-serif";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: TWILIGHT,
          // Subtle dawn glow rising at the horizon — radial, not a slop gradient.
          backgroundImage: `radial-gradient(120% 80% at 50% 118%, rgba(242,180,80,0.20) 0%, rgba(242,180,80,0.06) 28%, rgba(11,21,51,0) 60%)`,
          padding: "72px 80px",
          position: "relative",
          fontFamily: sans,
        }}
      >
        {/* Brand lockup: mark + wordmark + descriptor chip */}
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logomarkSrc} width={96} height={96} alt="" />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span
              style={{
                fontFamily: display,
                fontSize: 76,
                fontWeight: 600,
                color: TEXT,
                lineHeight: 1,
                letterSpacing: -1,
              }}
            >
              {wordmark}
            </span>
            <span
              style={{
                fontFamily: sans,
                fontSize: 18,
                fontWeight: 500,
                color: TEXT_MUTED,
                letterSpacing: 6,
                marginTop: 6,
              }}
            >
              SI-YEL · IMPACT OS
            </span>
          </div>
        </div>

        {/* Tagline block */}
        <div style={{ display: "flex", flexDirection: "column", maxWidth: 1000 }}>
          <span
            style={{
              fontFamily: display,
              fontSize: 104,
              fontWeight: 600,
              color: TEXT,
              lineHeight: 1.02,
              letterSpacing: -2,
            }}
          >
            {tagline}
          </span>
          <span
            style={{
              fontFamily: sans,
              fontSize: 28,
              fontWeight: 500,
              color: TEXT_MUTED,
              lineHeight: 1.45,
              marginTop: 28,
              maxWidth: 940,
            }}
          >
            {descriptor}
          </span>
        </div>

        {/* Footer: Dawn_Gold horizon line + attribution */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div
            style={{
              display: "flex",
              height: 4,
              width: "100%",
              backgroundColor: DAWN_GOLD,
              borderRadius: 2,
            }}
          />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ fontFamily: sans, fontSize: 22, color: TEXT_MUTED }}>
              We&rsquo;ll also tell you when to stop.
            </span>
            <span
              style={{
                fontFamily: sans,
                fontSize: 20,
                color: TEXT_MUTED,
                border: `1px solid ${BORDER}`,
                backgroundColor: SURFACE,
                borderRadius: 999,
                padding: "10px 20px",
              }}
            >
              Create &amp; Conquer 2026
            </span>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: fonts.length ? fonts : undefined,
    },
  );
}
