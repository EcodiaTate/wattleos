"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useHaptics } from "@/lib/hooks/use-haptics";
import { createDrill, updateDrill } from "@/lib/actions/emergency-drills";
import type { EmergencyDrill } from "@/types/domain";
import type { CreateDrillInput } from "@/lib/validations/emergency-drills";

const DRILL_TYPES = [
  { value: "fire_evacuation", label: "Fire Evacuation", emoji: "\u{1F525}" },
  { value: "lockdown", label: "Lockdown", emoji: "\u{1F512}" },
  { value: "shelter_in_place", label: "Shelter in Place", emoji: "\u{1F3E0}" },
  { value: "medical_emergency", label: "Medical Emergency", emoji: "\u{1FA7A}" },
  { value: "other", label: "Other", emoji: "\u{1F514}" },
] as const;

interface DrillFormProps {
  drill?: EmergencyDrill;
  classes: Array<{ id: string; name: string }>;
  staff: Array<{ id: string; name: string }>;
}

export function DrillForm({ drill, classes, staff }: DrillFormProps) {
  const router = useRouter();
  const haptics = useHaptics();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [drillType, setDrillType] = useState(drill?.drill_type ?? "fire_evacuation");
  const [drillTypeOther, setDrillTypeOther] = useState(drill?.drill_type_other ?? "");
  const [scheduledDate, setScheduledDate] = useState(drill?.scheduled_date ?? "");
  const [scheduledTime, setScheduledTime] = useState(drill?.scheduled_time ?? "");
  const [assemblyPoint, setAssemblyPoint] = useState(drill?.assembly_point ?? "");
  const [locationNotes, setLocationNotes] = useState(drill?.location_notes ?? "");
  const [scenarioDescription, setScenarioDescription] = useState(drill?.scenario_description ?? "");
  const [notes, setNotes] = useState(drill?.notes ?? "");
  const [isWholeOfService, setIsWholeOfService] = useState(drill?.is_whole_of_service ?? false);
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>(drill?.participating_class_ids ?? []);
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>(drill?.staff_participant_ids ?? []);

  function toggleItem(arr: string[], id: string): string[] {
    return arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id];
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const input: CreateDrillInput = {
      drill_type: drillType as CreateDrillInput["drill_type"],
      drill_type_other: drillType === "other" ? drillTypeOther : null,
      scenario_description: scenarioDescription || null,
      scheduled_date: scheduledDate,
      scheduled_time: scheduledTime || null,
      assembly_point: assemblyPoint || null,
      location_notes: locationNotes || null,
      is_whole_of_service: isWholeOfService,
      participating_class_ids: isWholeOfService ? [] : selectedClassIds,
      staff_participant_ids: selectedStaffIds,
      notes: notes || null,
    };

    startTransition(async () => {
      const result = drill
        ? await updateDrill(drill.id, input)
        : await createDrill(input);

      if (result.error) {
        setError(result.error.message);
        haptics.error();
        return;
      }

      haptics.success();
      router.push(`/admin/emergency-drills/${result.data!.id}`);
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

      {/* Drill Type */}
      <div className="space-y-2">
        <label
          className="text-sm font-medium"
          style={{ color: "var(--foreground)" }}
        >
          Drill Type
        </label>
        <div className="flex flex-wrap gap-2">
          {DRILL_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => {
                haptics.selection();
                setDrillType(t.value);
              }}
              className="active-push rounded-full border px-3 py-1.5 text-xs font-medium transition-colors"
              style={{
                borderColor:
                  drillType === t.value ? "var(--primary)" : "var(--border)",
                background:
                  drillType === t.value ? "var(--primary)" : "transparent",
                color:
                  drillType === t.value
                    ? "var(--primary-foreground)"
                    : "var(--foreground)",
              }}
            >
              {t.emoji} {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Other type description */}
      {drillType === "other" && (
        <div className="space-y-1">
          <label
            className="text-sm font-medium"
            style={{ color: "var(--foreground)" }}
          >
            Describe drill type
          </label>
          <input
            type="text"
            value={drillTypeOther}
            onChange={(e) => setDrillTypeOther(e.target.value)}
            placeholder="e.g., Earthquake, Bushfire, Bomb Threat"
            className="w-full rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
            style={{ background: "var(--input)", color: "var(--foreground)" }}
          />
        </div>
      )}

      {/* Date & Time */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label
            className="text-sm font-medium"
            style={{ color: "var(--foreground)" }}
          >
            Date
          </label>
          <input
            type="date"
            value={scheduledDate}
            onChange={(e) => setScheduledDate(e.target.value)}
            required
            className="w-full rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
            style={{ background: "var(--input)", color: "var(--foreground)" }}
          />
        </div>
        <div className="space-y-1">
          <label
            className="text-sm font-medium"
            style={{ color: "var(--foreground)" }}
          >
            Time (optional)
          </label>
          <input
            type="time"
            value={scheduledTime}
            onChange={(e) => setScheduledTime(e.target.value)}
            className="w-full rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
            style={{ background: "var(--input)", color: "var(--foreground)" }}
          />
        </div>
      </div>

      {/* Assembly Point */}
      <div className="space-y-1">
        <label
          className="text-sm font-medium"
          style={{ color: "var(--foreground)" }}
        >
          Assembly Point (optional)
        </label>
        <input
          type="text"
          value={assemblyPoint}
          onChange={(e) => setAssemblyPoint(e.target.value)}
          placeholder="e.g., Front car park, Oval"
          className="w-full rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
          style={{ background: "var(--input)", color: "var(--foreground)" }}
        />
      </div>

      {/* Scope */}
      <div className="space-y-2">
        <label
          className="text-sm font-medium"
          style={{ color: "var(--foreground)" }}
        >
          Scope
        </label>
        <button
          type="button"
          onClick={() => {
            haptics.light();
            setIsWholeOfService(!isWholeOfService);
          }}
          className="active-push flex items-center gap-2 rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm transition-colors"
          style={{
            background: isWholeOfService ? "var(--primary)" : "var(--input)",
            color: isWholeOfService
              ? "var(--primary-foreground)"
              : "var(--foreground)",
          }}
        >
          <span className="text-base">{isWholeOfService ? "✓" : ""}</span>
          Whole of service (all classes)
        </button>
      </div>

      {/* Class selection (when not whole-of-service) */}
      {!isWholeOfService && classes.length > 0 && (
        <div className="space-y-2">
          <label
            className="text-sm font-medium"
            style={{ color: "var(--foreground)" }}
          >
            Participating Classes
          </label>
          <div className="flex flex-wrap gap-2">
            {classes.map((cls) => (
              <button
                key={cls.id}
                type="button"
                onClick={() => {
                  haptics.selection();
                  setSelectedClassIds(toggleItem(selectedClassIds, cls.id));
                }}
                className="active-push rounded-full border px-3 py-1.5 text-xs font-medium transition-colors"
                style={{
                  borderColor: selectedClassIds.includes(cls.id)
                    ? "var(--primary)"
                    : "var(--border)",
                  background: selectedClassIds.includes(cls.id)
                    ? "var(--primary)"
                    : "transparent",
                  color: selectedClassIds.includes(cls.id)
                    ? "var(--primary-foreground)"
                    : "var(--foreground)",
                }}
              >
                {cls.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Staff selection */}
      {staff.length > 0 && (
        <div className="space-y-2">
          <label
            className="text-sm font-medium"
            style={{ color: "var(--foreground)" }}
          >
            Participating Staff
          </label>
          <div className="flex flex-wrap gap-2">
            {staff.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  haptics.selection();
                  setSelectedStaffIds(toggleItem(selectedStaffIds, s.id));
                }}
                className="active-push rounded-full border px-3 py-1.5 text-xs font-medium transition-colors"
                style={{
                  borderColor: selectedStaffIds.includes(s.id)
                    ? "var(--primary)"
                    : "var(--border)",
                  background: selectedStaffIds.includes(s.id)
                    ? "var(--primary)"
                    : "transparent",
                  color: selectedStaffIds.includes(s.id)
                    ? "var(--primary-foreground)"
                    : "var(--foreground)",
                }}
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Scenario description */}
      <div className="space-y-1">
        <label
          className="text-sm font-medium"
          style={{ color: "var(--foreground)" }}
        >
          Scenario Description (optional)
        </label>
        <textarea
          value={scenarioDescription}
          onChange={(e) => setScenarioDescription(e.target.value)}
          placeholder="e.g., Fire detected in kitchen area at 10:30am..."
          rows={3}
          className="w-full rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
          style={{ background: "var(--input)", color: "var(--foreground)" }}
        />
      </div>

      {/* Location notes */}
      <div className="space-y-1">
        <label
          className="text-sm font-medium"
          style={{ color: "var(--foreground)" }}
        >
          Location Notes (optional)
        </label>
        <input
          type="text"
          value={locationNotes}
          onChange={(e) => setLocationNotes(e.target.value)}
          placeholder="e.g., Use rear exit, not main entrance"
          className="w-full rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
          style={{ background: "var(--input)", color: "var(--foreground)" }}
        />
      </div>

      {/* Notes */}
      <div className="space-y-1">
        <label
          className="text-sm font-medium"
          style={{ color: "var(--foreground)" }}
        >
          Notes (optional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="w-full rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
          style={{ background: "var(--input)", color: "var(--foreground)" }}
        />
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={isPending}
        className="active-push touch-target w-full rounded-[var(--radius-md)] px-4 py-2 text-sm font-semibold transition-opacity disabled:opacity-50"
        style={{
          background: "var(--primary)",
          color: "var(--primary-foreground)",
        }}
      >
        {isPending
          ? "Saving..."
          : drill
            ? "Update Drill"
            : "Schedule Drill"}
      </button>
    </form>
  );
}
