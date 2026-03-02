"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { RosterTemplateWithShifts, ShiftRole } from "@/types/domain";
import { addTemplateShift, deleteTemplateShift, updateRosterTemplate } from "@/lib/actions/rostering";
import { ShiftRoleBadge } from "./shift-role-badge";
import { WEEKDAY_LABELS } from "@/lib/constants/rostering";
import { useHaptics } from "@/lib/hooks/use-haptics";

interface Props {
  template: RosterTemplateWithShifts;
  staff: Array<{ id: string; name: string }>;
  classes: Array<{ id: string; name: string }>;
}

export function TemplateEditorClient({ template, staff, classes }: Props) {
  const router = useRouter();
  const haptics = useHaptics();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(template.name);
  const [showAddShift, setShowAddShift] = useState(false);

  function handleSaveName() {
    if (name === template.name) return;
    startTransition(async () => {
      const result = await updateRosterTemplate({ templateId: template.id, name });
      if (result.error) { setError(result.error.message); haptics.error(); return; }
      haptics.success();
      router.refresh();
    });
  }

  function handleDeleteShift(shiftId: string) {
    startTransition(async () => {
      haptics.impact("medium");
      await deleteTemplateShift(shiftId);
      router.refresh();
    });
  }

  function handleAddShift(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await addTemplateShift({
        templateId: template.id,
        userId: fd.get("userId") as string,
        dayOfWeek: Number(fd.get("dayOfWeek")),
        startTime: fd.get("startTime") as string,
        endTime: fd.get("endTime") as string,
        breakMinutes: Number(fd.get("breakMinutes") || 30),
        shiftRole: ((fd.get("shiftRole") as string) || "general") as ShiftRole,
        classId: (fd.get("classId") as string) || undefined,
      });
      if (result.error) { setError(result.error.message); haptics.error(); return; }
      haptics.success();
      setShowAddShift(false);
      router.refresh();
    });
  }

  // Group shifts by day
  const shiftsByDay = new Map<number, typeof template.shifts>();
  for (let d = 1; d <= 7; d++) shiftsByDay.set(d, []);
  for (const s of template.shifts) {
    const arr = shiftsByDay.get(s.day_of_week) ?? [];
    arr.push(s);
    shiftsByDay.set(s.day_of_week, arr);
  }

  return (
    <div className="space-y-5">
      {error && <p className="text-sm" style={{ color: "var(--destructive)" }}>{error}</p>}

      {/* Name edit */}
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <label className="mb-1 block text-sm font-medium" style={{ color: "var(--foreground)" }}>
            Template Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={handleSaveName}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm"
            style={{ backgroundColor: "var(--input)", color: "var(--foreground)" }}
          />
        </div>
      </div>

      {/* Add shift toggle */}
      <button
        onClick={() => setShowAddShift(!showAddShift)}
        className="active-push touch-target rounded-lg border border-border px-3 py-1.5 text-sm"
        style={{ color: "var(--foreground)" }}
      >
        + Add Template Shift
      </button>

      {showAddShift && (
        <div className="rounded-xl border border-border p-4" style={{ backgroundColor: "var(--card)" }}>
          <form onSubmit={handleAddShift} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <select name="userId" required className="rounded-lg border border-border px-2 py-1.5 text-sm" style={{ backgroundColor: "var(--input)", color: "var(--foreground)" }}>
              <option value="">Staff…</option>
              {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <select name="dayOfWeek" required className="rounded-lg border border-border px-2 py-1.5 text-sm" style={{ backgroundColor: "var(--input)", color: "var(--foreground)" }}>
              {WEEKDAY_LABELS.map((label, i) => <option key={i} value={i + 1}>{label}</option>)}
            </select>
            <input name="startTime" type="time" defaultValue="08:00" required className="rounded-lg border border-border px-2 py-1.5 text-sm" style={{ backgroundColor: "var(--input)", color: "var(--foreground)" }} />
            <input name="endTime" type="time" defaultValue="16:00" required className="rounded-lg border border-border px-2 py-1.5 text-sm" style={{ backgroundColor: "var(--input)", color: "var(--foreground)" }} />
            <select name="shiftRole" className="rounded-lg border border-border px-2 py-1.5 text-sm" style={{ backgroundColor: "var(--input)", color: "var(--foreground)" }}>
              <option value="general">General</option>
              <option value="lead">Lead</option>
              <option value="co_educator">Co-Educator</option>
              <option value="float">Float</option>
              <option value="admin">Admin</option>
            </select>
            <select name="classId" className="rounded-lg border border-border px-2 py-1.5 text-sm" style={{ backgroundColor: "var(--input)", color: "var(--foreground)" }}>
              <option value="">No class</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input name="breakMinutes" type="number" defaultValue={30} min={0} className="rounded-lg border border-border px-2 py-1.5 text-sm" style={{ backgroundColor: "var(--input)", color: "var(--foreground)" }} />
            <button type="submit" disabled={isPending} className="active-push rounded-lg px-3 py-1.5 text-sm font-medium disabled:opacity-50" style={{ backgroundColor: "var(--primary)", color: "var(--primary-foreground)" }}>
              {isPending ? "Adding…" : "Add"}
            </button>
          </form>
        </div>
      )}

      {/* Day-by-day view */}
      <div className="space-y-3">
        {Array.from({ length: 7 }, (_, i) => i + 1).map((day) => {
          const dayShifts = shiftsByDay.get(day) ?? [];
          return (
            <div key={day} className="rounded-xl border border-border p-3" style={{ backgroundColor: "var(--card)" }}>
              <h3 className="mb-2 text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                {WEEKDAY_LABELS[day - 1]}
              </h3>
              {dayShifts.length === 0 ? (
                <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>No shifts</p>
              ) : (
                <div className="space-y-1">
                  {dayShifts.map((s) => (
                    <div key={s.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-1.5 text-sm">
                      <div className="flex items-center gap-2">
                        <span style={{ color: "var(--foreground)" }}>{(s as unknown as { user_name: string }).user_name ?? "Unknown"}</span>
                        <ShiftRoleBadge role={s.shift_role as ShiftRole} />
                        {(s as unknown as { class_name: string | null }).class_name && <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>{(s as unknown as { class_name: string }).class_name}</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span style={{ color: "var(--muted-foreground)" }}>{s.start_time}–{s.end_time}</span>
                        <button onClick={() => handleDeleteShift(s.id)} disabled={isPending} className="text-xs underline-offset-2 hover:underline" style={{ color: "var(--destructive)" }}>×</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
