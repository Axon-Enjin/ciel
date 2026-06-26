import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SignalCard } from "./signal-card";

describe("SignalCard", () => {
  it("renders adapt signal with DSD tokens not demo slop", () => {
    const html = renderToStaticMarkup(
      createElement(SignalCard, {
        signal: {
          id: "s1",
          assumption_id: "a1",
          signal_type: "adapt",
          rationale:
            "Attendance averaged 9.2 — below threshold. Consider adjusting outreach.",
          created_at: new Date().toISOString(),
        },
      }),
    );

    expect(html).toContain("Adapt");
    expect(html).toContain("Attendance averaged 9.2");
    expect(html).not.toContain("amber-100");
    expect(html).not.toContain("Demo");
  });
});
