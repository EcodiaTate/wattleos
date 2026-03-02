// src/lib/integrations/email/send.ts
//
// ============================================================
// WattleOS V2 - Transactional Email Send
// ============================================================
// Server-side utility for sending transactional emails via
// Resend. Called by server actions (admissions, invitations,
// notifications) - not directly from the client.
//
// FROM address uses the tenant/school name as the display name
// so parents see "Green Valley Montessori" not "WattleOS".
// ============================================================

import {
  getResendClient,
  type SendEmailInput,
  type SendEmailResult,
} from "./resend";

const DEFAULT_FROM_NAME = "WattleOS";
const DEFAULT_FROM_EMAIL = "notifications@wattleos.au";

export interface SendTransactionalEmailInput extends SendEmailInput {
  /** Tenant/school name to use as the sender display name. */
  fromName?: string;
}

export async function sendTransactionalEmail(
  input: SendTransactionalEmailInput,
): Promise<{ data: SendEmailResult | null; error: string | null }> {
  try {
    const resend = getResendClient();
    const fromName = input.fromName ?? DEFAULT_FROM_NAME;
    const from = `${fromName} <${DEFAULT_FROM_EMAIL}>`;

    const result = await resend.emails.send({
      from,
      to: Array.isArray(input.to) ? input.to : [input.to],
      subject: input.subject,
      html: input.html,
      text: input.text,
      replyTo: input.replyTo,
      tags: input.tags,
    });

    if (result.error) {
      return { data: null, error: result.error.message };
    }

    return { data: { id: result.data?.id ?? "" }, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to send email";
    return { data: null, error: message };
  }
}
