/**
 * src/lib/integrations/keypay/oauth.ts
 *
 * ============================================================
 * KeyPay OAuth Handler
 * ============================================================
 * Manages OAuth flow: generates state token, exchanges
 * authorization code for access token, stores encrypted
 * tokens in database.
 */

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { encryptField, decryptField } from "@/lib/utils/encryption";
import crypto from "crypto";

/**
 * Generate PKCE state token for OAuth flow (CSRF protection).
 */
export function generateStateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Store OAuth state token temporarily (expires in 10 minutes).
 * Used for CSRF protection during OAuth callback.
 */
export async function storeOAuthState(
  tenantId: string,
  state: string
): Promise<void> {
  const supabase = await createSupabaseServerClient();

  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  const { error } = await supabase.from("oauth_state_tokens").insert({
    tenant_id: tenantId,
    state,
    expires_at: expiresAt.toISOString(),
  });

  if (error) {
    throw new Error(`Failed to store OAuth state: ${error.message}`);
  }
}

/**
 * Verify OAuth state token. Returns tenant ID if valid, null if invalid/expired.
 * Automatically deletes the state token after verification.
 */
export async function verifyOAuthState(
  state: string
): Promise<{ tenantId: string } | null> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("oauth_state_tokens")
    .select("tenant_id, expires_at")
    .eq("state", state)
    .single();

  if (error || !data) {
    return null;
  }

  const typedData = data as {
    tenant_id: string;
    expires_at: string;
  };

  // Check if expired
  if (new Date(typedData.expires_at) < new Date()) {
    // Clean up expired token
    await supabase.from("oauth_state_tokens").delete().eq("state", state);
    return null;
  }

  // Token is valid. Delete it now (one-time use).
  await supabase.from("oauth_state_tokens").delete().eq("state", state);

  return { tenantId: typedData.tenant_id };
}

/**
 * Store encrypted KeyPay tokens in payroll_settings.
 * This is called after successful OAuth exchange.
 */
export async function storeKeyPayTokens(
  tenantId: string,
  accessToken: string,
  refreshToken: string,
  expiresIn: number,
  partnerId: string
): Promise<void> {
  const supabase = await createSupabaseServerClient();

  // Encrypt sensitive tokens before storing
  const encryptedAccessToken = encryptField(accessToken);
  const encryptedRefreshToken = encryptField(refreshToken);

  const expiresAt = new Date(Date.now() + expiresIn * 1000);

  const { error } = await supabase
    .from("payroll_settings")
    .update({
      payroll_provider: "keypay",
      provider_config: {
        access_token: encryptedAccessToken,
        refresh_token: encryptedRefreshToken,
        expires_at: expiresAt.toISOString(),
        partner_id: partnerId,
        connected_at: new Date().toISOString(),
      },
    })
    .eq("tenant_id", tenantId);

  if (error) {
    throw new Error(`Failed to store KeyPay tokens: ${error.message}`);
  }
}

/**
 * Get decrypted KeyPay tokens from payroll_settings.
 * Returns null if not configured or provider is not keypay.
 */
export async function getKeyPayTokens(
  tenantId: string
): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  partnerId: string;
  connectedAt: string;
} | null> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("payroll_settings")
    .select("payroll_provider, provider_config")
    .eq("tenant_id", tenantId)
    .single();

  if (error || !data) {
    return null;
  }

  const typed = data as {
    payroll_provider: string;
    provider_config: Record<string, string>;
  };

  if (typed.payroll_provider !== "keypay" || !typed.provider_config) {
    return null;
  }

  const config = typed.provider_config;

  // Decrypt sensitive tokens
  const accessToken = decryptField(config.access_token as string);
  const refreshToken = decryptField(config.refresh_token as string);

  return {
    accessToken,
    refreshToken,
    expiresAt: config.expires_at ?? "",
    partnerId: config.partner_id ?? "",
    connectedAt: config.connected_at ?? "",
  };
}

/**
 * Disconnect KeyPay (remove tokens from payroll_settings).
 */
export async function disconnectKeyPay(tenantId: string): Promise<void> {
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from("payroll_settings")
    .update({
      payroll_provider: null,
      provider_config: null,
    })
    .eq("tenant_id", tenantId);

  if (error) {
    throw new Error(`Failed to disconnect KeyPay: ${error.message}`);
  }
}
