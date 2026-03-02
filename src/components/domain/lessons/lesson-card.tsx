import type { LessonRecord, LessonStage, LessonChildResponse } from "@/types/domain";
import { formatDate } from "@/lib/utils";

interface LessonCardProps {
  record: LessonRecord;
  materialName?: string;
  studentName?: string;
}

const STAGE_STYLES: Record<LessonStage, { bg: string; fg: string; label: string }> = {
  introduction: {
    bg: "color-mix(in srgb, var(--primary) 12%, transparent)",
    fg: "var(--primary)",
    label: "Introduction",
  },
  practice: {
    bg: "color-mix(in srgb, var(--warning) 12%, transparent)",
    fg: "var(--warning)",
    label: "Practice",
  },
  mastery: {
    bg: "color-mix(in srgb, var(--success) 12%, transparent)",
    fg: "var(--success)",
    label: "Mastery",
  },
};

const RESPONSE_LABELS: Record<LessonChildResponse, string> = {
  engaged: "Engaged",
  struggled: "Struggled",
  not_ready: "Not Ready",
  mastered: "Mastered",
  other: "Other",
};

export function LessonCard({ record, materialName, studentName }: LessonCardProps) {
  const stage = STAGE_STYLES[record.stage];

  return (
    <div
      className="rounded-[var(--radius-md)] border border-border p-3"
      style={{ background: "var(--card)" }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          {materialName && (
            <p className="text-sm font-medium truncate" style={{ color: "var(--foreground)" }}>
              {materialName}
            </p>
          )}
          {studentName && (
            <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
              {studentName}
            </p>
          )}
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
              {formatDate(record.presentation_date)}
            </span>
            {record.child_response && (
              <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                {RESPONSE_LABELS[record.child_response]}
              </span>
            )}
          </div>
          {record.notes && (
            <p className="mt-1 text-xs line-clamp-2" style={{ color: "var(--muted-foreground)" }}>
              {record.notes}
            </p>
          )}
        </div>
        <span
          className="flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium"
          style={{ background: stage.bg, color: stage.fg }}
        >
          {stage.label}
        </span>
      </div>
    </div>
  );
}
