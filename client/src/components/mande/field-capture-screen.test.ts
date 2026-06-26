import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FieldCaptureScreen } from "./field-capture-screen";

describe("FieldCaptureScreen", () => {
  it("renders queued offline status without demo slop tokens", () => {
    const html = renderToStaticMarkup(
      createElement(FieldCaptureScreen, {
        projectId: "project-1",
        projectNeed: "Youth employment support",
        assumptions: [
          {
            id: "a1",
            statement: "Outcome holds",
            indicator: "employment_rate_6mo",
            threshold: 60,
          },
        ],
        initialOutbox: [
          {
            client_uuid: "7dba0294-42da-4829-98f7-f5a74f2d6108",
            project_id: "project-1",
            indicator: "employment_rate_6mo",
            value: 42,
            observed_at: "2026-06-26T00:00:00.000Z",
            status: "queued",
            created_at: "2026-06-26T00:00:00.000Z",
          },
        ],
      }),
    );

    expect(html).toContain("queued (offline)");
    expect(html).toContain("Field capture");
    expect(html).not.toContain("amber-100");
  });
});
