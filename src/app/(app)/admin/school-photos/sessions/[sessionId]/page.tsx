// src/app/(app)/admin/school-photos/sessions/[sessionId]/page.tsx
//
// ============================================================
// WattleOS V2 - Photo Session Detail (Module R)
// ============================================================
// The main bulk upload and matching workflow page. Admin uploads
// photos here, sees auto-matched results, and confirms matches.
// ============================================================

import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import {
  getPhotoSession,
  getSessionPhotos,
  getStudentRoster,
  getStaffRoster,
} from "@/lib/actions/school-photos";
import { SessionDetailClient } from "./session-detail-client";

interface PageProps {
  params: Promise<{ sessionId: string }>;
}

export default async function PhotoSessionDetailPage({ params }: PageProps) {
  const { sessionId } = await params;
  const context = await requirePermission(Permissions.VIEW_SCHOOL_PHOTOS);

  const [sessionResult, photosResult, studentRosterResult, staffRosterResult] =
    await Promise.all([
      getPhotoSession(sessionId),
      getSessionPhotos(sessionId),
      getStudentRoster(),
      getStaffRoster(),
    ]);

  if (!sessionResult.data) {
    notFound();
  }

  const session = sessionResult.data;
  const photos = photosResult.data ?? [];
  const studentRoster = studentRosterResult.data ?? [];
  const staffRoster = staffRosterResult.data ?? [];

  // Determine which roster to show based on session person_type
  const roster =
    session.person_type === "staff"
      ? staffRoster
      : session.person_type === "student"
        ? studentRoster
        : [...studentRoster, ...staffRoster];

  const personType: "student" | "staff" =
    session.person_type === "staff" ? "staff" : "student";

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
        <span>{session.name}</span>
      </nav>

      <SessionDetailClient
        session={session}
        photos={photos}
        roster={roster}
        personType={personType}
        tenantId={context.tenant.id}
      />
    </div>
  );
}
