// src/app/(public)/inquiry/page.tsx
//
// ============================================================
// WattleOS V2 - Public Inquiry Form (Module 13)
// ============================================================
// Server Component wrapper. Resolves tenant from subdomain,
// then renders the InquiryForm client component.
//
// This is the school's "digital front door" - the simplest
// way for a prospective family to express interest. No auth
// required. Lighter than the full enrollment form (Module 10).
//
// Route: {school}.wattleos.au/inquiry
// ============================================================

import { resolvePublicTenant } from "@/lib/utils/resolve-public-tenant";
import { InquiryForm } from "./inquiry-form";

export default async function InquiryPage() {
  const tenant = await resolvePublicTenant();

  if (!tenant) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="max-w-md rounded-lg border border-gray-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-semibold text-gray-900">
            School Not Found
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            We couldn't find the school associated with this URL. Please check
            the link and try again.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-2xl px-4 py-12">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">{tenant.name}</h1>
          <p className="mt-2 text-lg text-gray-600">
            Express your interest in joining our school
          </p>
        </div>

        {/* Form */}
        <InquiryForm tenantId={tenant.id} schoolName={tenant.name} />
      </div>
    </div>
  );
}
