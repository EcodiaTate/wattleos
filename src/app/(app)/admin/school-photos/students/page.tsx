// src/app/(app)/admin/school-photos/students/page.tsx
//
// ============================================================
// WattleOS V2 - Student Photo Gallery (Module R)
// ============================================================

import Link from "next/link";
import { requirePermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { listStudentPhotos } from "@/lib/actions/school-photos";
import { StudentPhotoGalleryClient } from "./student-gallery-client";

export default async function StudentPhotosPage() {
  await requirePermission(Permissions.VIEW_SCHOOL_PHOTOS);

  const result = await listStudentPhotos({
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
        <span>Students</span>
      </nav>

      <div className="flex items-center justify-between">
        <h1
          className="text-2xl font-bold"
          style={{ color: "var(--foreground)" }}
        >
          Student Photos
        </h1>
        {result.data ? (
          <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
            {result.data.students.filter((s) => s.has_photo).length} of{" "}
            {result.data.total} students have photos
          </p>
        ) : null}
      </div>

      {result.data ? (
        <StudentPhotoGalleryClient
          initialStudents={result.data.students}
          initialTotal={result.data.total}
        />
      ) : (
        <p style={{ color: "var(--muted-foreground)" }}>
          Failed to load students. {result.error?.message}
        </p>
      )}
    </div>
  );
}
