// src/lib/integrations/sms/burst.ts
//
// ============================================================
// WattleOS - Burst SMS Client
// ============================================================
// Burst SMS REST API: https://api.burstsms.com.au
// Auth: HTTP Basic - base64(apiKey:) (no secret, key only)
// Endpoint: https://api.burstsms.com.au/api/v1/sms.json
// ============================================================

import type {
  SmsProviderBatchResult,
  SmsProviderMessage,
  SmsProviderResponse,
} from "./types";

const BURST_API_BASE = "https://api.burstsms.com.au/api/v1";

function burstAuthHeader(apiKey: string): string {
  // Burst uses key-only basic auth (no secret)
  const creds = Buffer.from(`${apiKey}:`).toString("base64");
  return `Basic ${creds}`;
}

/**
 * Send a single SMS via Burst SMS.
 */
export async function sendBurst(
  msg: SmsProviderMessage,
  apiKey: string,
): Promise<SmsProviderResponse> {
  try {
    const params = new URLSearchParams({
      to: msg.recipient_phone,
      from: msg.sender_id,
      message: msg.message_body,
    });
    if (msg.reference) {
      params.set("ref", msg.reference);
    }

    const res = await fetch(`${BURST_API_BASE}/sms.json`, {
      method: "POST",
      headers: {
        Authorization: burstAuthHeader(apiKey),
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: params.toString(),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "No response body");
      return { data: null, error: `Burst SMS error ${res.status}: ${text}` };
    }

    const json = (await res.json()) as {
      message_id?: string;
      recipients?: { message_id?: string }[];
    };

    const msgId = json.message_id ?? json.recipients?.[0]?.message_id;

    if (!msgId) {
      return { data: null, error: "Burst SMS returned no message ID" };
    }

    return {
      data: { provider_message_id: msgId, status: "sent" },
      error: null,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { data: null, error: `Burst SMS send failed: ${message}` };
  }
}

/**
 * Send multiple messages via Burst SMS.
 * Burst doesn't have a native batch endpoint, so we fan-out with
 * individual requests (rate-limited to avoid hitting API limits).
 */
export async function sendBatchBurst(
  messages: SmsProviderMessage[],
  apiKey: string,
): Promise<SmsProviderBatchResult> {
  const results: SmsProviderBatchResult["results"] = [];

  // Fire concurrently in groups of 10 to respect Burst rate limits
  const CONCURRENCY = 10;
  for (let i = 0; i < messages.length; i += CONCURRENCY) {
    const chunk = messages.slice(i, i + CONCURRENCY);
    const settled = await Promise.allSettled(
      chunk.map((msg) => sendBurst(msg, apiKey)),
    );
    for (let j = 0; j < chunk.length; j++) {
      const result = settled[j];
      if (result.status === "fulfilled") {
        const r = result.value;
        results.push({
          phone: chunk[j].recipient_phone,
          message_id: r.data?.provider_message_id ?? null,
          error: r.error,
        });
      } else {
        results.push({
          phone: chunk[j].recipient_phone,
          message_id: null,
          error: String(result.reason),
        });
      }
    }
  }

  return { results, error: null };
}
