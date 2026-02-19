"use client";

import type { ClassHeatmapRow } from "@/lib/actions/mastery";
import type { CurriculumTreeNode } from "@/lib/utils/curriculum-tree";
import {
  MASTERY_STATUS_CONFIG,
  MASTERY_STATUS_ORDER,
} from "@/lib/utils/mastery-status";
import type { MasteryStatus } from "@/types/domain";
import { useState } from "react";

// ============================================================
// Props
// ============================================================
interface ClassHeatmapProps {
  rows: ClassHeatmapRow[];
  tree: CurriculumTreeNode[];
  instanceName: string;
}

// ============================================================
// ClassHeatmap
// ============================================================
export function ClassHeatmap({ rows, tree, instanceName }: ClassHeatmapProps) {
  const [selectedArea, setSelectedArea] = useState<string | null>(
    tree.length > 0 ? tree[0].id : null,
  );
  const [hoveredCell, setHoveredCell] = useState<{
    studentName: string;
    outcomeName: string;
    status: MasteryStatus;
  } | null>(null);

  // Get outcomes for the selected area
  const selectedAreaNode = tree.find((a) => a.id === selectedArea);
  const outcomes: { id: string; title: string; strandTitle: string }[] = [];

  if (selectedAreaNode) {
    for (const strand of selectedAreaNode.children) {
      for (const outcome of strand.children) {
        if (outcome.level === "outcome") {
          outcomes.push({
            id: outcome.id,
            title: outcome.title,
            strandTitle: strand.title,
          });
        }
      }
    }
  }

  return (
    <div className="space-y-4">
      {/* Area selector tabs */}
      <div className="flex flex-wrap gap-2">
        {tree.map((area) => (
          <button
            key={area.id}
            onClick={() => setSelectedArea(area.id)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              selectedArea === area.id
                ? "bg-purple-600 text-primary-foreground"
                : "bg-muted text-foreground hover:bg-gray-200"
            }`}
          >
            {area.title}
          </button>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-[var(--density-card-padding)]">
        {MASTERY_STATUS_ORDER.map((status) => {
          const config = MASTERY_STATUS_CONFIG[status];
          return (
            <div key={status} className="flex items-center gap-1.5">
              <span
                className="inline-block h-3 w-3 rounded-sm"
                style={{ backgroundColor: config.heatmapColor }}
              />
              <span className="text-xs text-muted-foreground">
                {config.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Hover tooltip */}
      {hoveredCell && (
        <div className="rounded-md borderborder-border bg-background px-3 py-2 text-xs shadow-sm">
          <span className="font-semibold">{hoveredCell.studentName}</span>
          {" - "}
          <span className="text-muted-foreground">
            {hoveredCell.outcomeName}
          </span>
          {" - "}
          <span className={MASTERY_STATUS_CONFIG[hoveredCell.status].color}>
            {MASTERY_STATUS_CONFIG[hoveredCell.status].label}
          </span>
        </div>
      )}

      {/* Heatmap grid */}
      {outcomes.length === 0 ? (
        <div className="rounded-lg borderborder-border bg-background p-8 text-center text-sm text-muted-foreground">
          Select an area to view the heatmap.
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-lg borderborder-border bg-background p-8 text-center text-sm text-muted-foreground">
          No students to display. Add students to this class first.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg borderborder-border bg-background">
          <table className="min-w-full">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 border-b border-rborder-border bg-background px-3 py-2 text-left text-xs font-semibold text-foreground">
                  Student
                </th>
                {outcomes.map((outcome) => (
                  <th
                    key={outcome.id}
                    className="border-bborder-border px-1 py-2 text-center"
                    title={`${outcome.strandTitle} → ${outcome.title}`}
                  >
                    <div className="w-8">
                      <span className="block truncate text-[9px] font-normal text-muted-foreground">
                        {abbreviate(outcome.title)}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.student_id} className="hover:bg-background">
                  <td className="sticky left-0 z-10 border-r border-gray-100 bg-background px-3 py-1.5 text-xs font-medium text-foreground">
                    {row.student_first_name} {row.student_last_name}
                  </td>
                  {outcomes.map((outcome) => {
                    const status: MasteryStatus =
                      row.statuses[outcome.id] ?? "not_started";
                    const config = MASTERY_STATUS_CONFIG[status];
                    return (
                      <td
                        key={outcome.id}
                        className="border-gray-50 px-0.5 py-0.5 text-center"
                        onMouseEnter={() =>
                          setHoveredCell({
                            studentName: `${row.student_first_name} ${row.student_last_name}`,
                            outcomeName: outcome.title,
                            status,
                          })
                        }
                        onMouseLeave={() => setHoveredCell(null)}
                      >
                        <div
                          className="mx-auto h-6 w-6 rounded-sm transition-transform hover:scale-125"
                          style={{ backgroundColor: config.heatmapColor }}
                          title={`${row.student_first_name}: ${outcome.title} - ${config.label}`}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Helper: abbreviate long outcome titles for column headers
// ============================================================
function abbreviate(title: string): string {
  if (title.length <= 8) return title;
  // Take first word, or first 6 chars
  const words = title.split(" ");
  if (words[0].length <= 8) return words[0];
  return title.slice(0, 6) + "…";
}
