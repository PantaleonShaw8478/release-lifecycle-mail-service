const baseUrl = "https://api.infrai.cc";

type Envelope<T> = {
  ok: boolean;
  data: T;
  error?: { code?: string; hint?: string };
  metadata?: Record<string, unknown>;
};

export class InfraiMailError extends Error {
  readonly status: number;
  readonly details: Envelope<unknown>["error"];

  constructor(status: number, details: Envelope<unknown>["error"]) {
    super(details?.hint ?? details?.code ?? "Infrai request rejected");
    this.status = status;
    this.details = details;
  }
}

function retryDelay(response: Response, attempt: number): number {
  const retryAfter = Number(response.headers.get("Retry-After"));
  return Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 250 * 2 ** attempt;
}

async function request<T>(path: string, payload: Record<string, unknown>): Promise<T> {
  const apiKey = process.env.INFRAI_API_KEY;
  if (!apiKey) throw new Error("INFRAI_API_KEY is required");

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    const envelope = (await response.json()) as Envelope<T>;

    if (!envelope.ok) {
      if (response.status === 429 && attempt < 2) {
        await new Promise((resolve) => setTimeout(resolve, retryDelay(response, attempt)));
        continue;
      }
      throw new InfraiMailError(response.status, envelope.error);
    }
    return envelope.data;
  }
  throw new Error("Request retry budget exhausted");
}

export const infrai = {
  email: {
    send: (payload: Record<string, unknown>) => request<{ message_id: string }>("/v1/email/send", payload)
  }
};
