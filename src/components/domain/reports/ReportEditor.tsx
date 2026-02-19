// src/components/domain/reports/ReportEditor.tsx
//
// ============================================================
// WattleOS V2 - Report Editor (Client Component)
// ============================================================
// The teacher-facing report editor. Renders each section:
//   - Auto sections show populated data (mastery, attendance, etc.)
//   - Editable sections have a textarea for teacher narratives
//   - Each section can be marked complete
//   - Status workflow buttons at the top
//
// WHY client: Narrative editing, completion toggling, and status
// transitions all require interactive state. Saves are explicit
// (button click) to avoid mid-typing server calls.
// ============================================================

"use client";

import type { ReportCompletionStats } from "@/lib/actions/reports";
import { updateReportContent, updateReportStatus } from "@/lib/actions/reports";
import type {
  ReportAutoData,
  ReportContent,
  ReportSectionContent,
  TemplateSectionType,
} from "@/lib/reports/types";
import type { ReportStatus } from "@/types/domain";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

// ============================================================
// Props
// ============================================================

interface ReportEditorProps {
  reportId: string;
  reportStatus: ReportStatus;
  reportContent: ReportContent;
  completionStats: ReportCompletionStats;
  studentName: string;
  studentPhotoUrl: string | null;
  authorName: string;
  term: string | null;
}

// ============================================================
// Status workflow config
// ============================================================

const STATUS_CONFIG: Record<
  ReportStatus,
  {
    label: string;
    bgColor: string;
    textColor: string;
    actions: Array<{
      targetStatus: ReportStatus;
      label: string;
      variant: "primary" | "secondary" | "danger";
    }>;
  }
> = {
  draft: {
    label: "Draft",
    bgColor: "bg-gray-100",
    textColor: "text-gray-700",
    actions: [
      {
        targetStatus: "review",
        label: "Submit for Review",
        variant: "primary",
      },
    ],
  },
  review: {
    label: "In Review",
    bgColor: "bg-blue-100",
    textColor: "text-blue-700",
    actions: [
      {
        targetStatus: "draft",
        label: "Send Back to Draft",
        variant: "secondary",
      },
      { targetStatus: "approved", label: "Approve", variant: "primary" },
    ],
  },
  approved: {
    label: "Approved",
    bgColor: "bg-amber-100",
    textColor: "text-amber-700",
    actions: [
      {
        targetStatus: "review",
        label: "Send Back to Review",
        variant: "secondary",
      },
      { targetStatus: "published", label: "Publish", variant: "primary" },
    ],
  },
  published: {
    label: "Published",
    bgColor: "bg-green-100",
    textColor: "text-green-700",
    actions: [
      { targetStatus: "approved", label: "Unpublish", variant: "danger" },
    ],
  },
};

const VARIANT_STYLES = {
  primary: "bg-amber-600 text-white hover:bg-amber-700",
  secondary: "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50",
  danger: "border border-red-300 bg-white text-red-700 hover:bg-red-50",
};

// ============================================================
// Component
// ============================================================

export function ReportEditor({
  reportId,
  reportStatus,
  reportContent,
  completionStats,
  studentName,
  studentPhotoUrl,
  authorName,
  term,
}: ReportEditorProps) {
  const [sections, setSections] = useState<ReportSectionContent[]>(
    reportContent?.sections ?? [],
  );
  const [currentStatus, setCurrentStatus] =
    useState<ReportStatus>(reportStatus);
  const [isSaving, setIsSaving] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const router = useRouter();

  const isEditable = currentStatus === "draft" || currentStatus === "review";
  const statusConfig = STATUS_CONFIG[currentStatus];

  // ── Section editing ─────────────────────────────────────

  const updateNarrative = useCallback(
    (templateSectionId: string, narrative: string) => {
      setSections((prev) =>
        prev.map((s) =>
          s.templateSectionId === templateSectionId ? { ...s, narrative } : s,
        ),
      );
      setHasChanges(true);
      setSaveMessage(null);
    },
    [],
  );

  const toggleComplete = useCallback((templateSectionId: string) => {
    setSections((prev) =>
      prev.map((s) =>
        s.templateSectionId === templateSectionId
          ? { ...s, completed: !s.completed }
          : s,
      ),
    );
    setHasChanges(true);
    setSaveMessage(null);
  }, []);

  // ── Save content ────────────────────────────────────────

  async function handleSave() {
    setIsSaving(true);
    setSaveMessage(null);

    const sectionUpdates = sections
      .filter((s) => isEditableType(s.type))
      .map((s) => ({
        templateSectionId: s.templateSectionId,
        narrative: s.narrative,
        completed: s.completed,
      }));

    const result = await updateReportContent(reportId, {
      sections: sectionUpdates,
    });

    if (result.error) {
      setSaveMessage({ type: "error", text: result.error.message });
    } else {
      setSaveMessage({ type: "success", text: "Saved" });
      setHasChanges(false);
      router.refresh();
    }

    setIsSaving(false);
  }

  // ── Status transition ───────────────────────────────────

  async function handleStatusChange(newStatus: ReportStatus) {
    // Save any pending changes first
    if (hasChanges && isEditable) {
      await handleSave();
    }

    setIsTransitioning(true);
    setSaveMessage(null);

    const result = await updateReportStatus(reportId, newStatus);

    if (result.error) {
      setSaveMessage({ type: "error", text: result.error.message });
    } else {
      setCurrentStatus(newStatus);
      setSaveMessage({
        type: "success",
        text: `Status changed to ${STATUS_CONFIG[newStatus].label}`,
      });
      router.refresh();
    }

    setIsTransitioning(false);
  }

  // ── Compute live completion ─────────────────────────────

  const editableCount = sections.filter((s) => isEditableType(s.type)).length;
  const completedEditable = sections.filter(
    (s) => isEditableType(s.type) && s.completed,
  ).length;
  const livePercent =
    editableCount > 0
      ? Math.round((completedEditable / editableCount) * 100)
      : 100;

  return (
    <div className="space-y-6">
      {/* Status bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-gray-200 bg-white px-5 py-4">
        <div className="flex items-center gap-4">
          {/* Status badge */}
          <span
            className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${statusConfig.bgColor} ${statusConfig.textColor}`}
          >
            {statusConfig.label}
          </span>

          {/* Progress */}
          <div className="flex items-center gap-2">
            <div className="h-2 w-24 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-amber-500 transition-all duration-300"
                style={{ width: `${livePercent}%` }}
              />
            </div>
            <span className="text-xs text-gray-500">
              {completedEditable}/{editableCount} sections complete
            </span>
          </div>

          {/* Save indicator */}
          {hasChanges && (
            <span className="text-xs text-amber-600 font-medium">
              Unsaved changes
            </span>
          )}
          {saveMessage && (
            <span
              className={`text-xs font-medium ${
                saveMessage.type === "success"
                  ? "text-green-600"
                  : "text-red-600"
              }`}
            >
              {saveMessage.text}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {isEditable && (
            <button
              onClick={handleSave}
              disabled={isSaving || !hasChanges}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save"}
            </button>
          )}
          {statusConfig.actions.map((action) => (
            <button
              key={action.targetStatus}
              onClick={() => handleStatusChange(action.targetStatus)}
              disabled={isTransitioning}
              className={`rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${VARIANT_STYLES[action.variant]}`}
            >
              {isTransitioning ? "..." : action.label}
            </button>
          ))}
        </div>
      </div>

      {/* Report period info */}
      {reportContent.reportingPeriod && (
        <div className="flex items-center gap-4 rounded-md bg-gray-50 px-4 py-2 text-xs text-gray-500">
          <span>
            Reporting period:{" "}
            {formatDate(reportContent.reportingPeriod.startDate)} –{" "}
            {formatDate(reportContent.reportingPeriod.endDate)}
          </span>
          <span>&middot;</span>
          <span>Author: {authorName}</span>
        </div>
      )}

      {/* Sections */}
      <div className="space-y-4">
        {sections.map((section) => (
          <ReportSection
            key={section.templateSectionId}
            section={section}
            isEditable={isEditable}
            onUpdateNarrative={updateNarrative}
            onToggleComplete={toggleComplete}
          />
        ))}
      </div>
    </div>
  );
}

// ============================================================
// ReportSection - renders a single section
// ============================================================

interface ReportSectionProps {
  section: ReportSectionContent;
  isEditable: boolean;
  onUpdateNarrative: (templateSectionId: string, narrative: string) => void;
  onToggleComplete: (templateSectionId: string) => void;
}

function ReportSection({
  section,
  isEditable,
  onUpdateNarrative,
  onToggleComplete,
}: ReportSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div
      className={`rounded-lg border bg-white transition-shadow ${
        section.completed ? "border-green-200" : "border-gray-200"
      }`}
    >
      {/* Section header */}
      <div
        className="flex cursor-pointer items-center justify-between px-5 py-4"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          {/* Completion checkbox */}
          {isEditableType(section.type) && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (isEditable) onToggleComplete(section.templateSectionId);
              }}
              disabled={!isEditable}
              className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border transition-colors ${
                section.completed
                  ? "border-green-500 bg-green-500"
                  : "border-gray-300 hover:border-gray-400"
              } ${!isEditable ? "opacity-60" : ""}`}
            >
              {section.completed && (
                <svg
                  className="h-3.5 w-3.5 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={3}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m4.5 12.75 6 6 9-13.5"
                  />
                </svg>
              )}
            </button>
          )}
          {!isEditableType(section.type) && (
            <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-blue-100">
              <svg
                className="h-3 w-3 text-blue-600"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m4.5 12.75 6 6 9-13.5"
                />
              </svg>
            </div>
          )}

          <h3 className="text-sm font-semibold text-gray-900">
            {section.title}
          </h3>
          <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">
            {getSectionTypeLabel(section.type)}
          </span>
        </div>
        <svg
          className={`h-4 w-4 text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m19.5 8.25-7.5 7.5-7.5-7.5"
          />
        </svg>
      </div>

      {/* Section content */}
      {isExpanded && (
        <div className="border-t border-gray-100 px-5 py-4">
          {/* Auto data display */}
          {section.autoData && (
            <AutoDataRenderer autoData={section.autoData} type={section.type} />
          )}

          {/* Editable narrative */}
          {isEditableType(section.type) && (
            <div className={section.autoData ? "mt-4" : ""}>
              {isEditable ? (
                <div>
                  <textarea
                    value={section.narrative ?? ""}
                    onChange={(e) =>
                      onUpdateNarrative(
                        section.templateSectionId,
                        e.target.value,
                      )
                    }
                    rows={6}
                    placeholder={getPlaceholder(section)}
                    className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm leading-relaxed focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                  {section.narrative && (
                    <p className="mt-1 text-xs text-gray-400">
                      {countWords(section.narrative)} words
                    </p>
                  )}
                </div>
              ) : (
                <div className="prose prose-sm max-w-none text-gray-700">
                  {section.narrative ? (
                    <p className="whitespace-pre-wrap">{section.narrative}</p>
                  ) : (
                    <p className="italic text-gray-400">
                      No content written yet.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================
// AutoDataRenderer - displays auto-populated data by type
// ============================================================

function AutoDataRenderer({
  autoData,
  type,
}: {
  autoData: ReportAutoData;
  type: TemplateSectionType;
}) {
  // ── Student Info ──────────────────────────────────────
  if (type === "student_info" && autoData.studentInfo) {
    const info = autoData.studentInfo;
    return (
      <div className="flex items-start gap-4">
        {info.photoUrl ? (
          <img
            src={info.photoUrl}
            alt=""
            className="h-16 w-16 rounded-lg object-cover"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-gray-100 text-lg font-medium text-gray-400">
            {info.firstName[0]}
            {info.lastName[0]}
          </div>
        )}
        <div className="space-y-1 text-sm">
          <p className="font-medium text-gray-900">
            {info.preferredName
              ? `${info.preferredName} (${info.firstName} ${info.lastName})`
              : `${info.firstName} ${info.lastName}`}
          </p>
          {info.className && (
            <p className="text-gray-600">
              Class: {info.className}
              {info.cycleLevelName ? ` (${info.cycleLevelName})` : ""}
            </p>
          )}
          {info.dob && (
            <p className="text-gray-500">DOB: {formatDate(info.dob)}</p>
          )}
        </div>
      </div>
    );
  }

  // ── Mastery Summary ───────────────────────────────────
  if (type === "mastery_summary" && autoData.masterySummary) {
    const ms = autoData.masterySummary;
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-5 gap-3">
          <MasteryStatCard label="Total" value={ms.total} color="gray" />
          <MasteryStatCard
            label="Not Started"
            value={ms.notStarted}
            color="gray"
          />
          <MasteryStatCard
            label="Presented"
            value={ms.presented}
            color="blue"
          />
          <MasteryStatCard
            label="Practicing"
            value={ms.practicing}
            color="amber"
          />
          <MasteryStatCard label="Mastered" value={ms.mastered} color="green" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-green-500 transition-all"
              style={{ width: `${ms.percentMastered}%` }}
            />
          </div>
          <span className="text-sm font-medium text-gray-700">
            {ms.percentMastered}% mastered
          </span>
        </div>
      </div>
    );
  }

  // ── Mastery Grid ──────────────────────────────────────
  if (type === "mastery_grid" && autoData.masteryGrid) {
    const statusColors: Record<string, string> = {
      not_started: "bg-gray-100 text-gray-500",
      presented: "bg-blue-100 text-blue-700",
      practicing: "bg-amber-100 text-amber-700",
      mastered: "bg-green-100 text-green-700",
    };

    return (
      <div className="space-y-1">
        {autoData.masteryGrid.map((item) => (
          <div
            key={item.nodeId}
            className="flex items-center justify-between rounded px-3 py-1.5 text-sm hover:bg-gray-50"
          >
            <span className="text-gray-700">{item.nodeTitle}</span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                statusColors[item.status] ?? statusColors.not_started
              }`}
            >
              {item.status.replace("_", " ")}
            </span>
          </div>
        ))}
        {autoData.masteryGrid.length === 0 && (
          <p className="text-sm text-gray-400 italic">
            No mastery data recorded.
          </p>
        )}
      </div>
    );
  }

  // ── Attendance Summary ────────────────────────────────
  if (type === "attendance_summary" && autoData.attendanceSummary) {
    const att = autoData.attendanceSummary;
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          <AttendanceStatCard label="Total Days" value={att.totalDays} />
          <AttendanceStatCard
            label="Present"
            value={att.present}
            color="green"
          />
          <AttendanceStatCard label="Absent" value={att.absent} color="red" />
          <AttendanceStatCard label="Late" value={att.late} color="amber" />
          <AttendanceStatCard
            label="Excused"
            value={att.excused}
            color="blue"
          />
          <AttendanceStatCard
            label="Half Day"
            value={att.halfDay}
            color="gray"
          />
        </div>
        <p className="text-sm text-gray-600">
          Attendance rate:{" "}
          <span className="font-medium text-gray-900">
            {att.attendanceRate}%
          </span>
        </p>
      </div>
    );
  }

  // ── Observation Highlights ────────────────────────────
  if (type === "observation_highlights" && autoData.observationHighlights) {
    return (
      <div className="space-y-3">
        {autoData.observationHighlights.length === 0 ? (
          <p className="text-sm text-gray-400 italic">
            No published observations found for this period.
          </p>
        ) : (
          autoData.observationHighlights.map((obs) => (
            <div
              key={obs.id}
              className="rounded-md border border-gray-100 bg-gray-50 p-3"
            >
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>{formatDate(obs.createdAt)}</span>
                <span>By {obs.authorName}</span>
              </div>
              {obs.content && (
                <p className="mt-1 text-sm text-gray-700 line-clamp-3">
                  {obs.content}
                </p>
              )}
              <div className="mt-2 flex flex-wrap gap-1">
                {obs.outcomes.map((outcome, i) => (
                  <span
                    key={i}
                    className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700"
                  >
                    {outcome}
                  </span>
                ))}
                {obs.mediaCount > 0 && (
                  <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">
                    📷 {obs.mediaCount}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    );
  }

  return null;
}

// ============================================================
// Small stat cards
// ============================================================

function MasteryStatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: "gray" | "blue" | "amber" | "green";
}) {
  const colors = {
    gray: "bg-gray-50 text-gray-700",
    blue: "bg-blue-50 text-blue-700",
    amber: "bg-amber-50 text-amber-700",
    green: "bg-green-50 text-green-700",
  };

  return (
    <div className={`rounded-md p-2 text-center ${colors[color]}`}>
      <p className="text-lg font-bold">{value}</p>
      <p className="text-[10px] uppercase tracking-wide opacity-75">{label}</p>
    </div>
  );
}

function AttendanceStatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color?: "green" | "red" | "amber" | "blue" | "gray";
}) {
  const colors: Record<string, string> = {
    green: "text-green-700",
    red: "text-red-700",
    amber: "text-amber-700",
    blue: "text-blue-700",
    gray: "text-gray-700",
  };

  return (
    <div className="rounded-md border border-gray-100 bg-gray-50 p-2 text-center">
      <p
        className={`text-lg font-bold ${color ? colors[color] : "text-gray-900"}`}
      >
        {value}
      </p>
      <p className="text-[10px] uppercase tracking-wide text-gray-500">
        {label}
      </p>
    </div>
  );
}

// ============================================================
// Helpers
// ============================================================

function isEditableType(type: TemplateSectionType): boolean {
  return [
    "narrative",
    "custom_text",
    "goals",
    "observation_highlights",
  ].includes(type);
}

function getSectionTypeLabel(type: TemplateSectionType): string {
  const labels: Record<TemplateSectionType, string> = {
    student_info: "Auto",
    narrative: "Write",
    mastery_grid: "Auto",
    mastery_summary: "Auto",
    attendance_summary: "Auto",
    observation_highlights: "Review",
    custom_text: "Write",
    goals: "Write",
  };
  return labels[type] ?? type;
}

function getPlaceholder(section: ReportSectionContent): string {
  // Try to get placeholder from template snapshot
  const templateContent = undefined; // Placeholder extraction would go here
  switch (section.type) {
    case "narrative":
      return "Write about the student's progress, strengths, and areas for growth...";
    case "custom_text":
      return "Write content for this section...";
    case "goals":
      return "Outline learning goals and focus areas for the upcoming term...";
    case "observation_highlights":
      return "Add your commentary on the observation highlights above...";
    default:
      return "";
  }
}

function countWords(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0).length;
}

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-AU", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}
