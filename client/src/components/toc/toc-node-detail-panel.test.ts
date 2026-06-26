import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TocNodeDetailPanel } from "./toc-node-detail-panel";

const longText =
  "Youth in our barangay lack stable employment pathways after senior high school and need skills training connected to local employers in coastal communities.";

describe("TocNodeDetailPanel", () => {
  it("renders full node text without line-clamp", () => {
    const html = renderToStaticMarkup(
      createElement(TocNodeDetailPanel, {
        node: {
          id: "outcome-1",
          type: "outcome",
          text: longText,
          source_ids: ["aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"],
        },
        onClose: () => {},
      }),
    );

    expect(html).toContain(longText);
    expect(html).not.toContain("line-clamp");
  });

  it("renders nothing when node is null", () => {
    const html = renderToStaticMarkup(
      createElement(TocNodeDetailPanel, { node: null, onClose: () => {} }),
    );
    expect(html).toBe("");
  });
});
