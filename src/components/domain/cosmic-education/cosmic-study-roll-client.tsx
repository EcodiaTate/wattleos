"use client";

// src/components/domain/cosmic-education/cosmic-study-roll-client.tsx
//
// Per-study student roll: shows each participant's status on this
// study with tap-to-advance and bulk advance controls.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useHaptics } from "@/lib/hooks/use-haptics";
import {
  upsertCosmicStudyRecord,
  bulkUpdateStudyStatus,
} from "@/lib/actions/cosmic-education";
import type {
  CosmicUnitWithDetails,
  CosmicStudyWithRecords,
  CosmicUnitParticipantWithStudent,
  CosmicStudyStatus,
} from "@/types/domain";
import {
  CosmicStudyStatusBadge,
  CosmicStudyAreaChip,
} from "./cosmic-status-badge";

const STATUS_ORDER: CosmicStudyStatus[] = ['introduced', 'exploring', 'presenting', 'completed'];

function nextStatus(current: CosmicStudyStatus | null): CosmicStudyStatus {
  if (!current) return 'introduced';
  const idx = STATUS_ORDER.indexOf(current);
  return STATUS_ORDER[Math.min(idx + 1, STATUS_ORDER.length - 1)];
}

interface Props {
  unit: CosmicUnitWithDetails;
  study: CosmicStudyWithRecords;
  participants: CosmicUnitParticipantWithStudent[];
  canManage: boolean;
  onBack: () => void;
}

export function CosmicStudyRollClient({ unit, study, participants, canManage, onBack }: Props) {
  const router = useRouter();
  const haptics = useHaptics();
  const [isPending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useState<Record<string, CosmicStudyStatus>>({});

  // Build status map from records (merged with optimistic)
  const recordMap = new Map<string, CosmicStudyStatus>(
    study.records.map(r => [r.student_id, r.status]),
  );

  function getStatus(studentId: string): CosmicStudyStatus | null {
    return optimistic[studentId] ?? recordMap.get(studentId) ?? null;
  }

  function handleTap(studentId: string) {
    if (!canManage) return;
    const current = getStatus(studentId);
    const next = nextStatus(current);
    // Optimistic update
    setOptimistic(prev => ({ ...prev, [studentId]: next }));
    haptics.impact("medium");

    startTransition(async () => {
      await upsertCosmicStudyRecord({
        unit_id: unit.id,
        study_id: study.id,
        student_id: studentId,
        status: next,
      });
      router.refresh();
    });
  }

  function handleBulkAdvance(targetStatus: CosmicStudyStatus) {
    if (!canManage) return;
    const eligible = participants.filter(p => {
      const current = getStatus(p.student_id);
      // Only advance students who are behind the target status
      return !current || STATUS_ORDER.indexOf(current) < STATUS_ORDER.indexOf(targetStatus);
    });
    if (eligible.length === 0) return;

    const newOptimistic: Record<string, CosmicStudyStatus> = {};
    eligible.forEach(p => { newOptimistic[p.student_id] = targetStatus; });
    setOptimistic(prev => ({ ...prev, ...newOptimistic }));
    haptics.impact("heavy");

    startTransition(async () => {
      await bulkUpdateStudyStatus({
        unit_id: unit.id,
        study_id: study.id,
        student_ids: eligible.map(p => p.student_id),
        status: targetStatus,
      });
      router.refresh();
    });
  }

  const completedCount = participants.filter(p => getStatus(p.student_id) === 'completed').length;

  return (
    <div className="space-y-5 p-4 md:p-6 pb-tab-bar">
      {/* Back */}
      <button
        onClick={onBack}
        className="text-sm flex items-center gap-1"
        style={{ color: "var(--muted-foreground)" }}
      >
        ← Back to unit
      </button>

      {/* Study header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <CosmicStudyAreaChip area={study.study_area} />
        </div>
        <h2 className="text-xl font-semibold" style={{ color: "var(--foreground)" }}>
          {study.title}
        </h2>
        {study.description && (
          <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
            {study.description}
          </p>
        )}
        <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
          {completedCount}/{participants.length} students completed
        </p>
      </div>

      {/* Bulk advance */}
      {canManage && participants.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          <span className="text-xs self-center" style={{ color: "var(--muted-foreground)" }}>
            Advance all to:
          </span>
          {STATUS_ORDER.map(s => (
            <button
              key={s}
              onClick={() => handleBulkAdvance(s)}
              disabled={isPending}
              className="touch-target active-push px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50"
              style={{ background: "var(--muted)", color: "var(--foreground)" }}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      )}

      {/* Student list */}
      <div className="space-y-2">
        {participants.length === 0 && (
          <p className="text-sm text-center py-8" style={{ color: "var(--muted-foreground)" }}>
            No students enrolled in this unit.
          </p>
        )}
        {participants.map(p => {
          const status = getStatus(p.student_id);
          return (
            <button
              key={p.id}
              onClick={() => handleTap(p.student_id)}
              disabled={!canManage || isPending}
              className="active-push w-full flex items-center justify-between px-4 py-3 rounded-xl border border-border text-left disabled:cursor-default"
              style={{ background: "var(--card)" }}
            >
              <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
                {p.student.first_name} {p.student.last_name}
              </span>
              <div className="flex items-center gap-2">
                {status ? (
                  <CosmicStudyStatusBadge status={status} />
                ) : (
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ color: "var(--muted-foreground)", background: "var(--muted)" }}>
                    Not started
                  </span>
                )}
                {canManage && (
                  <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                    {status !== 'completed' ? '→' : '✓'}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Learning outcomes */}
      {study.learning_outcomes.length > 0 && (
        <div className="rounded-xl border border-border p-4" style={{ background: "var(--card)" }}>
          <h3 className="text-sm font-semibold mb-2" style={{ color: "var(--foreground)" }}>
            Learning Outcomes
          </h3>
          <ul className="space-y-1.5">
            {study.learning_outcomes.map((o, i) => (
              <li key={i} className="flex gap-2 text-sm" style={{ color: "var(--muted-foreground)" }}>
                <span>•</span>{o}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Key vocabulary */}
      {study.key_vocabulary.length > 0 && (
        <div className="rounded-xl border border-border p-4" style={{ background: "var(--card)" }}>
          <h3 className="text-sm font-semibold mb-2" style={{ color: "var(--foreground)" }}>
            Key Vocabulary
          </h3>
          <div className="flex flex-wrap gap-2">
            {study.key_vocabulary.map((v, i) => (
              <span
                key={i}
                className="px-2 py-1 rounded text-xs border border-border"
                style={{ color: "var(--foreground)" }}
              >
                {v}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
