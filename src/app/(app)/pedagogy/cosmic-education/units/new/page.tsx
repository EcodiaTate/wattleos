// src/app/(app)/pedagogy/cosmic-education/units/new/page.tsx
// Create a new cosmic unit

import { redirect } from "next/navigation";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { listGreatLessons } from "@/lib/actions/cosmic-education";
import { CosmicUnitForm } from "@/components/domain/cosmic-education/cosmic-unit-form";

export const metadata = { title: "New Cosmic Unit - WattleOS" };

export default async function NewCosmicUnitPage() {
  const context = await getTenantContext();
  if (!hasPermission(context, Permissions.MANAGE_COSMIC_EDUCATION)) {
    redirect("/pedagogy/cosmic-education");
  }

  const glResult = await listGreatLessons();
  const greatLessons = glResult.data ?? [];

  return (
    <div className="p-4 md:p-6 pb-tab-bar space-y-5 max-w-2xl">
      <div>
        <a
          href="/pedagogy/cosmic-education"
          className="text-xs"
          style={{ color: "var(--muted-foreground)" }}
        >
          ← Cosmic Education
        </a>
        <h1
          className="text-xl font-semibold mt-2"
          style={{ color: "var(--foreground)" }}
        >
          New Unit Plan
        </h1>
        <p
          className="text-sm mt-1"
          style={{ color: "var(--muted-foreground)" }}
        >
          Plan a new cosmic education unit linked to a Great Lesson.
        </p>
      </div>
      <CosmicUnitForm greatLessons={greatLessons} />
    </div>
  );
}
