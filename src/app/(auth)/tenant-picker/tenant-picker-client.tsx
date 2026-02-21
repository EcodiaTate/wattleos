"use client";

// ============================================================
// WattleOS V2 - Tenant Picker Client Component
// ============================================================
// WHY client component: Needs onClick handlers and loading state.
// Uses selectTenantAction (Server Action) which properly:
//   1. Validates tenant membership
//   2. Updates app_metadata via admin client
//   3. Calls refreshSession() to re-mint the JWT
//   4. Sets the new JWT cookie (Server Actions can set cookies)
//
// autoSelect prop: When true, automatically selects the first
// tenant on mount. Used for single-tenant users who shouldn't
// see a picker UI - they just need the JWT stamped correctly.
// ============================================================

import { selectTenantAction } from "@/lib/actions/auth";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

interface TenantOption {
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  roleName: string;
  logoUrl: string | null;
}

interface TenantPickerClientProps {
  tenants: TenantOption[];
  /** When true, automatically select the first tenant on mount. */
  autoSelect?: boolean;
}

export function TenantPickerClient({
  tenants,
  autoSelect = false,
}: TenantPickerClientProps) {
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Guard against double-invocation in React Strict Mode
  const autoSelectFired = useRef(false);

  async function handleSelect(tenantId: string) {
    setIsLoading(tenantId);
    setError(null);

    const result = await selectTenantAction(tenantId);

    if (result.error) {
      setError(
        typeof result.error === "string" ? result.error : result.error.message
      );
      setIsLoading(null);
      return;
    }

    // Navigate to dashboard. router.refresh() ensures the server
    // re-renders with the fresh JWT that now contains tenant_id.
    router.push("/dashboard");
    router.refresh();
  }

  // Auto-select the first (only) tenant on mount
  useEffect(() => {
    if (autoSelect && tenants.length > 0 && !autoSelectFired.current) {
      autoSelectFired.current = true;
      handleSelect(tenants[0].tenantId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSelect]);

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-md bg-red-50 p-[var(--density-card-padding)] text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Show a spinner during auto-select instead of the full picker */}
      {autoSelect && isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        tenants.map((tenant) => (
          <button
            key={tenant.tenantId}
            onClick={() => handleSelect(tenant.tenantId)}
            disabled={isLoading !== null}
            className="flex w-full items-center gap-[var(--density-card-padding)] rounded-lg border border-border p-[var(--density-card-padding)] text-left transition-colors hover:border-amber-300 hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <div className="flex h-[var(--density-button-height)] w-12 flex-shrink-0 items-center justify-center rounded-lg bg-amber-100 text-lg font-bold text-amber-700">
              {tenant.logoUrl ? (
                <img
                  src={tenant.logoUrl}
                  alt={tenant.tenantName}
                  className="h-[var(--density-button-height)] w-12 rounded-lg object-cover"
                />
              ) : (
                tenant.tenantName.charAt(0).toUpperCase()
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">
                {tenant.tenantName}
              </p>
              <p className="text-xs text-muted-foreground">
                {tenant.roleName}
              </p>
            </div>
            {isLoading === tenant.tenantId && (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            )}
          </button>
        ))
      )}
    </div>
  );
}