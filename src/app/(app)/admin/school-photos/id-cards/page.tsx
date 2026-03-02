// src/app/(app)/admin/school-photos/id-cards/page.tsx
//
// ============================================================
// WattleOS V2 - ID Card Management Page (Module R)
// ============================================================
// Configure ID card templates and batch-generate ID card PDFs.
// ============================================================

import Link from "next/link";
import { requirePermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { getIdCardTemplates } from "@/lib/actions/school-photos";
import { IdCardsClient } from "./id-cards-client";

export default async function IdCardsPage() {
  const context = await requirePermission(Permissions.MANAGE_SCHOOL_PHOTOS);

  const templatesResult = await getIdCardTemplates();

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
        <span>ID Cards</span>
      </nav>

      <h1 className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>
        ID Card Management
      </h1>
      <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
        Configure card templates and generate ID cards for students and staff.
      </p>

      <IdCardsClient
        templates={templatesResult.data ?? []}
        schoolName={context.tenant.name}
        schoolLogoUrl={context.tenant.logo_url ?? null}
      />
    </div>
  );
}
