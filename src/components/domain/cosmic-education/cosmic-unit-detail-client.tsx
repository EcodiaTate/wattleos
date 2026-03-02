"use client";

// src/components/domain/cosmic-education/cosmic-unit-detail-client.tsx
//
// Detail view for a cosmic unit: studies list, participants grid,
// and per-study completion tracking.

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useHaptics } from "@/lib/hooks/use-haptics";
import {
  deleteCosmicUnit,
  updateCosmicUnit,
  createCosmicUnitStudy,
  deleteCosmicUnitStudy,
} from "@/lib/actions/cosmic-education";
import type {
  CosmicUnitWithDetails,
  CosmicUnitParticipantWithStudent,
  CosmicStudyWithRecords,
  CosmicUnitStudy,
  CosmicStudyArea,
} from "@/types/domain";
import {
  CosmicUnitStatusBadge,
  CosmicStudyAreaChip,
  GreatLessonChip,
  CosmicCompletionBar,
  getLessonConfig,
} from "./cosmic-status-badge";
import { CosmicStudyRollClient } from "./cosmic-study-roll-client";

const STUDY_AREAS: CosmicStudyArea[] = [
  'history', 'geography', 'biology', 'physics', 'astronomy',
  'mathematics', 'language_arts', 'art_music', 'culture_society', 'economics', 'integrated',
];

const AREA_LABELS: Record<CosmicStudyArea, string> = {
  history: 'History', geography: 'Geography', biology: 'Biology', physics: 'Physics',
  astronomy: 'Astronomy', mathematics: 'Mathematics', language_arts: 'Language Arts',
  art_music: 'Art & Music', culture_society: 'Culture & Society', economics: 'Economics', integrated: 'Integrated',
};

interface Props {
  unit: CosmicUnitWithDetails;
  participants: CosmicUnitParticipantWithStudent[];
  studiesWithRecords: CosmicStudyWithRecords[];
  canManage: boolean;
}

function AddStudyInline({
  unitId,
  onAdded,
}: {
  unitId: string;
  onAdded: () => void;
}) {
  const haptics = useHaptics();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [area, setArea] = useState<CosmicStudyArea>("history");
  const [description, setDescription] = useState("");

  function handleAdd() {
    if (!title.trim()) return;
    startTransition(async () => {
      const result = await createCosmicUnitStudy({
        unit_id: unitId,
        title: title.trim(),
        study_area: area,
        description: description.trim() || null,
      });
      if (!result.error) {
        haptics.success();
        setTitle("");
        setDescription("");
        setOpen(false);
        onAdded();
      } else {
        haptics.error();
      }
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => { haptics.impact("light"); setOpen(true); }}
        className="touch-target active-push w-full text-sm py-2 rounded-lg border border-dashed border-border flex items-center justify-center gap-1"
        style={{ color: "var(--muted-foreground)" }}
      >
        + Add Study Topic
      </button>
    );
  }

  const fieldClass = "w-full px-3 py-2 rounded-lg border border-border text-sm outline-none focus:ring-2";

  return (
    <div className="rounded-xl border border-border p-4 space-y-3" style={{ background: "var(--card)" }}>
      <input
        type="text"
        value={title}
        onChange={e => setTitle(e.target.value)}
        className={fieldClass}
        style={{ background: "var(--input)", color: "var(--foreground)" }}
        placeholder="Study topic title"
        maxLength={400}
        autoFocus
      />
      <select
        value={area}
        onChange={e => setArea(e.target.value as CosmicStudyArea)}
        className={fieldClass}
        style={{ background: "var(--input)", color: "var(--foreground)" }}
      >
        {STUDY_AREAS.map(a => (
          <option key={a} value={a}>{AREA_LABELS[a]}</option>
        ))}
      </select>
      <textarea
        value={description}
        onChange={e => setDescription(e.target.value)}
        rows={2}
        className={fieldClass}
        style={{ background: "var(--input)", color: "var(--foreground)", resize: "none" }}
        placeholder="Brief description (optional)"
        maxLength={4000}
      />
      <div className="flex gap-2">
        <button
          onClick={handleAdd}
          disabled={isPending || !title.trim()}
          className="touch-target active-push px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
          style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
        >
          {isPending ? "Adding…" : "Add"}
        </button>
        <button
          onClick={() => { haptics.impact("light"); setOpen(false); }}
          className="touch-target px-3 py-2 rounded-lg text-sm"
          style={{ color: "var(--muted-foreground)" }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export function CosmicUnitDetailClient({
  unit,
  participants,
  studiesWithRecords,
  canManage,
}: Props) {
  const router = useRouter();
  const haptics = useHaptics();
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<"studies" | "participants">("studies");
  const [selectedStudyId, setSelectedStudyId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const lessonCfg = getLessonConfig(unit.great_lesson.lesson_key);

  function handleStatusChange(newStatus: typeof unit.status) {
    startTransition(async () => {
      const result = await updateCosmicUnit(unit.id, { status: newStatus });
      if (!result.error) {
        haptics.success();
        router.refresh();
      } else {
        haptics.error();
      }
    });
  }

  function handleDeleteUnit() {
    if (!confirm("Delete this unit? This cannot be undone.")) return;
    startTransition(async () => {
      const result = await deleteCosmicUnit(unit.id);
      if (!result.error) {
        haptics.impact("heavy");
        router.push("/pedagogy/cosmic-education");
      }
    });
  }

  async function handleDeleteStudy(studyId: string) {
    if (!confirm("Remove this study topic?")) return;
    const result = await deleteCosmicUnitStudy(studyId);
    if (!result.error) {
      haptics.success();
      router.refresh();
    }
  }

  const selectedStudy = studiesWithRecords.find(s => s.id === selectedStudyId);

  // If a study is selected, show the roll call view
  if (selectedStudy) {
    return (
      <CosmicStudyRollClient
        unit={unit}
        study={selectedStudy}
        participants={participants}
        canManage={canManage}
        onBack={() => setSelectedStudyId(null)}
      />
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6 pb-tab-bar">
      {/* Header */}
      <div className="flex items-start gap-4 flex-wrap">
        <div className="flex-1 min-w-0 space-y-2">
          <Link
            href="/pedagogy/cosmic-education"
            className="text-xs"
            style={{ color: "var(--muted-foreground)" }}
          >
            ← Cosmic Education
          </Link>
          <div className="flex items-start gap-2 flex-wrap">
            <CosmicUnitStatusBadge status={unit.status} />
            <GreatLessonChip lessonKey={unit.great_lesson.lesson_key} />
          </div>
          <h1 className="text-2xl font-semibold" style={{ color: "var(--foreground)" }}>
            {lessonCfg.emoji} {unit.title}
          </h1>
          {unit.description && (
            <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
              {unit.description}
            </p>
          )}
        </div>

        {canManage && (
          <div className="flex items-center gap-2 flex-wrap">
            {unit.status === 'draft' && (
              <button
                onClick={() => { haptics.impact("medium"); handleStatusChange('active'); }}
                disabled={isPending}
                className="touch-target active-push px-4 py-2 rounded-lg text-sm font-medium"
                style={{ background: "var(--cosmic-active)", color: "var(--cosmic-active-fg)" }}
              >
                Activate Unit
              </button>
            )}
            {unit.status === 'active' && (
              <button
                onClick={() => { haptics.impact("heavy"); handleStatusChange('completed'); }}
                disabled={isPending}
                className="touch-target active-push px-4 py-2 rounded-lg text-sm font-medium"
                style={{ background: "var(--cosmic-completed)", color: "var(--cosmic-completed-fg)" }}
              >
                Mark Complete
              </button>
            )}
            <Link
              href={`/pedagogy/cosmic-education/units/${unit.id}/edit`}
              onClick={() => haptics.impact("light")}
              className="touch-target active-push px-4 py-2 rounded-lg text-sm border border-border"
              style={{ color: "var(--foreground)" }}
            >
              Edit
            </Link>
          </div>
        )}
      </div>

      {/* Key stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Students", value: unit.participant_count },
          { label: "Studies", value: unit.studies.length },
          { label: "Complete", value: `${unit.completion_pct}%` },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-border p-3 text-center" style={{ background: "var(--card)" }}>
            <p className="text-xl font-bold" style={{ color: "var(--foreground)" }}>{s.value}</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>{s.label}</p>
          </div>
        ))}
      </div>

      <CosmicCompletionBar pct={unit.completion_pct} label="Overall completion" />

      {/* Key questions */}
      {unit.key_questions.length > 0 && (
        <div className="rounded-xl border border-border p-4" style={{ background: "var(--card)" }}>
          <h3 className="text-sm font-semibold mb-2" style={{ color: "var(--foreground)" }}>
            Key Questions
          </h3>
          <ul className="space-y-1.5">
            {unit.key_questions.map((q, i) => (
              <li key={i} className="flex gap-2 text-sm" style={{ color: "var(--muted-foreground)" }}>
                <span style={{ color: `var(${lessonCfg.accentVar})` }}>?</span>
                {q}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {(["studies", "participants"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => { haptics.impact("light"); setActiveTab(tab); }}
            className="px-4 py-2 text-sm font-medium capitalize border-b-2 -mb-px"
            style={{
              borderColor: activeTab === tab ? "var(--primary)" : "transparent",
              color: activeTab === tab ? "var(--primary)" : "var(--muted-foreground)",
            }}
          >
            {tab === "studies" ? `Studies (${studiesWithRecords.length})` : `Participants (${participants.length})`}
          </button>
        ))}
      </div>

      {/* Studies tab */}
      {activeTab === "studies" && (
        <div className="space-y-3">
          {studiesWithRecords.map(study => (
            <button
              key={study.id}
              onClick={() => { haptics.impact("light"); setSelectedStudyId(study.id); }}
              className="card-interactive w-full text-left p-4 rounded-xl border border-border space-y-2"
              style={{ background: "var(--card)" }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
                    {study.title}
                  </p>
                  {study.description && (
                    <p className="text-xs mt-0.5 line-clamp-2" style={{ color: "var(--muted-foreground)" }}>
                      {study.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <CosmicStudyAreaChip area={study.study_area} />
                  {canManage && (
                    <button
                      onClick={e => { e.stopPropagation(); handleDeleteStudy(study.id); }}
                      className="text-xs px-2 py-1 rounded"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs" style={{ color: "var(--muted-foreground)" }}>
                <span>{study.completed_count}/{study.total_students} completed</span>
                {study.total_students > 0 && (
                  <div className="flex-1 max-w-24">
                    <CosmicCompletionBar
                      pct={Math.round((study.completed_count / study.total_students) * 100)}
                    />
                  </div>
                )}
              </div>
            </button>
          ))}

          {canManage && (
            <AddStudyInline
              unitId={unit.id}
              onAdded={() => { router.refresh(); setRefreshKey(k => k + 1); }}
            />
          )}

          {studiesWithRecords.length === 0 && !canManage && (
            <p className="text-sm text-center py-8" style={{ color: "var(--muted-foreground)" }}>
              No study topics added yet.
            </p>
          )}
        </div>
      )}

      {/* Participants tab */}
      {activeTab === "participants" && (
        <div className="space-y-3">
          {canManage && (
            <div className="flex gap-2">
              <Link
                href={`/pedagogy/cosmic-education/units/${unit.id}/participants`}
                onClick={() => haptics.impact("light")}
                className="touch-target active-push px-4 py-2 rounded-lg text-sm border border-border"
                style={{ color: "var(--foreground)" }}
              >
                Manage Participants
              </Link>
            </div>
          )}
          {participants.length === 0 ? (
            <p className="text-sm text-center py-8" style={{ color: "var(--muted-foreground)" }}>
              No students enrolled in this unit yet.
            </p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {participants.map(p => (
                <div
                  key={p.id}
                  className="rounded-xl border border-border p-3 space-y-2"
                  style={{ background: "var(--card)" }}
                >
                  <p className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
                    {p.student.first_name} {p.student.last_name}
                  </p>
                  <CosmicCompletionBar
                    pct={p.total_studies > 0
                      ? Math.round((p.completed_studies / p.total_studies) * 100)
                      : 0}
                    label={`${p.completed_studies}/${p.total_studies} studies`}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Danger zone */}
      {canManage && unit.status === 'draft' && (
        <div className="mt-8 pt-6 border-t border-border">
          <button
            onClick={handleDeleteUnit}
            disabled={isPending}
            className="touch-target text-sm"
            style={{ color: "var(--destructive)" }}
          >
            Delete unit
          </button>
        </div>
      )}
    </div>
  );
}
