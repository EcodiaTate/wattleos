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
          <h1 className="text-2xl font-bold text-gray-900">School Not Found</h1>
          <p className="mt-2 text-sm text-gray-500">
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
      <div className="flex min-h-screen flex-col">
        {/* School header */}
        <header className="border-b border-gray-200 bg-white px-6 py-4">
          <div className="mx-auto flex max-w-2xl items-center gap-3">
            {tenant.logo_url && (
              <img
                src={tenant.logo_url}
                alt=""
                className="h-10 w-10 rounded-lg object-cover"
              />
            )}
            <h1 className="text-lg font-semibold text-gray-900">
              {tenant.name}
            </h1>
          </div>
        </header>

        <div className="flex flex-1 items-center justify-center px-4">
          <div className="text-center">
            <h2 className="text-xl font-bold text-gray-900">
              Enrollment Not Currently Open
            </h2>
            <p className="mt-2 text-sm text-gray-500">
              {tenant.name} is not accepting enrollment applications at this
              time. Please check back later or contact the school directly.
            </p>
          </div>
        </div>
      </div>
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
    custom_fields: (p.custom_fields ?? []) as Array<{
      key: string;
      label: string;
      type: string;
      required: boolean;
    }>,
    welcome_message: p.welcome_message,
    confirmation_message: p.confirmation_message,
  }));

  return (
    <div className="flex min-h-screen flex-col">
      {/* School header */}
      <header className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          {tenant.logo_url && (
            <img
              src={tenant.logo_url}
              alt=""
              className="h-10 w-10 rounded-lg object-cover"
            />
          )}
          <h1 className="text-lg font-semibold text-gray-900">{tenant.name}</h1>
        </div>
      </header>

      {/* Wizard */}
      <main className="flex-1 px-4 py-8">
        <EnrollmentWizard
          tenantId={tenant.id}
          schoolName={tenant.name}
          periods={serializedPeriods}
        />
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white px-6 py-4 text-center text-xs text-gray-400">
        Powered by WattleOS
      </footer>
    </div>
  );
}
