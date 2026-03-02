// src/lib/integrations/email/resend.ts
//
// ============================================================
// WattleOS V2 - Resend Email Integration Client
// ============================================================
// Isolated integration module for transactional email via Resend.
// All email sending goes through this module - no direct Resend
// calls from actions or components.
//
// DEPENDENCY: npm install resend
// ============================================================

import { Resend } from "resend";

// ============================================================
// Types
// ============================================================

export interface SendEmailInput {
  to: string | string[];
  subject: string;
  html: string;
  /** Plain text fallback (recommended for accessibility and spam score). */
  text?: string;
  /** Reply-to address. Defaults to the school's contact email if available. */
  replyTo?: string;
  /** Tags for Resend analytics. */
  tags?: Array<{ name: string; value: string }>;
}

export interface SendEmailResult {
  id: string;
}

// ============================================================
// Client Singleton
// ============================================================

let _resend: Resend | null = null;

export function getResendClient(): Resend {
  if (!_resend) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error(
        "RESEND_API_KEY is not configured. Set it in your environment variables.",
      );
    }
    _resend = new Resend(apiKey);
  }
  return _resend;
}
