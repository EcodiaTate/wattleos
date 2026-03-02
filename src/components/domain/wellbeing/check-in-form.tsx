"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useHaptics } from "@/lib/hooks/use-haptics";
import type { WellbeingCheckInWithStudent, Student } from "@/types/domain";
import {
  scheduleCheckIn,
  completeCheckIn,
  rescheduleCheckIn,
  deleteCheckIn,
} from "@/lib/actions/wellbeing";
import {
  WELLBEING_CHECK_IN_AREAS,
  MOOD_RATING_CONFIG,
} from "@/lib/constants/wellbeing";

interface CheckInFormProps {
  students: Array<
    Pick<Student, "id" | "first_name" | "last_name" | "preferred_name">
  >;
  checkIn?: WellbeingCheckInWithStudent | null;
  canManage: boolean;
  defaultStudentId?: string;
  mode?: "schedule" | "complete";
}

type FormMode = "schedule" | "complete" | "reschedule";

export function CheckInForm({
  students,
  checkIn,
  canManage,
  defaultStudentId,
  mode = "schedule",
}: CheckInFormProps) {
  const router = useRouter();
  const haptics = useHaptics();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [activeMode, setActiveMode] = useState<FormMode>(
    checkIn?.status === "scheduled" ? "complete" : mode,
  );

  // Schedule fields
  const [studentId, setStudentId] = useState(
    checkIn?.student_id || defaultStudentId || "",
  );
  const [scheduledFor, setScheduledFor] = useState(
    checkIn?.scheduled_for
      ? checkIn.scheduled_for.slice(0, 16)
      : (() => {
          const d = new Date();
          d.setHours(d.getHours() + 1, 0, 0, 0);
          return d.toISOString().slice(0, 16);
        })(),
  );

  // Complete fields
  const [moodRating, setMoodRating] = useState<number | null>(
    checkIn?.mood_rating || null,
  );
  const [selectedAreas, setSelectedAreas] = useState<string[]>(
    checkIn?.wellbeing_areas || [],
  );
  const [observations, setObservations] = useState(checkIn?.observations || "");
  const [studentGoals, setStudentGoals] = useState(
    checkIn?.student_goals || "",
  );
  const [actionItems, setActionItems] = useState(checkIn?.action_items || "");
  const [followUpDate, setFollowUpDate] = useState(
    checkIn?.follow_up_date || "",
  );

  function toggleArea(area: string) {
    haptics.selection();
    setSelectedAreas((prev) =>
      prev.includes(area) ? prev.filter((a) => a !== area) : [...prev, area],
    );
  }

  async function handleSchedule(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!studentId) {
      setError("Please select a student");
      haptics.error();
      return;
    }
    if (!scheduledFor) {
      setError("Please set a date and time");
      haptics.error();
      return;
    }

    startTransition(async () => {
      const toISO = (val: string) => (val ? new Date(val).toISOString() : "");
      const result = checkIn
        ? await rescheduleCheckIn(checkIn.id, {
            scheduled_for: toISO(scheduledFor),
          })
        : await scheduleCheckIn({
            student_id: studentId,
            scheduled_for: toISO(scheduledFor),
            linked_flag_id: null,
          });
      if (result.error) {
        setError(result.error.message);
        haptics.error();
        return;
      }
      haptics.success();
      router.push("/admin/wellbeing/check-ins");
      router.refresh();
    });
  }

  async function handleComplete(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!checkIn) return;

    startTransition(async () => {
      const result = await completeCheckIn(checkIn.id, {
        mood_rating: moodRating,
        wellbeing_areas: selectedAreas,
        observations: observations.trim() || null,
        student_goals: studentGoals.trim() || null,
        action_items: actionItems.trim() || null,
        follow_up_date: followUpDate || null,
      });
      if (result.error) {
        setError(result.error.message);
        haptics.error();
        return;
      }
      haptics.success();
      router.push("/admin/wellbeing/check-ins");
      router.refresh();
    });
  }

  async function handleDelete() {
    if (!checkIn) return;
    startTransition(async () => {
      const result = await deleteCheckIn(checkIn.id);
      if (result.error) {
        setError(result.error.message);
        haptics.error();
        return;
      }
      haptics.success();
      router.push("/admin/wellbeing/check-ins");
      router.refresh();
    });
  }

  const isCompleting =
    activeMode === "complete" && !!checkIn && checkIn.status === "scheduled";
  const isCompleted = checkIn?.status === "completed";

  return (
    <div className="space-y-6">
      {error && (
        <div
          className="rounded-lg border p-3 text-sm"
          style={{
            borderColor: "var(--destructive)",
            color: "var(--destructive)",
          }}
        >
          {error}
        </div>
      )}

      {/* Mode toggle for existing scheduled check-ins */}
      {checkIn && checkIn.status === "scheduled" && canManage && (
        <div
          className="flex rounded-lg border border-border overflow-hidden"
          style={{ backgroundColor: "var(--card)" }}
        >
          <button
            type="button"
            onClick={() => {
              setActiveMode("complete");
              haptics.selection();
            }}
            className="flex-1 px-4 py-2 text-sm font-medium transition-colors"
            style={{
              backgroundColor:
                activeMode === "complete" ? "var(--primary)" : "transparent",
              color:
                activeMode === "complete"
                  ? "var(--primary-foreground)"
                  : "var(--muted-foreground)",
            }}
          >
            Complete Check-in
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveMode("reschedule");
              haptics.selection();
            }}
            className="flex-1 px-4 py-2 text-sm font-medium transition-colors"
            style={{
              backgroundColor:
                activeMode === "reschedule" ? "var(--primary)" : "transparent",
              color:
                activeMode === "reschedule"
                  ? "var(--primary-foreground)"
                  : "var(--muted-foreground)",
            }}
          >
            Reschedule
          </button>
        </div>
      )}

      {/* Schedule / Reschedule form */}
      {(!checkIn || activeMode === "reschedule") && (
        <form onSubmit={handleSchedule} className="space-y-6">
          {!checkIn && (
            <div className="space-y-1.5">
              <label
                className="text-sm font-medium"
                style={{ color: "var(--foreground)" }}
              >
                Student *
              </label>
              <select
                disabled={!canManage}
                value={studentId}
                onChange={(e) => {
                  setStudentId(e.target.value);
                  haptics.selection();
                }}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                style={{
                  backgroundColor: "var(--input)",
                  color: "var(--foreground)",
                }}
              >
                <option value="">Select a student...</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.preferred_name || `${s.first_name} ${s.last_name}`}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="space-y-1.5">
            <label
              className="text-sm font-medium"
              style={{ color: "var(--foreground)" }}
            >
              {activeMode === "reschedule"
                ? "New Date & Time *"
                : "Scheduled For *"}
            </label>
            <input
              disabled={!canManage}
              type="datetime-local"
              value={scheduledFor}
              onChange={(e) => setScheduledFor(e.target.value)}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
              style={{
                backgroundColor: "var(--input)",
                color: "var(--foreground)",
              }}
            />
          </div>
          {canManage && (
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={isPending}
                className="active-push touch-target rounded-lg px-4 py-2 text-sm font-medium transition-opacity disabled:opacity-50"
                style={{
                  backgroundColor: "var(--primary)",
                  color: "var(--primary-foreground)",
                }}
              >
                {isPending
                  ? "Saving..."
                  : activeMode === "reschedule"
                    ? "Reschedule"
                    : "Schedule Check-in"}
              </button>
            </div>
          )}
        </form>
      )}

      {/* Complete form */}
      {(isCompleting || isCompleted) && (
        <form onSubmit={handleComplete} className="space-y-6">
          {checkIn && (
            <div
              className="rounded-lg border border-border p-3"
              style={{ backgroundColor: "var(--card)" }}
            >
              <p
                className="text-sm"
                style={{ color: "var(--muted-foreground)" }}
              >
                Check-in with {checkIn.students.first_name}{" "}
                {checkIn.students.last_name}
                {" - "}scheduled for{" "}
                {new Date(checkIn.scheduled_for).toLocaleDateString("en-AU", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <p
              className="text-sm font-medium"
              style={{ color: "var(--foreground)" }}
            >
              Mood Rating
            </p>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((r) => {
                const cfg = MOOD_RATING_CONFIG[r];
                return (
                  <button
                    key={r}
                    type="button"
                    disabled={isCompleted || !canManage}
                    onClick={() => {
                      setMoodRating(moodRating === r ? null : r);
                      haptics.impact("medium");
                    }}
                    className="active-push flex-1 rounded-lg border p-2 text-center transition-all"
                    style={{
                      borderColor:
                        moodRating === r ? cfg.color : "var(--border)",
                      backgroundColor:
                        moodRating === r ? `${cfg.color}20` : "var(--card)",
                    }}
                  >
                    <div className="text-xl">{cfg.emoji}</div>
                    <div
                      className="mt-0.5 text-xs"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      {cfg.label}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <p
              className="text-sm font-medium"
              style={{ color: "var(--foreground)" }}
            >
              Wellbeing Areas Discussed
            </p>
            <div className="flex flex-wrap gap-2">
              {WELLBEING_CHECK_IN_AREAS.map((area) => (
                <button
                  key={area}
                  type="button"
                  disabled={isCompleted || !canManage}
                  onClick={() => toggleArea(area)}
                  className="active-push rounded-full border px-3 py-1.5 text-xs font-medium transition-all"
                  style={{
                    borderColor: selectedAreas.includes(area)
                      ? "var(--primary)"
                      : "var(--border)",
                    backgroundColor: selectedAreas.includes(area)
                      ? "var(--primary)"
                      : "transparent",
                    color: selectedAreas.includes(area)
                      ? "var(--primary-foreground)"
                      : "var(--foreground)",
                  }}
                >
                  {area}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label
              className="text-sm font-medium"
              style={{ color: "var(--foreground)" }}
            >
              Observations
            </label>
            <textarea
              disabled={isCompleted || !canManage}
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              rows={4}
              maxLength={5000}
              placeholder="Staff observations during the check-in..."
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
              style={{
                backgroundColor: "var(--input)",
                color: "var(--foreground)",
              }}
            />
            <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
              {observations.length}/5000
            </p>
          </div>

          <div className="space-y-1.5">
            <label
              className="text-sm font-medium"
              style={{ color: "var(--foreground)" }}
            >
              Student Goals / What student shared
            </label>
            <textarea
              disabled={isCompleted || !canManage}
              value={studentGoals}
              onChange={(e) => setStudentGoals(e.target.value)}
              rows={3}
              maxLength={3000}
              placeholder="Goals or things the student mentioned..."
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
              style={{
                backgroundColor: "var(--input)",
                color: "var(--foreground)",
              }}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label
                className="text-sm font-medium"
                style={{ color: "var(--foreground)" }}
              >
                Action Items
              </label>
              <textarea
                disabled={isCompleted || !canManage}
                value={actionItems}
                onChange={(e) => setActionItems(e.target.value)}
                rows={2}
                maxLength={3000}
                placeholder="Follow-up actions..."
                className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                style={{
                  backgroundColor: "var(--input)",
                  color: "var(--foreground)",
                }}
              />
            </div>
            <div className="space-y-1.5">
              <label
                className="text-sm font-medium"
                style={{ color: "var(--foreground)" }}
              >
                Follow-up Date
              </label>
              <input
                disabled={isCompleted || !canManage}
                type="date"
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                style={{
                  backgroundColor: "var(--input)",
                  color: "var(--foreground)",
                }}
              />
            </div>
          </div>

          {canManage && !isCompleted && (
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={isPending}
                className="active-push touch-target rounded-lg px-4 py-2 text-sm font-medium transition-opacity disabled:opacity-50"
                style={{
                  backgroundColor: "var(--primary)",
                  color: "var(--primary-foreground)",
                }}
              >
                {isPending ? "Saving..." : "Complete Check-in"}
              </button>
            </div>
          )}
        </form>
      )}

      {/* Delete button for non-completed check-ins */}
      {checkIn && canManage && checkIn.status !== "completed" && (
        <div className="flex items-center gap-3">
          {showDeleteConfirm ? (
            <>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isPending}
                className="active-push touch-target rounded-lg px-3 py-2 text-sm font-medium transition-opacity disabled:opacity-50"
                style={{
                  backgroundColor: "var(--destructive)",
                  color: "var(--destructive-foreground)",
                }}
              >
                Confirm Delete
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isPending}
                className="rounded-lg px-3 py-2 text-sm"
                style={{ color: "var(--muted-foreground)" }}
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => {
                setShowDeleteConfirm(true);
                haptics.warning();
              }}
              style={{ color: "var(--destructive)" }}
              className="text-sm font-medium"
            >
              Cancel Check-in
            </button>
          )}
        </div>
      )}
    </div>
  );
}
