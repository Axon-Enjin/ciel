/** Server-side helpers for proxying to the Ciel AI service. */

export function getAiServiceUrl(): string {
  return process.env.AI_SERVICE_URL ?? "http://localhost:8000";
}

function getAiServiceAuthHeader(): Record<string, string> {
  const apiKey = process.env.AI_SERVICE_API_KEY?.trim();
  return apiKey ? { Authorization: `Bearer ${apiKey}` } : {};
}

export function aiServiceHeaders(): HeadersInit {
  return {
    "Content-Type": "application/json",
    Accept: "text/event-stream",
    ...getAiServiceAuthHeader(),
  };
}

export function aiServiceJsonHeaders(): HeadersInit {
  return {
    "Content-Type": "application/json",
    ...getAiServiceAuthHeader(),
  };
}
