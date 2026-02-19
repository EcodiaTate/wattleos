"use client";

import { selectTenantAction } from "@/lib/actions/auth";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface TenantOption {
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  roleName: string;
  logoUrl: string | null;
}

interface TenantPickerClientProps {
  tenants: TenantOption[];
}

export function TenantPickerClient({ tenants }: TenantPickerClientProps) {
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSelect(tenantId: string) {
    setIsLoading(tenantId);
    setError(null);

    const result = await selectTenantAction(tenantId);

    if (result.error) {
      setError(result.error.message);
      setIsLoading(null);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {tenants.map((tenant) => (
        <button
          key={tenant.tenantId}
          onClick={() => handleSelect(tenant.tenantId)}
          disabled={isLoading !== null}
          className="flex w-full items-center gap-4 rounded-lg border border-gray-200 p-4 text-left transition-colors hover:border-amber-300 hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-amber-100 text-lg font-bold text-amber-700">
            {tenant.logoUrl ? (
              <img
                src={tenant.logoUrl}
                alt={tenant.tenantName}
                className="h-12 w-12 rounded-lg object-cover"
              />
            ) : (
              tenant.tenantName.charAt(0).toUpperCase()
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-gray-900">
              {tenant.tenantName}
            </p>
            <p className="text-xs text-gray-500">{tenant.roleName}</p>
          </div>
          {isLoading === tenant.tenantId && (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
          )}
        </button>
      ))}
    </div>
  );
}
