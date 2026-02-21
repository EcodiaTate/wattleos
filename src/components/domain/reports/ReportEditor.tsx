// src/components/domain/reports/ReportEditor.tsx
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

const STATUS_CONFIG: Record<
  ReportStatus,
  {
    label: string;
    badgeStyle: string;
    actions: Array<{
      targetStatus: ReportStatus;
      label: string;
      variant: "primary" | "secondary" | "danger";
    }>;
  }
> = {
  draft: {
    label: "Draft",
    badgeStyle: "bg-[var(--report-draft)] text-[var(--report-draft-fg)]",
    actions: [
      { targetStatus: "review", label: "Submit for Review", variant: "primary" },
    ],
  },
  review: {
    label: "In Review",
    badgeStyle: "bg-[var(--report-review)] text-[var(--report-review-fg)]",
    actions: [
      { targetStatus: "draft", label: "Send Back to Draft", variant: "secondary" },
      { targetStatus: "approved", label: "Approve", variant: "primary" },
    ],
  },
  approved: {
    label: "Approved",
    badgeStyle: "bg-[var(--report-approved)] text-[var(--report-approved-fg)]",
    actions: [
      { targetStatus: "review", label: "Send Back to Review", variant: "secondary" },
      { targetStatus: "published", label: "Publish", variant: "primary" },
    ],
  },
  published: {
    label: "Published",
    badgeStyle: "bg-[var(--report-published)] text-[var(--report-published-fg)]",
    actions: [
      { targetStatus: "approved", label: "Unpublish", variant: "danger" },
    ],
  },
};

const VARIANT_STYLES = {
  primary: "bg-primary text-primary-foreground shadow-md hover:bg-primary-600",
  secondary: "border border-border bg-background text-foreground hover:bg-muted shadow-sm",
  danger: "border border-destructive/30 bg-background text-destructive hover:bg-destructive/5 shadow-sm",
};

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
  const [currentStatus, setCurrentStatus] = useState<ReportStatus>(reportStatus);
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
      setSaveMessage({ type: "success", text: "Saved successfully" });
      setHasChanges(false);
      router.refresh();
    }

    setIsSaving(false);
  }

  async function handleStatusChange(newStatus: ReportStatus) {
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

  const editableCount = sections.filter((s) => isEditableType(s.type)).length;
  const completedEditable = sections.filter(
    (s) => isEditableType(s.type) && s.completed,
  ).length;
  const livePercent =
    editableCount > 0 ? Math.round((completedEditable / editableCount) * 100) : 100;

  return (
    <div className="space-y-[var(--density-section-gap)]">
      {/* Status bar */}
      <div className="flex flex-wrap items-center justify-between gap-5 rounded-xl border border-border bg-card px-6 py-5 shadow-sm sticky top-0 z-10 backdrop-blur-md bg-card/95">
        <div className="flex items-center gap-6">
          <span className={`status-badge px-3 py-1 text-xs font-bold uppercase tracking-widest status-badge-plain ${statusConfig.badgeStyle}`}>
            {statusConfig.label}
          </span>

          <div className="flex items-center gap-3">
            <div className="h-2 w-32 overflow-hidden rounded-full bg-muted shadow-inner">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500 ease-spring"
                style={{ width: `${livePercent}%` }}
              />
            </div>
            <span className="text-xs font-bold text-muted-foreground whitespace-nowrap">
              {completedEditable} / {editableCount} complete
            </span>
          </div>

          <div className="h-6 w-px bg-border hidden sm:block" />

          {hasChanges && (
            <span className="text-[10px] font-bold text-primary uppercase tracking-wider animate-pulse-soft">
              Unsaved changes
            </span>
          )}
          {saveMessage && (
            <span className={`text-[10px] font-bold uppercase tracking-wider ${saveMessage.type === "success" ? "text-success" : "text-destructive"}`}>
              {saveMessage.text}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isEditable && (
            <button
              onClick={handleSave}
              disabled={isSaving || !hasChanges}
              className="rounded-lg border border-border bg-background px-5 h-[var(--density-button-height)] text-sm font-bold text-foreground transition-all hover:bg-muted disabled:opacity-50 active:scale-95"
            >
              {isSaving ? "Saving..." : "Save"}
            </button>
          )}
          {statusConfig.actions.map((action) => (
            <button
              key={action.targetStatus}
              onClick={() => handleStatusChange(action.targetStatus)}
              disabled={isTransitioning}
              className={`rounded-lg px-6 h-[var(--density-button-height)] text-sm font-bold transition-all disabled:opacity-50 active:scale-95 ${VARIANT_STYLES[action.variant]}`}
            >
              {isTransitioning ? "..." : action.label}
            </button>
          ))}
        </div>
      </div>

      {reportContent.reportingPeriod && (
        <div className="flex items-center gap-3 rounded-lg bg-muted/50 border border-border px-5 py-3 text-xs font-medium text-muted-foreground">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
          </svg>
          <span>
            {formatDate(reportContent.reportingPeriod.startDate)} – {formatDate(reportContent.reportingPeriod.endDate)}
          </span>
          <span className="text-border">|</span>
          <span>Author: {authorName}</span>
          {term && (
            <>
              <span className="text-border">|</span>
              <span className="font-bold text-foreground">{term}</span>
            </>
          )}
        </div>
      )}

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
      className={`rounded-xl border transition-all duration-300 ${
        section.completed
          ? "border-success-foreground/20 bg-success/5 shadow-sm"
          : "border-border bg-card shadow-sm hover:border-primary-200"
      }`}
    >
      <div
        className="flex cursor-pointer items-center justify-between px-6 py-5 group"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-4">
          {isEditableType(section.type) && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (isEditable) onToggleComplete(section.templateSectionId);
              }}
              disabled={!isEditable}
              className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg border-2 transition-all ${
                section.completed
                  ? "border-success bg-success text-success-foreground"
                  : "border-input bg-background hover:border-primary"
              } ${!isEditable ? "opacity-40 cursor-not-allowed" : ""}`}
            >
              {section.completed && (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={3.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
              )}
            </button>
          )}
          {!isEditableType(section.type) && (
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-info/10 text-info">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            </div>
          )}

          <h3 className="text-base font-bold text-foreground">
            {section.title}
          </h3>
          <span className="status-badge bg-muted text-muted-foreground status-badge-plain px-2 py-0 font-bold uppercase tracking-tighter text-[10px]">
            {getSectionTypeLabel(section.type)}
          </span>
        </div>
        <svg
          className={`h-5 w-5 text-muted-foreground transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </div>

      {isExpanded && (
        <div className="animate-fade-in border-t border-border/50 px-6 py-6 bg-background/50 rounded-b-xl">
          {section.autoData && (
            <div className="mb-6">
               <AutoDataRenderer autoData={section.autoData} type={section.type} />
            </div>
          )}

          {isEditableType(section.type) && (
            <div>
              {isEditable ? (
                <div>
                  <textarea
                    value={section.narrative ?? ""}
                    onChange={(e) =>
                      onUpdateNarrative(section.templateSectionId, e.target.value)
                    }
                    rows={8}
                    placeholder={getPlaceholder(section)}
                    className="block w-full rounded-xl border border-input bg-background p-4 text-sm leading-relaxed shadow-inner outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary prose-report"
                  />
                  <div className="mt-2 flex items-center justify-end gap-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                    <span>{countWords(section.narrative)} words</span>
                  </div>
                </div>
              ) : (
                <div className="prose-report max-w-none text-foreground bg-muted/20 p-6 rounded-xl border border-border/40">
                  {section.narrative ? (
                    <p className="whitespace-pre-wrap">{section.narrative}</p>
                  ) : (
                    <p className="italic text-muted-foreground opacity-60">
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

function AutoDataRenderer({
  autoData,
  type,
}: {
  autoData: ReportAutoData;
  type: TemplateSectionType;
}) {
  if (type === "student_info" && autoData.studentInfo) {
    const info = autoData.studentInfo;
    return (
      <div className="flex items-center gap-6 bg-background border border-border p-5 rounded-xl shadow-sm">
        {info.photoUrl ? (
          <img
            src={info.photoUrl}
            alt=""
            className="h-20 w-20 rounded-xl object-cover ring-2 ring-primary/10 shadow-md"
          />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-muted text-2xl font-bold text-muted-foreground uppercase">
            {info.firstName[0]}{info.lastName[0]}
          </div>
        )}
        <div className="space-y-1.5">
          <p className="text-lg font-bold text-foreground">
            {info.preferredName
              ? `${info.preferredName} (${info.firstName} ${info.lastName})`
              : `${info.firstName} ${info.lastName}`}
          </p>
          <div className="flex flex-wrap gap-4 text-xs font-medium text-muted-foreground">
            {info.className && (
              <span className="flex items-center gap-1.5">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.174L4.5 6.636M15.357 2.812l3.704 6.251m-6.251 1.201L17.062 18.02m-7.14-1.201l-2.43 6.086m0 0L3 18.273m4.492 4.584V9.589" />
                </svg>
                {info.className}{info.cycleLevelName ? ` (${info.cycleLevelName})` : ""}
              </span>
            )}
            {info.dob && (
              <span className="flex items-center gap-1.5">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                </svg>
                {formatDate(info.dob)}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (type === "mastery_summary" && autoData.masterySummary) {
    const ms = autoData.masterySummary;
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <MasteryStatCard label="Total" value={ms.total} color="gray" />
          <MasteryStatCard label="Not Started" value={ms.notStarted} color="gray" />
          <MasteryStatCard label="Presented" value={ms.presented} color="blue" />
          <MasteryStatCard label="Practicing" value={ms.practicing} color="amber" />
          <MasteryStatCard label="Mastered" value={ms.mastered} color="green" />
        </div>
        <div className="flex items-center gap-4 bg-background border border-border p-3 rounded-lg">
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted shadow-inner">
            <div
              className="h-full rounded-full bg-[var(--mastery-mastered)] transition-all duration-1000"
              style={{ width: `${ms.percentMastered}%` }}
            />
          </div>
          <span className="text-sm font-bold text-foreground tabular-nums">
            {ms.percentMastered}% mastered
          </span>
        </div>
      </div>
    );
  }

  if (type === "mastery_grid" && autoData.masteryGrid) {
    const statusStyles: Record<string, string> = {
      not_started: "bg-[var(--mastery-not-started)] text-[var(--mastery-not-started-fg)]",
      presented: "bg-[var(--mastery-presented)] text-[var(--mastery-presented-fg)]",
      practicing: "bg-[var(--mastery-practicing)] text-[var(--mastery-practicing-fg)]",
      mastered: "bg-[var(--mastery-mastered)] text-[var(--mastery-mastered-fg)]",
    };

    return (
      <div className="grid gap-2 sm:grid-cols-2">
        {autoData.masteryGrid.map((item) => (
          <div
            key={item.nodeId}
            className="flex items-center justify-between rounded-lg border border-border bg-background px-4 py-2.5 shadow-sm transition-all hover:border-primary-200"
          >
            <span className="text-sm font-medium text-foreground">{item.nodeTitle}</span>
            <span className={`status-badge text-[10px] font-bold uppercase tracking-tighter px-2 py-0 status-badge-plain ${statusStyles[item.status] ?? statusStyles.not_started}`}>
              {item.status.replace("_", " ")}
            </span>
          </div>
        ))}
        {autoData.masteryGrid.length === 0 && (
          <p className="text-sm text-muted-foreground italic col-span-full">
            No mastery data recorded for this period.
          </p>
        )}
      </div>
    );
  }

  if (type === "attendance_summary" && autoData.attendanceSummary) {
    const att = autoData.attendanceSummary;
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          <AttendanceStatCard label="Total Days" value={att.totalDays} />
          <AttendanceStatCard label="Present" value={att.present} color="green" />
          <AttendanceStatCard label="Absent" value={att.absent} color="red" />
          <AttendanceStatCard label="Late" value={att.late} color="amber" />
          <AttendanceStatCard label="Excused" value={att.excused} color="blue" />
          <AttendanceStatCard label="Half Day" value={att.halfDay} color="gray" />
        </div>
        <div className="flex items-center justify-between px-2">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
            Overall Attendance Rate
          </p>
          <p className="text-xl font-bold text-foreground tabular-nums">
            {att.attendanceRate}%
          </p>
        </div>
      </div>
    );
  }

  if (type === "observation_highlights" && autoData.observationHighlights) {
    return (
      <div className="space-y-3">
        {autoData.observationHighlights.length === 0 ? (
          <p className="text-sm text-muted-foreground italic py-4">
            No published observations found for this period.
          </p>
        ) : (
          autoData.observationHighlights.map((obs) => (
            <div
              key={obs.id}
              className="rounded-xl border border-border/60 bg-background p-4 shadow-sm transition-all hover:border-primary-200"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{formatDate(obs.createdAt)}</span>
                <span className="text-[10px] font-bold text-primary uppercase tracking-wider">By {obs.authorName}</span>
              </div>
              {obs.content && (
                <p className="text-sm text-foreground line-clamp-3 leading-relaxed mb-3">
                  {obs.content}
                </p>
              )}
              <div className="flex flex-wrap gap-1.5">
                {obs.outcomes.map((outcome, i) => (
                  <span
                    key={i}
                    className="status-badge bg-primary-50 text-primary-700 text-[10px] font-bold px-2 py-0 status-badge-plain"
                  >
                    {outcome}
                  </span>
                ))}
                {obs.mediaCount > 0 && (
                  <span className="status-badge bg-muted text-muted-foreground text-[10px] font-bold px-2 py-0 status-badge-plain">
                    📷 {obs.mediaCount} photo{obs.mediaCount !== 1 ? 's' : ''}
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

function MasteryStatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: "gray" | "blue" | "amber" | "green";
}) {
  const styles = {
    gray: "bg-muted text-foreground",
    blue: "bg-info/10 text-info",
    amber: "bg-warning/10 text-warning",
    green: "bg-success/10 text-success",
  };

  return (
    <div className={`rounded-xl p-3 text-center border border-border/50 shadow-sm ${styles[color]}`}>
      <p className="text-xl font-bold tabular-nums leading-none mb-1">{value}</p>
      <p className="text-[9px] font-bold uppercase tracking-widest opacity-80">{label}</p>
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
  const styles: Record<string, string> = {
    green: "text-success",
    red: "text-destructive",
    amber: "text-warning",
    blue: "text-info",
    gray: "text-foreground",
  };

  return (
    <div className="rounded-xl border border-border/60 bg-background p-3 text-center shadow-sm">
      <p className={`text-xl font-bold tabular-nums leading-none mb-1 ${color ? styles[color] : "text-foreground"}`}>
        {value}
      </p>
      <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
    </div>
  );
}

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
    student_info: "Auto Data",
    narrative: "Narrative",
    mastery_grid: "Curriculum",
    mastery_summary: "Stats",
    attendance_summary: "Attendance",
    observation_highlights: "Highlights",
    custom_text: "Text",
    goals: "Goals",
  };
  return labels[type] ?? type;
}

function getPlaceholder(section: ReportSectionContent): string {
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

function countWords(text?: string | null): number {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter((w) => w.length > 0).length;
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