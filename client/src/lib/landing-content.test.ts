import { describe, expect, it } from "vitest";

describe("landing content", () => {
  it("exports nav links with anchor targets", async () => {
    const { landingNav } = await import("@/lib/landing-content");
    expect(landingNav.links.length).toBeGreaterThan(0);
    for (const item of landingNav.links) {
      expect(item.href.startsWith("#")).toBe(true);
    }
  });
});
