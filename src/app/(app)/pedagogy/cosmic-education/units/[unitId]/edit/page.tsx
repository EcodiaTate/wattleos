// src/app/(app)/pedagogy/cosmic-education/units/[unitId]/edit/page.tsx
// Edit an existing cosmic unit

import { notFound, redirect } from "next/navigation";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import {
  getCosmicUnit,
  listGreatLessons,
} from "@/lib/actions/cosmic-education";
import { CosmicUnitForm } from "@/components/domain/cosmic-education/cosmic-unit-form";

interface Props {
  params: Promise<{ unitId: string }>;
}

export const metadata = { title: "Edit Unit - WattleOS" };

export default async function EditCosmicUnitPage({ params }: Props) {
  const { unitId } = await params;

  const context = await getTenantContext();
  if (!hasPermission(context, Permissions.MANAGE_COSMIC_EDUCATION)) {
    redirect(`/pedagogy/cosmic-education/units/${unitId}`);
  }

  const [unitResult, glResult] = await Promise.all([
    getCosmicUnit(unitId),
    listGreatLessons(),
  ]);

  if (unitResult.error || !unitResult.data) notFound();

  const unit = unitResult.data;
  const greatLessons = glResult.data ?? [];

  return (
    <div className="p-4 md:p-6 pb-tab-bar space-y-5 max-w-2xl">
      <div>
        <a
          href={`/pedagogy/cosmic-education/units/${unitId}`}
          className="text-xs"
          style={{ color: "var(--muted-foreground)" }}
        >
          ← {unit.title}
        </a>
        <h1
          className="text-xl font-semibold mt-2"
          style={{ color: "var(--foreground)" }}
        >
          Edit Unit Plan
        </h1>
      </div>
      <CosmicUnitForm greatLessons={greatLessons} unit={unit} />
    </div>
  );
}
