"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useHaptics } from "@/lib/hooks/use-haptics";
import { createExcursion, updateExcursion } from "@/lib/actions/excursions";
import type { Excursion } from "@/types/domain";
import type { CreateExcursionInput } from "@/lib/validations/excursions";

interface ExcursionFormProps {
  /** If provided, form is in edit mode */
  excursion?: Excursion;
  /** Available educators for supervision picker */
  educators: { id: string; name: string }[];
  /** Available students for attendance picker */
  students: { id: string; name: string }[];
}

const TRANSPORT_OPTIONS = [
  { value: "walking", label: "Walking" },
  { value: "private_vehicle", label: "Private Vehicle" },
  { value: "bus", label: "Bus" },
  { value: "public_transport", label: "Public Transport" },
  { value: "other", label: "Other" },
] as const;

export function ExcursionForm({
  excursion,
  educators,
  students,
}: ExcursionFormProps) {
  const router = useRouter();
  const haptics = useHaptics();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(excursion?.name ?? "");
  const [description, setDescription] = useState(excursion?.description ?? "");
  const [excursionDate, setExcursionDate] = useState(
    excursion?.excursion_date ?? "",
  );
  const [destination, setDestination] = useState(excursion?.destination ?? "");
  const [transportType, setTransportType] = useState(
    excursion?.transport_type ?? "walking",
  );
  const [departureTime, setDepartureTime] = useState(
    excursion?.departure_time ?? "",
  );
  const [returnTime, setReturnTime] = useState(excursion?.return_time ?? "");
  const [selectedEducators, setSelectedEducators] = useState<string[]>(
    excursion?.supervising_educator_ids ?? [],
  );
  const [selectedStudents, setSelectedStudents] = useState<string[]>(
    excursion?.attending_student_ids ?? [],
  );
  const [isRegular, setIsRegular] = useState(excursion?.is_regular ?? false);

  function toggleItem(list: string[], id: string): string[] {
    return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const input: CreateExcursionInput = {
      name,
      description: description || undefined,
      excursion_date: excursionDate,
      destination,
      transport_type: transportType as CreateExcursionInput["transport_type"],
      departure_time: departureTime || undefined,
      return_time: returnTime || undefined,
      supervising_educator_ids: selectedEducators,
      attending_student_ids: selectedStudents,
      is_regular: isRegular,
      regular_review_due: null,
    };

    startTransition(async () => {
      const result = excursion
        ? await updateExcursion(excursion.id, input)
        : await createExcursion(input);

      if (result.error) {
        setError(result.error.message ?? "Something went wrong");
        haptics.error();
        return;
      }

      haptics.success();
      router.push(`/excursions/${result.data!.id}`);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div
          className="rounded-[var(--radius-md)] border p-3 text-sm"
          style={{
            borderColor: "var(--destructive)",
            background:
              "color-mix(in srgb, var(--destructive) 8%, transparent)",
            color: "var(--destructive)",
          }}
        >
          {error}
        </div>
      )}

      {/* Name + Destination */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label
            className="text-sm font-medium"
            style={{ color: "var(--foreground)" }}
          >
            Excursion Name *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Park Visit - Term 1"
            required
            className="w-full rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
            style={{ background: "var(--input)", color: "var(--foreground)" }}
          />
        </div>
        <div className="space-y-1.5">
          <label
            className="text-sm font-medium"
            style={{ color: "var(--foreground)" }}
          >
            Destination *
          </label>
          <input
            type="text"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="e.g. Fitzroy Gardens"
            required
            className="w-full rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
            style={{ background: "var(--input)", color: "var(--foreground)" }}
          />
        </div>
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <label
          className="text-sm font-medium"
          style={{ color: "var(--foreground)" }}
        >
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Brief description of activities and purpose..."
          rows={3}
          className="w-full rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
          style={{ background: "var(--input)", color: "var(--foreground)" }}
        />
      </div>

      {/* Date + Times + Transport */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="space-y-1.5">
          <label
            className="text-sm font-medium"
            style={{ color: "var(--foreground)" }}
          >
            Date *
          </label>
          <input
            type="date"
            value={excursionDate}
            onChange={(e) => setExcursionDate(e.target.value)}
            required
            className="w-full rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
            style={{ background: "var(--input)", color: "var(--foreground)" }}
          />
        </div>
        <div className="space-y-1.5">
          <label
            className="text-sm font-medium"
            style={{ color: "var(--foreground)" }}
          >
            Departure
          </label>
          <input
            type="time"
            value={departureTime}
            onChange={(e) => setDepartureTime(e.target.value)}
            className="w-full rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
            style={{ background: "var(--input)", color: "var(--foreground)" }}
          />
        </div>
        <div className="space-y-1.5">
          <label
            className="text-sm font-medium"
            style={{ color: "var(--foreground)" }}
          >
            Return
          </label>
          <input
            type="time"
            value={returnTime}
            onChange={(e) => setReturnTime(e.target.value)}
            className="w-full rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
            style={{ background: "var(--input)", color: "var(--foreground)" }}
          />
        </div>
        <div className="space-y-1.5">
          <label
            className="text-sm font-medium"
            style={{ color: "var(--foreground)" }}
          >
            Transport *
          </label>
          <select
            value={transportType}
            onChange={(e) =>
              setTransportType(
                e.target.value as CreateExcursionInput["transport_type"],
              )
            }
            className="w-full rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
            style={{ background: "var(--input)", color: "var(--foreground)" }}
          >
            {TRANSPORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Regular excursion toggle */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={isRegular}
          onChange={(e) => {
            setIsRegular(e.target.checked);
            haptics.light();
          }}
          className="rounded border-border"
        />
        <span className="text-sm" style={{ color: "var(--foreground)" }}>
          Regular excursion (e.g. weekly park visit - risk assessed once,
          reviewed annually)
        </span>
      </label>

      {/* Supervising Educators */}
      <div className="space-y-2">
        <label
          className="text-sm font-medium"
          style={{ color: "var(--foreground)" }}
        >
          Supervising Educators * ({selectedEducators.length} selected)
        </label>
        <div className="flex flex-wrap gap-2">
          {educators.map((ed) => {
            const selected = selectedEducators.includes(ed.id);
            return (
              <button
                key={ed.id}
                type="button"
                onClick={() => {
                  haptics.selection();
                  setSelectedEducators(toggleItem(selectedEducators, ed.id));
                }}
                className="active-push rounded-full border px-3 py-1.5 text-xs font-medium transition-colors"
                style={{
                  borderColor: selected ? "var(--primary)" : "var(--border)",
                  background: selected ? "var(--primary)" : "transparent",
                  color: selected
                    ? "var(--primary-foreground)"
                    : "var(--foreground)",
                }}
              >
                {ed.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Attending Students */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label
            className="text-sm font-medium"
            style={{ color: "var(--foreground)" }}
          >
            Attending Students * ({selectedStudents.length} selected)
          </label>
          <button
            type="button"
            onClick={() => {
              haptics.light();
              if (selectedStudents.length === students.length) {
                setSelectedStudents([]);
              } else {
                setSelectedStudents(students.map((s) => s.id));
              }
            }}
            className="text-xs font-medium"
            style={{ color: "var(--primary)" }}
          >
            {selectedStudents.length === students.length
              ? "Deselect All"
              : "Select All"}
          </button>
        </div>
        <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto scroll-native">
          {students.map((st) => {
            const selected = selectedStudents.includes(st.id);
            return (
              <button
                key={st.id}
                type="button"
                onClick={() => {
                  haptics.selection();
                  setSelectedStudents(toggleItem(selectedStudents, st.id));
                }}
                className="active-push rounded-full border px-3 py-1.5 text-xs font-medium transition-colors"
                style={{
                  borderColor: selected ? "var(--primary)" : "var(--border)",
                  background: selected ? "var(--primary)" : "transparent",
                  color: selected
                    ? "var(--primary-foreground)"
                    : "var(--foreground)",
                }}
              >
                {st.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Submit */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="active-push touch-target rounded-[var(--radius-md)] border border-border px-4 py-2 text-sm font-medium"
          style={{ color: "var(--foreground)" }}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="active-push touch-target rounded-[var(--radius-md)] px-4 py-2 text-sm font-semibold transition-opacity disabled:opacity-50"
          style={{
            background: "var(--primary)",
            color: "var(--primary-foreground)",
          }}
        >
          {isPending
            ? "Saving..."
            : excursion
              ? "Update Excursion"
              : "Create Excursion"}
        </button>
      </div>
    </form>
  );
}
