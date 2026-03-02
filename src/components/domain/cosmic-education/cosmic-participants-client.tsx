"use client";

// src/components/domain/cosmic-education/cosmic-participants-client.tsx
//
// Participant management for a cosmic unit.
// Lists enrolled students, lets managers add by class seed or remove individually.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useHaptics } from "@/lib/hooks/use-haptics";
import {
  seedParticipantsFromClass,
  removeCosmicParticipant,
} from "@/lib/actions/cosmic-education";
import type {
  CosmicUnitParticipantWithStudent,
  CosmicUnitWithDetails,
} from "@/types/domain";
import { CosmicCompletionBar } from "./cosmic-status-badge";

interface ClassOption {
  id: string;
  name: string;
}

interface Props {
  unit: CosmicUnitWithDetails;
  participants: CosmicUnitParticipantWithStudent[];
  classes: ClassOption[];
  canManage: boolean;
}

export function CosmicParticipantsClient({
  unit,
  participants: initialParticipants,
  classes,
  canManage,
}: Props) {
  const router = useRouter();
  const haptics = useHaptics();
  const [isPending, startTransition] = useTransition();
  const [selectedClass, setSelectedClass] = useState(unit.target_class_id ?? (classes[0]?.id ?? ""));
  const [seedError, setSeedError] = useState<string | null>(null);

  function handleSeedFromClass() {
    if (!selectedClass) return;
    setSeedError(null);
    startTransition(async () => {
      const result = await seedParticipantsFromClass(unit.id, selectedClass);
      if (result.error) {
        haptics.error();
        setSeedError(result.error.message);
      } else {
        haptics.success();
        router.refresh();
      }
    });
  }

  function handleRemove(studentId: string, name: string) {
    if (!confirm(`Remove ${name} from this unit?`)) return;
    startTransition(async () => {
      const result = await removeCosmicParticipant(unit.id, studentId);
      if (result.error) {
        haptics.error();
      } else {
        haptics.impact("medium");
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-6 p-4 md:p-6 pb-tab-bar">
      {/* Header */}
      <div className="space-y-1">
        <Link
          href={`/pedagogy/cosmic-education/units/${unit.id}`}
          className="text-xs"
          style={{ color: "var(--muted-foreground)" }}
        >
          ← {unit.title}
        </Link>
        <h1 className="text-xl font-semibold" style={{ color: "var(--foreground)" }}>
          Manage Participants
        </h1>
        <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
          {initialParticipants.length} student{initialParticipants.length !== 1 ? "s" : ""} enrolled
        </p>
      </div>

      {/* Seed from class */}
      {canManage && classes.length > 0 && (
        <div className="rounded-xl border border-border p-4 space-y-3" style={{ background: "var(--card)" }}>
          <p className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
            Add students from a class
          </p>
          {seedError && (
            <p className="text-xs" style={{ color: "var(--destructive)" }}>{seedError}</p>
          )}
          <div className="flex gap-2 flex-wrap">
            <select
              value={selectedClass}
              onChange={e => setSelectedClass(e.target.value)}
              className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-border text-sm outline-none"
              style={{ background: "var(--input)", color: "var(--foreground)" }}
            >
              {classes.map(cls => (
                <option key={cls.id} value={cls.id}>{cls.name}</option>
              ))}
            </select>
            <button
              onClick={handleSeedFromClass}
              disabled={isPending || !selectedClass}
              className="touch-target active-push px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 shrink-0"
              style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
            >
              {isPending ? "Adding…" : "Add Class"}
            </button>
          </div>
          <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
            Only adds students not already enrolled. Existing students are not affected.
          </p>
        </div>
      )}

      {/* Participant list */}
      {initialParticipants.length === 0 ? (
        <p className="text-sm text-center py-12" style={{ color: "var(--muted-foreground)" }}>
          No students enrolled yet.{canManage && classes.length > 0 ? " Use the form above to add a class." : ""}
        </p>
      ) : (
        <div className="space-y-2">
          {initialParticipants.map(p => {
            const name = `${p.student.first_name} ${p.student.last_name}`;
            const completionPct = p.total_studies > 0
              ? Math.round((p.completed_studies / p.total_studies) * 100)
              : 0;
            return (
              <div
                key={p.id}
                className="flex items-center gap-4 p-3 rounded-xl border border-border"
                style={{ background: "var(--card)" }}
              >
                <div className="flex-1 min-w-0 space-y-1.5">
                  <p className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
                    {name}
                  </p>
                  <div className="flex items-center gap-3">
                    <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                      {p.completed_studies}/{p.total_studies} studies complete
                    </span>
                  </div>
                  {p.total_studies > 0 && (
                    <CosmicCompletionBar pct={completionPct} />
                  )}
                </div>
                {canManage && (
                  <button
                    onClick={() => handleRemove(p.student_id, name)}
                    disabled={isPending}
                    className="touch-target text-xs px-3 py-1.5 rounded-lg border border-border disabled:opacity-50 shrink-0"
                    style={{ color: "var(--destructive)" }}
                  >
                    Remove
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
