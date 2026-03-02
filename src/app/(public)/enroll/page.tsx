// src/app/(public)/enroll/page.tsx
//
// ============================================================
// WattleOS V2 - Public Enrollment Form (Module 10)
// ============================================================
// The public-facing enrollment page at {school}.wattleos.au/enroll.
// No authentication required. Resolves tenant from subdomain,
// fetches open enrollment periods, and renders the multi-step
// wizard.
//
// WHY server component wrapper: Tenant resolution and period
// fetching happen server-side. The wizard itself is client-side
// for interactive form management and localStorage draft saving.
// ============================================================

import { getOpenEnrollmentPeriods } from "@/lib/actions/enroll";
import { resolvePublicTenant } from "@/lib/auth/public-tenant";
import { PublicPageShell } from "@/components/public/PublicPageShell";
import { EnrollmentWizard } from "./enrollment-wizard";

export const metadata = {
  title: "Enroll - WattleOS",
};

interface EnrollPageProps {
  searchParams: Promise<{ tenant?: string }>;
}

export default async function EnrollPage({ searchParams }: EnrollPageProps) {
  const params = await searchParams;
  const tenant = await resolvePublicTenant(params.tenant);

  if (!tenant) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">School Not Found</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            We couldn&apos;t identify which school this enrollment form belongs
            to. Please check the URL and try again.
          </p>
        </div>
      </div>
    );
  }

  const periodsResult = await getOpenEnrollmentPeriods(tenant.id);
  const periods = periodsResult.data ?? [];

  if (periods.length === 0) {
    return (
      <PublicPageShell tenant={tenant}>
        <div className="flex flex-1 items-center justify-center px-4 py-20">
          <div className="text-center">
            <h2 className="text-xl font-bold text-foreground">
              Enrolment Not Currently Open
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {tenant.name} is not accepting enrolment applications at this
              time. Please check back later or contact the school directly.
            </p>
            <a
              href="/inquiry"
              className="mt-6 inline-block rounded-lg px-6 py-2.5 text-sm font-semibold pb-btn"
            >
              Submit an Enquiry
            </a>
          </div>
        </div>
      </PublicPageShell>
    );
  }

  // Serialize periods for the client component
  const serializedPeriods = periods.map((p) => ({
    id: p.id,
    name: p.name,
    period_type: p.period_type,
    year: p.year,
    available_programs: (p.available_programs ?? []) as string[],
    required_documents: (p.required_documents ?? []) as string[],
    custom_fields: (p.custom_fields ?? []) as unknown as Array<{
      key: string;
      label: string;
      type: string;
      required: boolean;
    }>,
    welcome_message: p.welcome_message,
    confirmation_message: p.confirmation_message,
  }));

  return (
    <PublicPageShell tenant={tenant}>
      <div className="px-4 py-8">
        <EnrollmentWizard
          tenantId={tenant.id}
          schoolName={tenant.name}
          periods={serializedPeriods}
        />
      </div>
    </PublicPageShell>
  );
}
