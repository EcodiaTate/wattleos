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
import { resolvePublicTenant } from "@/lib/utils/resolve-public-tenant";
import { TourBookingClient } from "./tour-booking-client";

export default async function ToursPage() {
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

  const result = await getAvailableTourSlots(tenant.id);
  const slots: AvailableTourSlot[] = result.data ?? [];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-2xl px-4 py-12">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">{tenant.name}</h1>
          <p className="mt-2 text-lg text-gray-600">
            Book a tour to see our school in action
          </p>
        </div>

        <TourBookingClient slots={slots} schoolName={tenant.name} />
      </div>
    </div>
  );
}
