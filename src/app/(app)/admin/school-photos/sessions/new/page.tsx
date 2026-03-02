// src/app/(app)/admin/school-photos/sessions/new/page.tsx
//
// ============================================================
// WattleOS V2 - New Photo Session Page (Module R)
// ============================================================

import Link from "next/link";
import { requirePermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { SessionFormWrapper } from "./session-form-wrapper";

export default async function NewPhotoSessionPage() {
  await requirePermission(Permissions.MANAGE_SCHOOL_PHOTOS);

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
        <span>New Session</span>
      </nav>

      <h1 className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>
        Create Photo Session
      </h1>

      <SessionFormWrapper />
    </div>
  );
}
