// src/app/(public)/inquiry/status/page.tsx
//
// ============================================================
// WattleOS V2 - Public Inquiry Status Checker (Module 13)
// ============================================================
// Server Component. Resolves tenant, renders the status
// checker client component.
//
// Route: {school}.wattleos.au/inquiry/status
//
// WHY public: Parents want to check where they are in the
// pipeline without logging in or calling the school. The
// status checker uses email + child name as authentication
// (lightweight, no account needed). Only safe, parent-facing
// fields are exposed - no admin notes, no priority scores.
// ============================================================

import { resolvePublicTenant } from "@/lib/utils/resolve-public-tenant";
import { StatusCheckerClient } from "./status-checker-client";

export default async function InquiryStatusPage() {
  const tenant = await resolvePublicTenant();

  if (!tenant) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="max-w-md rounded-lg border border-gray-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-semibold text-gray-900">
            School Not Found
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            We couldn't find the school associated with this URL.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-lg px-4 py-12">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">{tenant.name}</h1>
          <p className="mt-2 text-lg text-gray-600">
            Check the status of your inquiry
          </p>
        </div>

        <StatusCheckerClient tenantId={tenant.id} schoolName={tenant.name} />
      </div>
    </div>
  );
}
