"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type {
  RosterWeekWithShifts,
  ShiftWithDetails,
  ShiftRole,
} from "@/types/domain";
import { ShiftStatusBadge } from "./shift-status-badge";
import { ShiftRoleBadge } from "./shift-role-badge";
import { RosterWeekStatusBadge } from "./roster-week-status-badge";
import {
  createShift,
  cancelShift,
  publishRosterWeek,
  lockRosterWeek,
} from "@/lib/actions/rostering";
import { WEEKDAY_LABELS, getWeekDates } from "@/lib/constants/rostering";
import { useHaptics } from "@/lib/hooks/use-haptics";

interface Props {
  data: RosterWeekWithShifts;
  canManage: boolean;
  classes: Array<{ id: string; name: string }>;
  staff: Array<{ id: string; name: string }>;
}

export function RosterWeekGridClient({
  data,
  canManage,
  classes,
  staff,
}: Props) {
  const router = useRouter();
  const haptics = useHaptics();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showAddShift, setShowAddShift] = useState(false);

  const weekDates = getWeekDates(data.week_start_date);
  const isDraft = data.status === "draft";
  const isPublished = data.status === "published";

  // Group shifts by date
  const shiftsByDate = new Map<string, ShiftWithDetails[]>();
  for (const date of weekDates) {
    shiftsByDate.set(date, []);
  }
  for (const shift of data.shifts) {
    const dateShifts = shiftsByDate.get(shift.date) ?? [];
    dateShifts.push(shift);
    shiftsByDate.set(shift.date, dateShifts);
  }

  function handlePublish() {
    startTransition(async () => {
      haptics.impact("heavy");
      const result = await publishRosterWeek({ rosterWeekId: data.id });
      if (result.error) {
        setError(result.error.message);
        haptics.error();
        return;
      }
      haptics.success();
      router.refresh();
    });
  }

  function handleLock() {
    startTransition(async () => {
      haptics.impact("heavy");
      const result = await lockRosterWeek(data.id);
      if (result.error) {
        setError(result.error.message);
        haptics.error();
        return;
      }
      haptics.success();
      router.refresh();
    });
  }

  function handleCancelShift(shiftId: string) {
    startTransition(async () => {
      haptics.impact("medium");
      const result = await cancelShift({
        shiftId,
        reason: "Cancelled from roster view",
      });
      if (result.error) {
        setError(result.error.message);
        haptics.error();
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="text-sm" style={{ color: "var(--destructive)" }}>
          {error}
        </p>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2
            className="text-lg font-bold"
            style={{ color: "var(--foreground)" }}
          >
            Week of {data.week_start_date}
          </h2>
          <RosterWeekStatusBadge status={data.status} />
        </div>
        <div
          className="flex items-center gap-2 text-sm"
          style={{ color: "var(--muted-foreground)" }}
        >
          <span>{data.total_staff_count} staff</span>
          <span>·</span>
          <span>{data.total_shift_hours}h total</span>
        </div>
      </div>

      {/* Actions */}
      {canManage && (
        <div className="flex flex-wrap gap-2">
          {isDraft && (
            <>
              <button
                onClick={() => setShowAddShift(!showAddShift)}
                className="active-push touch-target rounded-lg border border-border px-3 py-1.5 text-sm"
                style={{ color: "var(--foreground)" }}
              >
                + Add Shift
              </button>
              <button
                onClick={handlePublish}
                disabled={isPending || data.shifts.length === 0}
                className="active-push touch-target rounded-lg px-3 py-1.5 text-sm font-medium disabled:opacity-50"
                style={{
                  backgroundColor: "var(--primary)",
                  color: "var(--primary-foreground)",
                }}
              >
                Publish Roster
              </button>
            </>
          )}
          {isPublished && (
            <button
              onClick={handleLock}
              disabled={isPending}
              className="active-push touch-target rounded-lg px-3 py-1.5 text-sm font-medium disabled:opacity-50"
              style={{
                backgroundColor: "var(--destructive)",
                color: "var(--destructive-foreground)",
              }}
            >
              Lock Roster
            </button>
          )}
        </div>
      )}

      {/* Add Shift form (inline) */}
      {showAddShift && (
        <AddShiftForm
          rosterWeekId={data.id}
          weekDates={weekDates}
          staff={staff}
          classes={classes}
          onDone={() => {
            setShowAddShift(false);
            router.refresh();
          }}
        />
      )}

      {/* Day-by-day grid */}
      <div className="space-y-3">
        {weekDates.map((date, i) => {
          const dayShifts = shiftsByDate.get(date) ?? [];
          return (
            <div
              key={date}
              className="rounded-xl border border-border p-3"
              style={{ backgroundColor: "var(--card)" }}
            >
              <div className="mb-2 flex items-center justify-between">
                <h3
                  className="text-sm font-semibold"
                  style={{ color: "var(--foreground)" }}
                >
                  {WEEKDAY_LABELS[i]} - {date}
                </h3>
                <span
                  className="text-xs"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  {dayShifts.length} shift{dayShifts.length !== 1 ? "s" : ""}
                </span>
              </div>
              {dayShifts.length === 0 ? (
                <p
                  className="text-sm"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  No shifts
                </p>
              ) : (
                <div className="space-y-1.5">
                  {dayShifts.map((shift) => (
                    <div
                      key={shift.id}
                      className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <span style={{ color: "var(--foreground)" }}>
                          {shift.user_name}
                        </span>
                        <ShiftRoleBadge role={shift.shift_role as ShiftRole} />
                        {shift.class_name && (
                          <span
                            className="text-xs"
                            style={{ color: "var(--muted-foreground)" }}
                          >
                            {shift.class_name}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span style={{ color: "var(--muted-foreground)" }}>
                          {shift.start_time}–{shift.end_time}
                        </span>
                        <span
                          className="text-xs"
                          style={{ color: "var(--muted-foreground)" }}
                        >
                          ({shift.expected_hours}h)
                        </span>
                        <ShiftStatusBadge
                          status={shift.status as ShiftWithDetails["status"]}
                        />
                        {canManage && isDraft && (
                          <button
                            onClick={() => handleCancelShift(shift.id)}
                            className="text-xs underline-offset-2 hover:underline"
                            style={{ color: "var(--destructive)" }}
                          >
                            ×
                          </button>
                        )}
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

function AddShiftForm({
  rosterWeekId,
  weekDates,
  staff,
  classes,
  onDone,
}: {
  rosterWeekId: string;
  weekDates: string[];
  staff: Array<{ id: string; name: string }>;
  classes: Array<{ id: string; name: string }>;
  onDone: () => void;
}) {
  const haptics = useHaptics();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await createShift({
        rosterWeekId,
        userId: fd.get("userId") as string,
        date: fd.get("date") as string,
        startTime: fd.get("startTime") as string,
        endTime: fd.get("endTime") as string,
        breakMinutes: Number(fd.get("breakMinutes") || 30),
        shiftRole: ((fd.get("shiftRole") as string) || "general") as ShiftRole,
        classId: (fd.get("classId") as string) || undefined,
      });
      if (result.error) {
        setError(result.error.message);
        haptics.error();
        return;
      }
      haptics.success();
      onDone();
    });
  }

  return (
    <div
      className="rounded-xl border border-border p-4"
      style={{ backgroundColor: "var(--card)" }}
    >
      <h3
        className="mb-3 text-sm font-semibold"
        style={{ color: "var(--foreground)" }}
      >
        Add Shift
      </h3>
      {error && (
        <p className="mb-2 text-sm" style={{ color: "var(--destructive)" }}>
          {error}
        </p>
      )}
      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-2 gap-3 sm:grid-cols-4"
      >
        <select
          name="userId"
          required
          className="rounded-lg border border-border px-2 py-1.5 text-sm"
          style={{
            backgroundColor: "var(--input)",
            color: "var(--foreground)",
          }}
        >
          <option value="">Staff…</option>
          {staff.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <select
          name="date"
          required
          className="rounded-lg border border-border px-2 py-1.5 text-sm"
          style={{
            backgroundColor: "var(--input)",
            color: "var(--foreground)",
          }}
        >
          {weekDates.map((d, i) => (
            <option key={d} value={d}>
              {WEEKDAY_LABELS[i]} {d}
            </option>
          ))}
        </select>
        <input
          name="startTime"
          type="time"
          defaultValue="08:00"
          required
          className="rounded-lg border border-border px-2 py-1.5 text-sm"
          style={{
            backgroundColor: "var(--input)",
            color: "var(--foreground)",
          }}
        />
        <input
          name="endTime"
          type="time"
          defaultValue="16:00"
          required
          className="rounded-lg border border-border px-2 py-1.5 text-sm"
          style={{
            backgroundColor: "var(--input)",
            color: "var(--foreground)",
          }}
        />
        <select
          name="shiftRole"
          className="rounded-lg border border-border px-2 py-1.5 text-sm"
          style={{
            backgroundColor: "var(--input)",
            color: "var(--foreground)",
          }}
        >
          <option value="general">General</option>
          <option value="lead">Lead</option>
          <option value="co_educator">Co-Educator</option>
          <option value="float">Float</option>
          <option value="admin">Admin</option>
          <option value="kitchen">Kitchen</option>
          <option value="maintenance">Maintenance</option>
        </select>
        <select
          name="classId"
          className="rounded-lg border border-border px-2 py-1.5 text-sm"
          style={{
            backgroundColor: "var(--input)",
            color: "var(--foreground)",
          }}
        >
          <option value="">No class</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <input
          name="breakMinutes"
          type="number"
          defaultValue={30}
          min={0}
          className="rounded-lg border border-border px-2 py-1.5 text-sm"
          style={{
            backgroundColor: "var(--input)",
            color: "var(--foreground)",
          }}
          placeholder="Break min"
        />
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={isPending}
            className="active-push rounded-lg px-3 py-1.5 text-sm font-medium disabled:opacity-50"
            style={{
              backgroundColor: "var(--primary)",
              color: "var(--primary-foreground)",
            }}
          >
            {isPending ? "Adding…" : "Add"}
          </button>
          <button
            type="button"
            onClick={onDone}
            className="rounded-lg border border-border px-3 py-1.5 text-sm"
            style={{ color: "var(--foreground)" }}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
