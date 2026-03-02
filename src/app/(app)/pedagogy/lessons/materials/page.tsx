import { redirect } from "next/navigation";
import Link from "next/link";
import {
  getTenantContext,
  hasPermission,
} from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { getMaterialLibrary } from "@/lib/actions/lesson-tracking";
import type { MontessoriArea } from "@/types/domain";

export const metadata = { title: "Material Library - WattleOS" };

const AREA_LABELS: Record<MontessoriArea, string> = {
  practical_life: "Practical Life",
  sensorial: "Sensorial",
  language: "Language",
  mathematics: "Mathematics",
  cultural: "Cultural",
};

const AREA_COLORS: Record<MontessoriArea, string> = {
  practical_life: "var(--mastery-emerging)",
  sensorial: "var(--primary)",
  language: "var(--success)",
  mathematics: "var(--warning)",
  cultural: "var(--mastery-consolidating)",
};

export default async function MaterialLibraryPage() {
  const context = await getTenantContext();

  if (
    !hasPermission(context, Permissions.VIEW_LESSON_RECORDS) &&
    !hasPermission(context, Permissions.MANAGE_LESSON_RECORDS)
  ) {
    redirect("/dashboard");
  }

  const result = await getMaterialLibrary();
  const materials = result.data ?? [];

  // Group by area
  const grouped: Record<MontessoriArea, typeof materials> = {
    practical_life: [],
    sensorial: [],
    language: [],
    mathematics: [],
    cultural: [],
  };
  for (const m of materials) {
    grouped[m.area]?.push(m);
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex items-center gap-2 text-sm">
        <Link
          href="/pedagogy/lessons"
          className="underline-offset-2 hover:underline"
          style={{ color: "var(--primary)" }}
        >
          Lessons
        </Link>
        <span style={{ color: "var(--muted-foreground)" }}>/</span>
        <span style={{ color: "var(--foreground)" }}>Material Library</span>
      </div>

      <div>
        <h1
          className="text-xl font-bold sm:text-2xl"
          style={{ color: "var(--foreground)" }}
        >
          Montessori Material Library
        </h1>
        <p
          className="mt-1 text-sm"
          style={{ color: "var(--muted-foreground)" }}
        >
          {materials.length} active materials across {Object.keys(AREA_LABELS).length} curriculum areas
        </p>
      </div>

      {(Object.entries(grouped) as [MontessoriArea, typeof materials][]).map(
        ([area, areaMaterials]) => {
          if (areaMaterials.length === 0) return null;
          return (
            <div key={area}>
              <h2
                className="mb-3 flex items-center gap-2 text-sm font-semibold"
                style={{ color: "var(--foreground)" }}
              >
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ background: AREA_COLORS[area] }}
                />
                {AREA_LABELS[area]} ({areaMaterials.length})
              </h2>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {areaMaterials.map((material) => (
                  <div
                    key={material.id}
                    className="rounded-[var(--radius-md)] border border-border p-3"
                    style={{ background: "var(--card)" }}
                  >
                    <p
                      className="text-sm font-medium"
                      style={{ color: "var(--foreground)" }}
                    >
                      {material.name}
                    </p>
                    {material.description && (
                      <p
                        className="mt-0.5 text-xs line-clamp-2"
                        style={{ color: "var(--muted-foreground)" }}
                      >
                        {material.description}
                      </p>
                    )}
                    <div
                      className="mt-1 flex items-center gap-2 text-xs"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      <span>Age: {material.age_level.replace("_", "-")}</span>
                      {material.eylf_outcome_codes.length > 0 && (
                        <span>EYLF: {material.eylf_outcome_codes.join(", ")}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        },
      )}
    </div>
  );
}
