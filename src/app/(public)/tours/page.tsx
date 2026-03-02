// src/app/(public)/tours/page.tsx
//
// ============================================================
// WattleOS V2 - Public Tour Booking (Module 13)
// ============================================================
// Server Component. Resolves tenant, fetches available tour
// slots with remaining capacity, and renders the TourBooking
// client component.
//
// Route: {school}.wattleos.au/tours
//
// WHY public: Prospective families should see tour availability
// without creating an account. Booking links the tour slot to
// their existing waitlist entry (found by email match).
// ============================================================

import type { AvailableTourSlot } from "@/lib/actions/admissions/tour-slots";
import { getAvailableTourSlots } from "@/lib/actions/admissions/tour-slots";
import { getToursConfig } from "@/lib/actions/admissions/tours-config";
import { resolvePublicTenant } from "@/lib/auth/public-tenant";
import { PublicPageShell } from "@/components/public/PublicPageShell";
import { DEFAULT_TOURS_CONFIG } from "@/types/domain";
import { TourBookingClient } from "./tour-booking-client";

interface ToursPageProps {
  searchParams: Promise<{ tenant?: string }>;
}

export default async function ToursPage({ searchParams }: ToursPageProps) {
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
            We couldn&apos;t find the school associated with this URL.
          </p>
        </div>
      </div>
    );
  }

  const [slotsResult, configResult] = await Promise.all([
    getAvailableTourSlots(tenant.id),
    getToursConfig(tenant.id),
  ]);
  const slots: AvailableTourSlot[] = slotsResult.data ?? [];
  const config = configResult.data ?? DEFAULT_TOURS_CONFIG;

  return (
    <PublicPageShell tenant={tenant}>
      <div className="mx-auto max-w-2xl px-4 py-10">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-foreground">Book a Tour</h1>
          <p className="mt-2 text-base text-muted-foreground">
            {config.welcome_message ?? `Come and see ${tenant.name} in action`}
          </p>
        </div>
        <TourBookingClient
          slots={slots}
          tenantId={tenant.id}
          tenantSlug={tenant.slug}
          schoolName={tenant.name}
          customQuestions={config.custom_questions}
        />
      </div>
    </PublicPageShell>
  );
}
