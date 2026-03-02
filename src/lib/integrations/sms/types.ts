// src/lib/integrations/sms/types.ts
//
// Shared types for SMS provider clients.

export interface SmsProviderMessage {
  recipient_phone: string;
  message_body: string;
  sender_id: string;
  reference?: string;
}

export interface SmsProviderResult {
  provider_message_id: string;
  status: "sent" | "queued";
}

export interface SmsProviderResponse {
  data: SmsProviderResult | null;
  error: string | null;
}

export interface SmsProviderBatchResult {
  /** map from recipient_phone → providerMessageId (or error) */
  results: { phone: string; message_id: string | null; error: string | null }[];
  error: string | null;
}
