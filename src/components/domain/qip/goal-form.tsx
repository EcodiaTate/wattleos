"use client";

import { useState, useTransition } from "react";
import type { QipGoal } from "@/types/domain";
import { NQS_QUALITY_AREAS } from "@/lib/constants/nqs-elements";
import { createGoal, updateGoal } from "@/lib/actions/qip";
import { useHaptics } from "@/lib/hooks/use-haptics";

interface GoalFormProps {
  editingGoal: QipGoal | null;
  staff: Array<{
    id: string;
    first_name: string | null;
    last_name: string | null;
  }>;
  defaultElementId?: string;
  onSaved: () => void;
  onCancel: () => void;
}

export function GoalForm({
  editingGoal,
  staff,
  defaultElementId,
  onSaved,
  onCancel,
}: GoalFormProps) {
  const [nqsElementId, setNqsElementId] = useState(
    editingGoal?.nqs_element_id ?? defaultElementId ?? "",
  );
  const [description, setDescription] = useState(
    editingGoal?.description ?? "",
  );
  const [strategies, setStrategies] = useState(editingGoal?.strategies ?? "");
  const [responsiblePersonId, setResponsiblePersonId] = useState(
    editingGoal?.responsible_person_id ?? "",
  );
  const [dueDate, setDueDate] = useState(editingGoal?.due_date ?? "");
  const [successMeasures, setSuccessMeasures] = useState(
    editingGoal?.success_measures ?? "",
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const haptics = useHaptics();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    haptics.impact("medium");

    startTransition(async () => {
      setError(null);

      if (editingGoal) {
        const result = await updateGoal({
          id: editingGoal.id,
          description,
          strategies: strategies || null,
          responsible_person_id: responsiblePersonId || null,
          due_date: dueDate || null,
          success_measures: successMeasures || null,
        });
        if (result.error) {
          haptics.error();
          setError(result.error.message);
        } else {
          haptics.success();
          onSaved();
        }
      } else {
        if (!nqsElementId) {
          setError("Please select an NQS element");
          return;
        }
        const result = await createGoal({
          nqs_element_id: nqsElementId,
          description,
          strategies: strategies || null,
          responsible_person_id: responsiblePersonId || null,
          due_date: dueDate || null,
          success_measures: successMeasures || null,
        });
        if (result.error) {
          haptics.error();
          setError(result.error.message);
        } else {
          haptics.success();
          onSaved();
        }
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-xl border border-border p-5"
      style={{ backgroundColor: "var(--card)" }}
    >
      <h3 className="text-sm font-bold" style={{ color: "var(--foreground)" }}>
        {editingGoal ? "Edit Goal" : "New Improvement Goal"}
      </h3>

      {/* Element picker */}
      {!editingGoal && (
        <div>
          <label
            className="mb-1 block text-xs font-bold uppercase tracking-wider"
            style={{ color: "var(--muted-foreground)" }}
          >
            NQS Element
          </label>
          <select
            value={nqsElementId}
            onChange={(e) => setNqsElementId(e.target.value)}
            required
            className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
            style={{
              backgroundColor: "var(--input)",
              color: "var(--foreground)",
            }}
          >
            <option value="">Select an element...</option>
            {NQS_QUALITY_AREAS.map((qa) => (
              <optgroup key={qa.id} label={`QA${qa.id}: ${qa.name}`}>
                {qa.standards.flatMap((s) =>
                  s.elements.map((el) => (
                    <option key={el.id} value={el.id}>
                      {el.id} - {el.name}
                    </option>
                  )),
                )}
              </optgroup>
            ))}
          </select>
        </div>
      )}

      {/* Description */}
      <div>
        <label
          className="mb-1 block text-xs font-bold uppercase tracking-wider"
          style={{ color: "var(--muted-foreground)" }}
        >
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          rows={3}
          placeholder="What improvement is needed?"
          className="w-full resize-none rounded-lg border border-border px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
          style={{
            backgroundColor: "var(--input)",
            color: "var(--foreground)",
          }}
        />
      </div>

      {/* Strategies */}
      <div>
        <label
          className="mb-1 block text-xs font-bold uppercase tracking-wider"
          style={{ color: "var(--muted-foreground)" }}
        >
          Strategies
        </label>
        <textarea
          value={strategies}
          onChange={(e) => setStrategies(e.target.value)}
          rows={2}
          placeholder="How will this be achieved?"
          className="w-full resize-none rounded-lg border border-border px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
          style={{
            backgroundColor: "var(--input)",
            color: "var(--foreground)",
          }}
        />
      </div>

      {/* Responsible person + due date */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label
            className="mb-1 block text-xs font-bold uppercase tracking-wider"
            style={{ color: "var(--muted-foreground)" }}
          >
            Responsible Person
          </label>
          <select
            value={responsiblePersonId}
            onChange={(e) => setResponsiblePersonId(e.target.value)}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
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
            className="mb-1 block text-xs font-bold uppercase tracking-wider"
            style={{ color: "var(--muted-foreground)" }}
          >
            Due Date
          </label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
            style={{
              backgroundColor: "var(--input)",
              color: "var(--foreground)",
            }}
          />
        </div>
      </div>

      {/* Success measures */}
      <div>
        <label
          className="mb-1 block text-xs font-bold uppercase tracking-wider"
          style={{ color: "var(--muted-foreground)" }}
        >
          Success Measures
        </label>
        <input
          type="text"
          value={successMeasures}
          onChange={(e) => setSuccessMeasures(e.target.value)}
          placeholder="How will success be measured?"
          className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
          style={{
            backgroundColor: "var(--input)",
            color: "var(--foreground)",
          }}
        />
      </div>

      {/* Error */}
      {error && (
        <p className="text-sm" style={{ color: "var(--destructive)" }}>
          {error}
        </p>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={isPending}
          className="active-push touch-target rounded-lg px-4 py-2 text-sm font-medium"
          style={{
            backgroundColor: "var(--muted)",
            color: "var(--foreground)",
          }}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="active-push touch-target rounded-lg px-4 py-2 text-sm font-semibold"
          style={{
            backgroundColor: "var(--primary)",
            color: "var(--primary-foreground)",
            opacity: isPending ? 0.6 : 1,
          }}
        >
          {isPending
            ? "Saving..."
            : editingGoal
              ? "Update Goal"
              : "Create Goal"}
        </button>
      </div>
    </form>
  );
}
