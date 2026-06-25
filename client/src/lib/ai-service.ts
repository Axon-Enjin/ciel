/** Server-side helpers for proxying to the Ciel AI service. */

export function getAiServiceUrl(): string {
  return process.env.AI_SERVICE_URL ?? "http://localhost:8000";
}

export function aiServiceHeaders(): HeadersInit {
  return {
    "Content-Type": "application/json",
    Accept: "text/event-stream",
  };
}
