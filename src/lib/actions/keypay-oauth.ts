'use server';

/**
 * src/lib/actions/keypay-oauth.ts
 *
 * ============================================================
 * KeyPay OAuth Server Actions
 * ============================================================
 * Server actions for initiating OAuth flow and disconnecting.
 */

import { getTenantContext, requirePermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import KeyPayClient from "@/lib/integrations/keypay/client";
import {
  generateStateToken,
  storeOAuthState,
  disconnectKeyPay,
  getKeyPayTokens,
} from "@/lib/integrations/keypay/oauth";
import type { ActionResponse } from "@/types/api";
import { ErrorCodes, failure, success } from "@/types/api";

/**
 * Get the KeyPay authorization URL to redirect user for OAuth.
 */
export async function getKeyPayAuthorizationUrl(): Promise<
  ActionResponse<{ authorizationUrl: string }>
> {
  try {
    const context = await requirePermission(Permissions.MANAGE_INTEGRATIONS);

    // Validate environment variables
    if (
      !process.env.KEYPAY_CLIENT_ID ||
      !process.env.KEYPAY_CLIENT_SECRET ||
      !process.env.KEYPAY_REDIRECT_URI
    ) {
      return failure(
        "KeyPay OAuth configuration not set up on the server",
        ErrorCodes.VALIDATION_ERROR
      );
    }

    // Generate state token for CSRF protection
    const state = generateStateToken();
    await storeOAuthState(context.tenant.id, state);

    // Create KeyPay client and get authorization URL
    const keypayClient = new KeyPayClient({
      clientId: process.env.KEYPAY_CLIENT_ID,
      clientSecret: process.env.KEYPAY_CLIENT_SECRET,
      redirectUri: process.env.KEYPAY_REDIRECT_URI,
    });

    const authorizationUrl = keypayClient.getAuthorizationUrl(state);

    return success({ authorizationUrl });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to get authorization URL";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

/**
 * Check if KeyPay is connected for the current tenant.
 */
export async function checkKeyPayStatus(): Promise<
  ActionResponse<{
    isConnected: boolean;
    partnerId?: string;
    connectedAt?: string;
  }>
> {
  try {
    const context = await requirePermission(Permissions.MANAGE_INTEGRATIONS);

    const tokens = await getKeyPayTokens(context.tenant.id);

    if (!tokens) {
      return success({ isConnected: false });
    }

    return success({
      isConnected: true,
      partnerId: tokens.partnerId,
      connectedAt: tokens.connectedAt,
    });
  } catch (err) {
    // If error, assume not connected
    return success({ isConnected: false });
  }
}

/**
 * Disconnect KeyPay integration (remove tokens).
 */
export async function disconnectKeyPayIntegration(): Promise<
  ActionResponse<{ disconnected: boolean }>
> {
  try {
    const context = await requirePermission(Permissions.MANAGE_INTEGRATIONS);

    await disconnectKeyPay(context.tenant.id);

    return success({ disconnected: true });
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "Failed to disconnect KeyPay integration";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}
