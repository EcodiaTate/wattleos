// src/app/(app)/admin/naplan/[windowId]/edit/page.tsx
//
// Edit an existing NAPLAN test window (dates, notes).

import { notFound } from "next/navigation";

import { NaplanWindowForm } from "@/components/domain/naplan/naplan-window-form";
import { getTestWindow } from "@/lib/actions/naplan";
import { requirePermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";

export const metadata = { title: "Edit NAPLAN Window" };

interface Props {
  params: Promise<{ windowId: string }>;
}

export default async function EditNaplanWindowPage({ params }: Props) {
  const { windowId } = await params;
  await requirePermission(Permissions.MANAGE_NAPLAN);

  const result = await getTestWindow(windowId);
  if (result.error || !result.data) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Edit NAPLAN {result.data.collection_year}
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--muted-foreground)" }}>
          Update test dates and notes
        </p>
      </div>
      <NaplanWindowForm window={result.data ?? undefined} />
    </div>
  );
}
