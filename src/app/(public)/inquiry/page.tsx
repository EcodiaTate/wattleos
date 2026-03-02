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

import { resolvePublicTenant } from "@/lib/auth/public-tenant";
import { getInquiryConfig } from "@/lib/actions/admissions/inquiry-config";
import { PublicPageShell } from "@/components/public/PublicPageShell";
import { DEFAULT_INQUIRY_CONFIG } from "@/types/domain";
import { InquiryForm } from "./inquiry-form";

interface InquiryPageProps {
  searchParams: Promise<{ tenant?: string }>;
}

export default async function InquiryPage({ searchParams }: InquiryPageProps) {
  const params = await searchParams;
  const tenant = await resolvePublicTenant(params.tenant);

  if (!tenant) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted">
        <div className="max-w-md rounded-lg border border-border bg-card p-8 text-center shadow-sm">
          <h1 className="text-xl font-semibold text-foreground">
            School Not Found
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            We couldn&apos;t find the school associated with this URL. Please
            check the link and try again.
          </p>
        </div>
      </div>
    );
  }

  const configResult = await getInquiryConfig(tenant.id);
  const config = configResult.data ?? DEFAULT_INQUIRY_CONFIG;

  return (
    <PublicPageShell tenant={tenant}>
      <div className="mx-auto max-w-2xl px-4 py-10">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-foreground">Enquire</h1>
          <p className="mt-2 text-base text-muted-foreground">
            Express your interest in joining {tenant.name}
          </p>
        </div>
        <InquiryForm tenantId={tenant.id} tenantSlug={tenant.slug} schoolName={tenant.name} config={config} />
      </div>
    </PublicPageShell>
  );
}
