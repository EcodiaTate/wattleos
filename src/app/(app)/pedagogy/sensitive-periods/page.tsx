// src/app/(app)/pedagogy/sensitive-periods/page.tsx
// ============================================================
// Sensitive periods overview - all active periods across all students.
// ============================================================

import Link from "next/link";
import { redirect } from "next/navigation";

import { SensitivePeriodsOverviewClient } from "@/components/domain/lessons/sensitive-periods-overview-client";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { listActiveSensitivePeriods } from "@/lib/actions/three-period-lessons";

export const metadata = { title: "Sensitive Periods - WattleOS" };

export default async function SensitivePeriodsPage() {
  const context = await getTenantContext();

  const canView =
    hasPermission(context, Permissions.VIEW_LESSON_RECORDS) ||
    hasPermission(context, Permissions.MANAGE_LESSON_RECORDS);
  if (!canView) redirect("/dashboard");

  const result = await listActiveSensitivePeriods();
  const activePeriods = result.data ?? [];

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1
            className="text-xl font-bold sm:text-2xl"
            style={{ color: "var(--foreground)" }}
          >
            Sensitive Periods
          </h1>
          <p
            className="mt-1 text-sm"
            style={{ color: "var(--muted-foreground)" }}
          >
            Active developmental windows observed across students.
          </p>
        </div>
        <Link
          href="/pedagogy/three-period-lessons"
          className="text-sm"
          style={{ color: "var(--primary)" }}
        >
          ← 3P Lessons
        </Link>
      </div>

      <SensitivePeriodsOverviewClient activePeriods={activePeriods} />
    </div>
  );
}
