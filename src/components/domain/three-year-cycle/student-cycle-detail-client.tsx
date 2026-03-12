"use client";

// src/components/domain/three-year-cycle/student-cycle-detail-client.tsx
//
// Longitudinal view for a single student: full timeline of all
// materials in their 3-year band, grouped by area.
// Shows: first introduced → first practiced → first mastered
// and a progress bar per area.

import Link from "next/link";
import type {
  StudentCycleProfile,
  CycleMaterialProgress,
  MontessoriArea,
} from "@/types/domain";
import { CycleAreaBadge, CycleProgressBadge } from "./cycle-area-badge";

const AREAS: MontessoriArea[] = [
  "practical_life",
  "sensorial",
  "language",
  "mathematics",
  "cultural",
];

const AREA_LABELS: Record<MontessoriArea, string> = {
  practical_life: "Practical Life",
  sensorial: "Sensorial",
  language: "Language",
  mathematics: "Mathematics",
  cultural: "Cultural",
};

const AREA_EMOJIS: Record<MontessoriArea, string> = {
  practical_life: "🧹",
  sensorial: "👁️",
  language: "🔤",
  mathematics: "🔢",
  cultural: "🌍",
};

const AGE_BAND_LABELS: Record<string, string> = {
  "0_3": "0–3 years",
  "3_6": "3–6 years",
  "6_9": "6–9 years",
  "9_12": "9–12 years",
};

function formatDate(iso: string | null): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function AreaProgressBar({
  mastered,
  total,
  pct,
}: {
  mastered: number;
  total: number;
  pct: number;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
      <div
        style={{
          flex: 1,
          height: 8,
          borderRadius: 9999,
          background: "var(--muted)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            borderRadius: 9999,
            background: "var(--primary)",
            transition: "width 0.4s ease",
          }}
        />
      </div>
      <span
        style={{ fontSize: 12, color: "var(--muted-foreground)", minWidth: 52 }}
      >
        {mastered}/{total} mastered
      </span>
    </div>
  );
}

function MaterialRow({ mat }: { mat: CycleMaterialProgress }) {
  const hasActivity =
    mat.first_introduced || mat.first_practiced || mat.first_mastered;

  return (
    <tr
      style={{ borderBottom: "1px solid var(--border)" }}
    >
      <td className="py-2.5 pr-3 pl-4">
        <div className="font-medium text-sm" style={{ color: "var(--foreground)" }}>
          {mat.material_name}
        </div>
        {mat.lesson_count > 0 && (
          <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
            {mat.lesson_count} lesson{mat.lesson_count !== 1 ? "s" : ""}
          </div>
        )}
      </td>
      <td className="py-2.5 pr-3 text-center">
        <CycleProgressBadge level={mat.level} />
      </td>
      <td
        className="py-2.5 pr-3 text-center"
        style={{ fontSize: 12, color: "var(--muted-foreground)" }}
      >
        {formatDate(mat.first_introduced)}
      </td>
      <td
        className="py-2.5 pr-3 text-center"
        style={{ fontSize: 12, color: "var(--muted-foreground)" }}
      >
        {formatDate(mat.first_practiced)}
      </td>
      <td
        className="py-2.5 pr-4 text-center"
        style={{
          fontSize: 12,
          color: mat.first_mastered
            ? "var(--primary)"
            : "var(--muted-foreground)",
          fontWeight: mat.first_mastered ? 600 : 400,
        }}
      >
        {formatDate(mat.first_mastered)}
      </td>
    </tr>
  );
}

interface StudentCycleDetailClientProps {
  profile: StudentCycleProfile;
}

export function StudentCycleDetailClient({
  profile,
}: StudentCycleDetailClientProps) {
  // Split materials by area, preserve sequence order
  const materialsByArea = new Map<MontessoriArea, CycleMaterialProgress[]>();
  for (const area of AREAS) {
    materialsByArea.set(
      area,
      profile.materials
        .filter((m) => m.area === area)
        .sort((a, b) => a.sequence_order - b.sequence_order),
    );
  }

  const displayName = profile.preferred_name
    ? `${profile.student_name.split(" ")[0]} "${profile.preferred_name}" ${profile.student_name.split(" ").slice(1).join(" ")}`
    : profile.student_name;

  return (
    <div className="space-y-6">
      {/* Breadcrumb + header */}
      <div>
        <Link
          href="/pedagogy/three-year-cycle"
          style={{ fontSize: 13, color: "var(--primary)", textDecoration: "none" }}
        >
          ← Three-Year Cycle
        </Link>
        <div className="mt-2 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>
              {displayName}
            </h1>
            <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
              {AGE_BAND_LABELS[profile.age_band] ?? profile.age_band} band
              {profile.enrollment_start && (
                <> · Enrolled {formatDate(profile.enrollment_start)}</>
              )}
              {profile.dob && (
                <> · Born {formatDate(profile.dob)}</>
              )}
            </p>
          </div>
          <div
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: "var(--primary)",
              minWidth: 64,
              textAlign: "right",
            }}
          >
            {profile.overall_mastery_pct}%
            <div style={{ fontSize: 11, fontWeight: 400, color: "var(--muted-foreground)", textAlign: "right" }}>
              overall mastery
            </div>
          </div>
        </div>
      </div>

      {/* Area summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {profile.area_summaries.map((summary) => (
          <div
            key={summary.area}
            className="rounded-lg border border-border p-3 space-y-1.5"
            style={{ background: "var(--background)" }}
          >
            <div className="flex items-center gap-1.5">
              <span style={{ fontSize: 16 }}>{AREA_EMOJIS[summary.area]}</span>
              <span
                className="text-xs font-medium"
                style={{ color: "var(--foreground)" }}
              >
                {AREA_LABELS[summary.area]}
              </span>
            </div>
            <CycleAreaBadge
              level={summary.mastery_level}
              pct={summary.mastery_pct}
              size="sm"
            />
            <div
              style={{
                height: 4,
                borderRadius: 9999,
                background: "var(--muted)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${summary.mastery_pct}%`,
                  height: "100%",
                  borderRadius: 9999,
                  background: "var(--primary)",
                }}
              />
            </div>
            <div style={{ fontSize: 10, color: "var(--muted-foreground)" }}>
              {summary.mastered} mastered · {summary.practicing} practicing ·{" "}
              {summary.introduced} introduced
            </div>
          </div>
        ))}
      </div>

      {/* No materials message */}
      {profile.materials.length === 0 && (
        <div
          className="rounded-lg border border-border p-10 text-center"
          style={{ color: "var(--muted-foreground)" }}
        >
          No materials configured for the{" "}
          {AGE_BAND_LABELS[profile.age_band] ?? profile.age_band} band yet.
        </div>
      )}

      {/* Per-area material tables */}
      {AREAS.map((area) => {
        const mats = materialsByArea.get(area) ?? [];
        if (mats.length === 0) return null;
        const summary = profile.area_summaries.find((s) => s.area === area);

        return (
          <div
            key={area}
            className="rounded-lg border border-border overflow-hidden"
          >
            {/* Area header */}
            <div
              className="flex items-center justify-between px-4 py-3 border-b border-border"
              style={{ background: "var(--muted)" }}
            >
              <div className="flex items-center gap-2">
                <span style={{ fontSize: 18 }}>{AREA_EMOJIS[area]}</span>
                <span
                  className="font-semibold"
                  style={{ color: "var(--foreground)" }}
                >
                  {AREA_LABELS[area]}
                </span>
              </div>
              {summary && (
                <div className="flex items-center gap-3 flex-1 ml-4">
                  <AreaProgressBar
                    mastered={summary.mastered}
                    total={summary.total_materials}
                    pct={summary.mastery_pct}
                  />
                  <CycleAreaBadge level={summary.mastery_level} size="sm" />
                </div>
              )}
            </div>

            {/* Materials table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    <th
                      className="px-4 py-2 text-left text-xs font-medium"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      Material
                    </th>
                    <th
                      className="px-3 py-2 text-center text-xs font-medium"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      Stage
                    </th>
                    <th
                      className="px-3 py-2 text-center text-xs font-medium"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      Introduced
                    </th>
                    <th
                      className="px-3 py-2 text-center text-xs font-medium"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      Practicing
                    </th>
                    <th
                      className="px-4 py-2 text-center text-xs font-medium"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      Mastered
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {mats.map((mat) => (
                    <MaterialRow key={mat.material_id} mat={mat} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      {/* Stats footer */}
      {profile.total_lessons > 0 && (
        <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
          {profile.total_lessons} total lesson record
          {profile.total_lessons !== 1 ? "s" : ""} across all materials in this
          band
        </p>
      )}
    </div>
  );
}
