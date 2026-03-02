"use client";

import { useState, useTransition } from "react";
import type { MqapCriterion, MqapGoal } from "@/types/domain";
import { createGoal, markGoalAchieved, deleteGoal } from "@/lib/actions/mqap";
import { useHaptics } from "@/lib/hooks/use-haptics";

interface MqapGoalListClientProps {
  initialGoals: MqapGoal[];
  staff: Array<{
    id: string;
    first_name: string | null;
    last_name: string | null;
  }>;
  criteria: MqapCriterion[];
  canManage: boolean;
}

export function MqapGoalListClient({
  initialGoals,
  staff,
  criteria,
  canManage,
}: MqapGoalListClientProps) {
  const [goals, setGoals] = useState(initialGoals);
  const [showForm, setShowForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isPending, startTransition] = useTransition();
  const haptics = useHaptics();

  const filteredGoals =
    statusFilter === "all"
      ? goals
      : goals.filter((g) => g.status === statusFilter);

  const criteriaMap = new Map(criteria.map((c) => [c.id, c]));

  function handleCreate(formData: FormData) {
    haptics.impact("medium");
    startTransition(async () => {
      const result = await createGoal({
        criteria_id: formData.get("criteria_id") as string,
        description: formData.get("description") as string,
        strategies: (formData.get("strategies") as string) || null,
        responsible_person_id:
          (formData.get("responsible_person_id") as string) || null,
        due_date: (formData.get("due_date") as string) || null,
        success_measures: (formData.get("success_measures") as string) || null,
      });
      if (result.data) {
        setGoals((prev) => [result.data!, ...prev]);
        setShowForm(false);
      }
    });
  }

  function handleAchieve(goalId: string) {
    haptics.impact("heavy");
    startTransition(async () => {
      const result = await markGoalAchieved(goalId);
      if (result.data) {
        setGoals((prev) =>
          prev.map((g) => (g.id === goalId ? result.data! : g)),
        );
      }
    });
  }

  function handleDelete(goalId: string) {
    haptics.impact("medium");
    startTransition(async () => {
      const result = await deleteGoal(goalId);
      if (result.data) {
        setGoals((prev) => prev.filter((g) => g.id !== goalId));
      }
    });
  }

  return (
    <div className="space-y-4">
      {/* Filters + add button */}
      <div className="flex flex-wrap items-center gap-3">
        {["all", "not_started", "in_progress", "achieved"].map((s) => (
          <button
            key={s}
            type="button"
            className="active-push rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors"
            style={{
              backgroundColor:
                statusFilter === s ? "var(--primary)" : "var(--muted)",
              color:
                statusFilter === s
                  ? "var(--primary-foreground)"
                  : "var(--muted-foreground)",
            }}
            onClick={() => {
              haptics.impact("light");
              setStatusFilter(s);
            }}
          >
            {s === "all"
              ? "All"
              : s === "not_started"
                ? "Not Started"
                : s === "in_progress"
                  ? "In Progress"
                  : "Achieved"}
          </button>
        ))}

        {canManage && (
          <button
            type="button"
            className="active-push touch-target ml-auto rounded-lg px-4 py-2 text-sm font-semibold"
            style={{
              backgroundColor: "var(--primary)",
              color: "var(--primary-foreground)",
            }}
            onClick={() => {
              haptics.impact("light");
              setShowForm(!showForm);
            }}
          >
            {showForm ? "Cancel" : "+ New Goal"}
          </button>
        )}
      </div>

      {/* Create form */}
      {showForm && canManage && (
        <form
          className="rounded-xl border border-border p-4 space-y-3"
          style={{ backgroundColor: "var(--card)" }}
          action={handleCreate}
        >
          <div>
            <label
              className="mb-1 block text-xs font-semibold"
              style={{ color: "var(--muted-foreground)" }}
            >
              Criterion
            </label>
            <select
              name="criteria_id"
              required
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
              style={{
                backgroundColor: "var(--input)",
                color: "var(--foreground)",
              }}
            >
              <option value="">Select a criterion...</option>
              {criteria.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} - {c.criterion_text.substring(0, 80)}
                  {c.criterion_text.length > 80 ? "..." : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              className="mb-1 block text-xs font-semibold"
              style={{ color: "var(--muted-foreground)" }}
            >
              Description
            </label>
            <textarea
              name="description"
              required
              rows={3}
              className="w-full resize-none rounded-lg border border-border px-3 py-2 text-sm"
              style={{
                backgroundColor: "var(--input)",
                color: "var(--foreground)",
              }}
              placeholder="What needs to improve?"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label
                className="mb-1 block text-xs font-semibold"
                style={{ color: "var(--muted-foreground)" }}
              >
                Strategies
              </label>
              <textarea
                name="strategies"
                rows={2}
                className="w-full resize-none rounded-lg border border-border px-3 py-2 text-sm"
                style={{
                  backgroundColor: "var(--input)",
                  color: "var(--foreground)",
                }}
                placeholder="How will we achieve this?"
              />
            </div>
            <div>
              <label
                className="mb-1 block text-xs font-semibold"
                style={{ color: "var(--muted-foreground)" }}
              >
                Success Measures
              </label>
              <textarea
                name="success_measures"
                rows={2}
                className="w-full resize-none rounded-lg border border-border px-3 py-2 text-sm"
                style={{
                  backgroundColor: "var(--input)",
                  color: "var(--foreground)",
                }}
                placeholder="How will we know it's achieved?"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label
                className="mb-1 block text-xs font-semibold"
                style={{ color: "var(--muted-foreground)" }}
              >
                Responsible Person
              </label>
              <select
                name="responsible_person_id"
                className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                style={{
                  backgroundColor: "var(--input)",
                  color: "var(--foreground)",
                }}
              >
                <option value="">Unassigned</option>
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.first_name} {s.last_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                className="mb-1 block text-xs font-semibold"
                style={{ color: "var(--muted-foreground)" }}
              >
                Due Date
              </label>
              <input
                type="date"
                name="due_date"
                className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                style={{
                  backgroundColor: "var(--input)",
                  color: "var(--foreground)",
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="active-push touch-target rounded-lg px-4 py-2 text-sm font-semibold"
            style={{
              backgroundColor: "var(--primary)",
              color: "var(--primary-foreground)",
            }}
          >
            {isPending ? "Creating..." : "Create Goal"}
          </button>
        </form>
      )}

      {/* Goal list */}
      {filteredGoals.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
            {statusFilter === "all"
              ? "No improvement goals yet"
              : `No ${statusFilter.replace("_", " ")} goals`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredGoals.map((goal) => {
            const criterion = criteriaMap.get(goal.criteria_id);
            const isOverdue =
              goal.status !== "achieved" &&
              goal.due_date &&
              goal.due_date < new Date().toISOString().split("T")[0];

            return (
              <div
                key={goal.id}
                className="rounded-xl border border-border p-4"
                style={{ backgroundColor: "var(--card)" }}
              >
                <div className="mb-2 flex items-start justify-between gap-3">
                  <div className="flex-1">
                    {criterion && (
                      <p
                        className="text-xs font-bold"
                        style={{ color: "var(--muted-foreground)" }}
                      >
                        {criterion.code}
                      </p>
                    )}
                    <p
                      className="mt-1 text-sm font-medium"
                      style={{ color: "var(--foreground)" }}
                    >
                      {goal.description}
                    </p>
                  </div>

                  <span
                    className="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium"
                    style={{
                      backgroundColor:
                        goal.status === "achieved"
                          ? "var(--qip-exceeding-bg)"
                          : goal.status === "in_progress"
                            ? "var(--qip-meeting-bg)"
                            : "var(--muted)",
                      color:
                        goal.status === "achieved"
                          ? "var(--qip-exceeding-fg)"
                          : goal.status === "in_progress"
                            ? "var(--qip-meeting-fg)"
                            : "var(--muted-foreground)",
                    }}
                  >
                    {goal.status === "not_started"
                      ? "Not Started"
                      : goal.status === "in_progress"
                        ? "In Progress"
                        : "Achieved"}
                  </span>
                </div>

                {goal.strategies && (
                  <p
                    className="text-xs"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    <span className="font-semibold">Strategies:</span>{" "}
                    {goal.strategies}
                  </p>
                )}

                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                  {goal.due_date && (
                    <span
                      style={{
                        color: isOverdue
                          ? "var(--destructive)"
                          : "var(--muted-foreground)",
                      }}
                    >
                      Due: {goal.due_date}
                      {isOverdue && " (overdue)"}
                    </span>
                  )}

                  {canManage && goal.status !== "achieved" && (
                    <div className="ml-auto flex gap-2">
                      <button
                        type="button"
                        className="active-push rounded px-2 py-1 text-xs font-medium"
                        style={{
                          backgroundColor: "var(--qip-exceeding-bg)",
                          color: "var(--qip-exceeding-fg)",
                        }}
                        onClick={() => handleAchieve(goal.id)}
                        disabled={isPending}
                      >
                        Mark Achieved
                      </button>
                      <button
                        type="button"
                        className="active-push rounded px-2 py-1 text-xs font-medium"
                        style={{
                          backgroundColor: "var(--destructive)",
                          color: "var(--destructive-foreground)",
                        }}
                        onClick={() => handleDelete(goal.id)}
                        disabled={isPending}
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
