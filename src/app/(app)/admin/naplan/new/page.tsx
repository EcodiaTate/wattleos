// src/app/(app)/admin/naplan/new/page.tsx
//
// Create a new NAPLAN test window.

import { redirect } from "next/navigation";

import { NaplanWindowForm } from "@/components/domain/naplan/naplan-window-form";
import { requirePermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { currentNaplanYear } from "@/lib/constants/naplan";

export const metadata = { title: "New NAPLAN Window" };

export default async function NewNaplanWindowPage() {
  await requirePermission(Permissions.MANAGE_NAPLAN);

  const defaultYear = currentNaplanYear();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          New NAPLAN Window
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--muted-foreground)" }}>
          Set up a collection year, test dates, and generate a student cohort
        </p>
      </div>

      <NaplanWindowForm defaultYear={defaultYear} />
    </div>
  );
}
