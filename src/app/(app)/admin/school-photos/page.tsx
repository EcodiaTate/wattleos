// src/app/(app)/admin/school-photos/page.tsx
//
// ============================================================
// WattleOS V2 - School Photos Dashboard (Module R)
// ============================================================
// Server component that fetches photo dashboard data and renders
// the main overview: coverage stats, session list, quick actions.
// ============================================================

import Link from "next/link";
import { requirePermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { getPhotoDashboard } from "@/lib/actions/school-photos";
import { PhotoDashboardClient } from "@/components/domain/school-photos/photo-dashboard-client";

export default async function SchoolPhotosPage() {
  await requirePermission(Permissions.VIEW_SCHOOL_PHOTOS);

  const result = await getPhotoDashboard();

  if (!result.data) {
    return (
      <div className="p-6">
        <h1
          className="text-2xl font-bold"
          style={{ color: "var(--foreground)" }}
        >
          School Photos
        </h1>
        <p className="mt-4" style={{ color: "var(--muted-foreground)" }}>
          Failed to load dashboard. {result.error?.message}
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-2xl font-bold"
            style={{ color: "var(--foreground)" }}
          >
            📸 School Photos
          </h1>
          <p
            className="mt-1 text-sm"
            style={{ color: "var(--muted-foreground)" }}
          >
            Manage student and staff photos, generate ID cards
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/school-photos/id-cards"
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium active-push touch-target"
            style={{
              color: "var(--foreground)",
              backgroundColor: "var(--background)",
            }}
          >
            ID Cards
          </Link>
          <Link
            href="/admin/school-photos/sessions/new"
            className="rounded-lg px-4 py-2 text-sm font-medium active-push touch-target"
            style={{
              backgroundColor: "var(--primary)",
              color: "var(--primary-foreground)",
            }}
          >
            New Session
          </Link>
        </div>
      </div>

      <PhotoDashboardClient dashboard={result.data} />
    </div>
  );
}
