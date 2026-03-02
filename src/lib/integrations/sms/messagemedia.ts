// src/lib/integrations/sms/messagemedia.ts
//
// ============================================================
// WattleOS - MessageMedia SMS Client
// ============================================================
// MessageMedia REST API v1: https://developers.messagemedia.com
// Auth: HTTP Basic - base64(apiKey:apiSecret)
// Endpoint: https://api.messagemedia.com/v1/messages
// ============================================================

import type {
  SmsProviderBatchResult,
  SmsProviderMessage,
  SmsProviderResponse,
} from "./types";

const MM_API_BASE = "https://api.messagemedia.com/v1";

function mmAuthHeader(apiKey: string, apiSecret: string): string {
  const creds = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");
  return `Basic ${creds}`;
}

/**
 * Send a single SMS via MessageMedia.
 * `apiKey` and `apiSecret` are decrypted values (never stored).
 */
export async function sendMessageMedia(
  msg: SmsProviderMessage,
  apiKey: string,
  apiSecret: string,
): Promise<SmsProviderResponse> {
  try {
    const body = {
      messages: [
        {
          content: msg.message_body,
          destination_number: msg.recipient_phone,
          source_number: msg.sender_id,
          ...(msg.reference ? { metadata: { ref: msg.reference } } : {}),
        },
      ],
    };

    const res = await fetch(`${MM_API_BASE}/messages`, {
      method: "POST",
      headers: {
        Authorization: mmAuthHeader(apiKey, apiSecret),
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "No response body");
      return { data: null, error: `MessageMedia error ${res.status}: ${text}` };
    }

    const json = (await res.json()) as {
      messages?: { message_id?: string; status?: string }[];
    };

    const first = json.messages?.[0];
    if (!first?.message_id) {
      return { data: null, error: "MessageMedia returned no message ID" };
    }

    return {
      data: {
        provider_message_id: first.message_id,
        status: first.status === "queued" ? "queued" : "sent",
      },
      error: null,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { data: null, error: `MessageMedia send failed: ${message}` };
  }
}

/**
 * Send multiple SMS messages in a single API call (up to 100 per request).
 */
export async function sendBatchMessageMedia(
  messages: SmsProviderMessage[],
  apiKey: string,
  apiSecret: string,
): Promise<SmsProviderBatchResult> {
  try {
    // MessageMedia supports up to 100 messages per request
    const CHUNK = 100;
    const results: SmsProviderBatchResult["results"] = [];

    for (let i = 0; i < messages.length; i += CHUNK) {
      const chunk = messages.slice(i, i + CHUNK);
      const body = {
        messages: chunk.map((msg) => ({
          content: msg.message_body,
          destination_number: msg.recipient_phone,
          source_number: msg.sender_id,
          ...(msg.reference ? { metadata: { ref: msg.reference } } : {}),
        })),
      };

      const res = await fetch(`${MM_API_BASE}/messages`, {
        method: "POST",
        headers: {
          Authorization: mmAuthHeader(apiKey, apiSecret),
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        // Mark all in chunk as failed
        for (const msg of chunk) {
          results.push({
            phone: msg.recipient_phone,
            message_id: null,
            error: `HTTP ${res.status}: ${text}`,
          });
        }
        continue;
      }

      const json = (await res.json()) as {
        messages?: {
          message_id?: string;
          destination_number?: string;
          status?: string;
        }[];
      };

      for (let j = 0; j < chunk.length; j++) {
        const sent = json.messages?.[j];
        if (sent?.message_id) {
          results.push({
            phone: chunk[j].recipient_phone,
            message_id: sent.message_id,
            error: null,
          });
        } else {
          results.push({
            phone: chunk[j].recipient_phone,
            message_id: null,
            error: "No message ID returned",
          });
        }
      }
    }

    return { results, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { results: [], error: `MessageMedia batch failed: ${message}` };
  }
}
