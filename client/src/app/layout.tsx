import type { Metadata } from "next";
import { Fraunces, Public_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-fraunces",
});

const publicSans = Public_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-public-sans",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jetbrains-mono",
});

// Absolute base for OG/Twitter image URLs. Override via NEXT_PUBLIC_SITE_URL in
// the deploy environment; falls back to localhost for local builds.
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

const title = "Ciel — Impact Operating System for the social sector";
const description =
  "Ciel is an AI-native Impact Operating System for the social sector: turn a social need into a grounded Theory of Change, funded grant proposals, and a predictive M&E loop. From pilot to scale.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: title,
    template: "%s · Ciel",
  },
  description,
  applicationName: "Ciel",
  keywords: [
    "Ciel",
    "Impact Operating System",
    "Theory of Change",
    "grant writing",
    "predictive M&E",
    "social sector",
    "NGO",
    "LGU",
    "AI for social impact",
    "Create & Conquer 2026",
  ],
  authors: [{ name: "Ciel Team — Create & Conquer 2026" }],
  creator: "Ciel Team",
  category: "technology",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    siteName: "Ciel",
    title,
    description,
    url: siteUrl,
    locale: "en_PH",
    // og:image is supplied automatically by app/opengraph-image.tsx
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    // twitter:image is supplied automatically by app/twitter-image.tsx
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${publicSans.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
