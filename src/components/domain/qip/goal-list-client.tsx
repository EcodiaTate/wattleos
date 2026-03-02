"use client";

import { useState, useCallback } from "react";
import type { QipGoal, QipGoalStatus } from "@/types/domain";
import { NQS_QA_FOR_ELEMENT } from "@/lib/constants/nqs-elements";
import { getGoals } from "@/lib/actions/qip";
import { GoalCard } from "./goal-card";
import { GoalForm } from "./goal-form";
import { useHaptics } from "@/lib/hooks/use-haptics";

interface GoalListClientProps {
  initialGoals: QipGoal[];
  staff: Array<{
    id: string;
    first_name: string | null;
    last_name: string | null;
  }>;
  canManage: boolean;
}

const STATUS_FILTERS: Array<{ value: QipGoalStatus | "all"; label: string }> = [
  { value: "all", label: "All" },
  { value: "not_started", label: "Not Started" },
  { value: "in_progress", label: "In Progress" },
  { value: "achieved", label: "Achieved" },
];

export function GoalListClient({
  initialGoals,
  staff,
  canManage,
}: GoalListClientProps) {
  const [goals, setGoals] = useState(initialGoals);
  const [statusFilter, setStatusFilter] = useState<QipGoalStatus | "all">(
    "all",
  );
  const [showForm, setShowForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState<QipGoal | null>(null);
  const haptics = useHaptics();

  // Build staff name lookup
  const staffMap = new Map(
    staff.map((s) => [
      s.id,
      [s.first_name, s.last_name].filter(Boolean).join(" "),
    ]),
  );

  const refresh = useCallback(async () => {
    const result = await getGoals();
    if (result.data) setGoals(result.data);
  }, []);

  const filteredGoals =
    statusFilter === "all"
      ? goals
      : goals.filter((g) => g.status === statusFilter);

  // Group by QA
  const groupedGoals = new Map<number, QipGoal[]>();
  for (const goal of filteredGoals) {
    const qa = NQS_QA_FOR_ELEMENT.get(goal.nqs_element_id) ?? 0;
    const existing = groupedGoals.get(qa) ?? [];
    existing.push(goal);
    groupedGoals.set(qa, existing);
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Status filter pills */}
        <div className="flex gap-1">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => {
                haptics.selection();
                setStatusFilter(f.value);
              }}
              className="active-push rounded-lg px-3 py-1.5 text-xs font-medium"
              style={{
                backgroundColor:
                  statusFilter === f.value
                    ? "var(--primary)"
                    : "var(--muted)",
                color:
                  statusFilter === f.value
                    ? "var(--primary-foreground)"
                    : "var(--muted-foreground)",
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Create button */}
        {canManage && (
          <button
            type="button"
            onClick={() => {
              haptics.impact("light");
              setEditingGoal(null);
              setShowForm(true);
            }}
            className="active-push touch-target ml-auto rounded-lg px-4 py-2 text-sm font-semibold"
            style={{
              backgroundColor: "var(--primary)",
              color: "var(--primary-foreground)",
            }}
          >
            + New Goal
          </button>
        )}
      </div>

      {/* Create/Edit form */}
      {(showForm || editingGoal) && canManage && (
        <GoalForm
          editingGoal={editingGoal}
          staff={staff}
          onSaved={() => {
            setShowForm(false);
            setEditingGoal(null);
            refresh();
          }}
          onCancel={() => {
            setShowForm(false);
            setEditingGoal(null);
          }}
        />
      )}

      {/* Goal list */}
      {filteredGoals.length === 0 ? (
        <div
          className="rounded-xl border border-border p-8 text-center"
          style={{ backgroundColor: "var(--card)" }}
        >
          <p
            className="text-sm"
            style={{ color: "var(--muted-foreground)" }}
          >
            {statusFilter === "all"
              ? "No improvement goals yet"
              : `No ${statusFilter.replace("_", " ")} goals`}
          </p>
        </div>
      ) : (
        Array.from(groupedGoals.entries())
          .sort(([a], [b]) => a - b)
          .map(([qaNumber, qaGoals]) => (
            <div key={qaNumber} className="space-y-2">
              <h3
                className="text-xs font-bold uppercase tracking-wider"
                style={{ color: "var(--muted-foreground)" }}
              >
                Quality Area {qaNumber}
              </h3>
              <div className="space-y-3">
                {qaGoals.map((goal) => (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    responsibleName={
                      goal.responsible_person_id
                        ? staffMap.get(goal.responsible_person_id)
                        : undefined
                    }
                    canManage={canManage}
                    onEdit={(g) => {
                      setEditingGoal(g);
                      setShowForm(false);
                    }}
                    onUpdated={refresh}
                  />
                ))}
              </div>
            </div>
          ))
      )}
    </div>
  );
}
