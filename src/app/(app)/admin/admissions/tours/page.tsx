// src/app/(app)/admin/admissions/tours/page.tsx
//
// ============================================================
// WattleOS V2 - Tour Management Page (Module 13)
// ============================================================
// Server Component. Lists all tour slots with booking counts
// and attendee details. Delegates CRUD operations to the
// TourManagementClient component.
//
// WHY a dedicated route (not a tab): Tour management is a
// distinct workflow - scheduling, capacity tracking, attendance
// recording. It needs enough screen real estate for the slot
// grid that a tab within the pipeline page would be cramped.
// ============================================================

import type { TourSlotWithDetails } from "@/lib/actions/admissions/tour-slots";
import { listTourSlots } from "@/lib/actions/admissions/tour-slots";
import { getTenantContext } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import Link from "next/link";
import { redirect } from "next/navigation";
import { TourManagementClient } from "./tour-management-client";

export default async function TourManagementPage() {
  const context = await getTenantContext();

  if (!context.permissions.includes(Permissions.MANAGE_TOURS)) {
    redirect("/admin/admissions");
  }

  const result = await listTourSlots({ per_page: 50 });
  const slots: TourSlotWithDetails[] = result.data ?? [];
  const total = result.pagination?.total ?? slots.length;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/dashboard" className="hover:text-gray-700">
          Dashboard
        </Link>
        <span>/</span>
        <Link href="/admin/admissions" className="hover:text-gray-700">
          Admissions
        </Link>
        <span>/</span>
        <span className="text-gray-900">Tour Management</span>
      </nav>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">
          Tour Management
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Schedule tours, track bookings, and record attendance. {total} total
          slots.
        </p>
      </div>

      {/* Client component handles CRUD */}
      <TourManagementClient initialSlots={slots} />
    </div>
  );
}
