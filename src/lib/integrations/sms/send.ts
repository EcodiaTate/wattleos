// src/lib/integrations/sms/send.ts
//
// ============================================================
// WattleOS - SMS Send Dispatcher
// ============================================================
// Routes SMS send requests to the correct provider client
// based on the active SmsGatewayConfig.
// Called from server actions only - never client-side.
// ============================================================

import type { SmsGatewayConfig } from "@/types/domain";
import { sendMessageMedia, sendBatchMessageMedia } from "./messagemedia";
import { sendBurst, sendBatchBurst } from "./burst";
import type {
  SmsProviderBatchResult,
  SmsProviderMessage,
  SmsProviderResponse,
} from "./types";

// ── Simple AES decrypt ───────────────────────────────────────
// Keys are encrypted before storage using AES-256-GCM.
// ENCRYPTION_KEY env var: 32-byte hex string.

import { createDecipheriv } from "crypto";

/**
 * Decrypt an AES-256-GCM encrypted field.
 * Stored format: `iv_hex:authTag_hex:ciphertext_hex`
 */
export function decryptField(encrypted: string): string {
  const key = process.env.SMS_ENCRYPTION_KEY;
  if (!key) throw new Error("SMS_ENCRYPTION_KEY is not configured");

  const [ivHex, tagHex, ctHex] = encrypted.split(":");
  if (!ivHex || !tagHex || !ctHex) {
    throw new Error("Invalid encrypted field format");
  }

  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(tagHex, "hex");
  const ciphertext = Buffer.from(ctHex, "hex");
  const keyBuf = Buffer.from(key, "hex");

  const decipher = createDecipheriv("aes-256-gcm", keyBuf, iv);
  decipher.setAuthTag(authTag);

  const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plain.toString("utf8");
}

/**
 * Encrypt a plaintext field for storage.
 */
export function encryptField(plaintext: string): string {
  const key = process.env.SMS_ENCRYPTION_KEY;
  if (!key) throw new Error("SMS_ENCRYPTION_KEY is not configured");

  const { createCipheriv, randomBytes } =
    require("crypto") as typeof import("crypto");
  const iv = randomBytes(12);
  const keyBuf = Buffer.from(key, "hex");
  const cipher = createCipheriv("aes-256-gcm", keyBuf, iv);

  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${iv.toString("hex")}:${tag.toString("hex")}:${ct.toString("hex")}`;
}

// ── Dispatcher ───────────────────────────────────────────────

/**
 * Send a single SMS using the active gateway config.
 */
export async function dispatchSms(
  msg: SmsProviderMessage,
  config: Pick<SmsGatewayConfig, "provider" | "api_key_enc" | "api_secret_enc">,
): Promise<SmsProviderResponse> {
  const apiKey = decryptField(config.api_key_enc);

  if (config.provider === "messagemedia") {
    if (!config.api_secret_enc) {
      return { data: null, error: "MessageMedia requires an API secret" };
    }
    const apiSecret = decryptField(config.api_secret_enc);
    return sendMessageMedia(msg, apiKey, apiSecret);
  }

  if (config.provider === "burst") {
    return sendBurst(msg, apiKey);
  }

  return { data: null, error: `Unknown SMS provider: ${config.provider}` };
}

/**
 * Send a batch of SMS messages using the active gateway config.
 */
export async function dispatchSmsBatch(
  messages: SmsProviderMessage[],
  config: Pick<SmsGatewayConfig, "provider" | "api_key_enc" | "api_secret_enc">,
): Promise<SmsProviderBatchResult> {
  const apiKey = decryptField(config.api_key_enc);

  if (config.provider === "messagemedia") {
    if (!config.api_secret_enc) {
      return { results: [], error: "MessageMedia requires an API secret" };
    }
    const apiSecret = decryptField(config.api_secret_enc);
    return sendBatchMessageMedia(messages, apiKey, apiSecret);
  }

  if (config.provider === "burst") {
    return sendBatchBurst(messages, apiKey);
  }

  return { results: [], error: `Unknown SMS provider: ${config.provider}` };
}
