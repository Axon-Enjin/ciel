import type { FunderAlignment, GrantSection } from "./types";

export interface GrantStreamHandlers {
  onSection?: (section: GrantSection) => void;
  onAlignment?: (alignment: FunderAlignment[]) => void;
  onDone?: (payload: { sections: GrantSection[]; alignment: FunderAlignment[] }) => void;
  onError?: (message: string) => void;
}

interface GrantStreamBody {
  project_id: string;
  funder_id: string;
  amount_php?: number | null;
  only_section?: string | null;
}

/**
 * POST to /api/grants/generate and parse the Server-Sent Events stream,
 * dispatching section/alignment/done callbacks. Used by both the generate
 * panel and the per-section regenerate flow.
 */
export async function streamGrantGeneration(
  body: GrantStreamBody,
  handlers: GrantStreamHandlers,
): Promise<void> {
  const res = await fetch("/api/grants/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok || !res.body) {
    const data = await res.json().catch(() => ({}));
    handlers.onError?.(data.error ?? "Generation failed");
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const frames = buffer.split("\n\n");
    buffer = frames.pop() ?? "";

    for (const frame of frames) {
      let event = "message";
      let dataLine = "";
      for (const line of frame.split("\n")) {
        if (line.startsWith("event:")) event = line.slice(6).trim();
        else if (line.startsWith("data:")) dataLine += line.slice(5).trim();
      }
      if (!dataLine) continue;

      let data: Record<string, unknown>;
      try {
        data = JSON.parse(dataLine);
      } catch {
        continue;
      }

      if (event === "section_delta") {
        handlers.onSection?.(data as unknown as GrantSection);
      } else if (event === "alignment") {
        handlers.onAlignment?.((data.alignment as FunderAlignment[]) ?? []);
      } else if (event === "run_finished") {
        handlers.onDone?.({
          sections: (data.sections as GrantSection[]) ?? [],
          alignment: (data.alignment as FunderAlignment[]) ?? [],
        });
      } else if (event === "error") {
        handlers.onError?.((data.message as string) ?? "Generation error");
      }
    }
  }
}
