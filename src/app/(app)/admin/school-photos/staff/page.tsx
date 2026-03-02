// src/app/(app)/admin/school-photos/staff/page.tsx
//
// ============================================================
// WattleOS V2 - Staff Photo Gallery (Module R)
// ============================================================

import Link from "next/link";
import { requirePermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { listStaffPhotos } from "@/lib/actions/school-photos";
import { StaffPhotoGalleryClient } from "./staff-gallery-client";

export default async function StaffPhotosPage() {
  await requirePermission(Permissions.VIEW_SCHOOL_PHOTOS);

  const result = await listStaffPhotos({
    session_id: null,
    person_type: null,
    class_id: null,
    search: null,
    page: 1,
    per_page: 50,
  });

  return (
    <div className="p-6 space-y-6">
      {/* Breadcrumb */}
      <nav
        className="flex items-center gap-2 text-sm"
        style={{ color: "var(--muted-foreground)" }}
      >
        <Link
          href="/admin/school-photos"
          className="hover:underline"
          style={{ color: "var(--primary)" }}
        >
          School Photos
        </Link>
        <span>/</span>
        <span>Staff</span>
      </nav>

      <div className="flex items-center justify-between">
        <h1
          className="text-2xl font-bold"
          style={{ color: "var(--foreground)" }}
        >
          Staff Photos
        </h1>
        {result.data ? (
          <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
            {result.data.staff.filter((s) => s.has_photo).length} of{" "}
            {result.data.total} staff have photos
          </p>
        ) : null}
      </div>

      {result.data ? (
        <StaffPhotoGalleryClient
          initialStaff={result.data.staff}
          initialTotal={result.data.total}
        />
      ) : (
        <p style={{ color: "var(--muted-foreground)" }}>
          Failed to load staff. {result.error?.message}
        </p>
      )}
    </div>
  );
}
