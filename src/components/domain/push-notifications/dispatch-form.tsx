"use client";

// src/components/domain/push-notifications/dispatch-form.tsx
//
// Form for creating or editing a push notification dispatch.
// Handles topic, targeting, title, body, and optional scheduling.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createDispatch,
  updateDispatch,
} from "@/lib/actions/push-notifications";
import { useHaptics } from "@/lib/hooks/use-haptics";
import type {
  NotificationDispatch,
  NotificationTopic,
  NotificationTargetType,
} from "@/types/domain";

const TOPICS: { value: NotificationTopic; label: string; emoji: string }[] = [
  { value: "announcements", label: "Announcements", emoji: "📢" },
  { value: "messages", label: "Messages", emoji: "💬" },
  { value: "attendance", label: "Attendance", emoji: "✅" },
  { value: "events", label: "Events", emoji: "📅" },
  { value: "incidents", label: "Incidents", emoji: "🚨" },
  { value: "bookings", label: "Bookings", emoji: "🎒" },
  { value: "reports", label: "Reports", emoji: "📊" },
  { value: "billing", label: "Billing", emoji: "🧾" },
  { value: "rostering", label: "Rostering", emoji: "📅" },
  { value: "observations", label: "Observations", emoji: "👁" },
  { value: "emergency", label: "Emergency", emoji: "🆘" },
  { value: "general", label: "General", emoji: "🔔" },
];

const TARGET_TYPES: {
  value: NotificationTargetType;
  label: string;
  description: string;
}[] = [
  {
    value: "all_parents",
    label: "All Parents",
    description: "Sends to all parent/guardian accounts",
  },
  {
    value: "all_staff",
    label: "All Staff",
    description: "Sends to all staff (non-parent) accounts",
  },
  {
    value: "all_users",
    label: "Everyone",
    description: "Sends to all users in your service",
  },
  {
    value: "specific_class",
    label: "Specific Class",
    description: "Sends to guardians of enrolled students",
  },
  {
    value: "specific_program",
    label: "Specific Program",
    description: "Sends to bookings in an OSHC/care program",
  },
  {
    value: "specific_users",
    label: "Specific Users",
    description: "Manually specify user IDs",
  },
];

interface Props {
  existing?: NotificationDispatch;
}

export function DispatchForm({ existing }: Props) {
  const router = useRouter();
  const haptics = useHaptics();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [topic, setTopic] = useState<NotificationTopic>(
    existing?.topic ?? "general",
  );
  const [title, setTitle] = useState(existing?.title ?? "");
  const [body, setBody] = useState(existing?.body ?? "");
  const [targetType, setTargetType] = useState<NotificationTargetType>(
    existing?.target_type ?? "all_parents",
  );
  const [targetClassId, setTargetClassId] = useState(
    existing?.target_class_id ?? "",
  );
  const [targetProgramId, setTargetProgramId] = useState(
    existing?.target_program_id ?? "",
  );
  const [scheduledFor, setScheduledFor] = useState(
    existing?.scheduled_for
      ? new Date(existing.scheduled_for).toISOString().slice(0, 16)
      : "",
  );

  const bodyRemaining = 500 - body.length;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    haptics.impact("medium");

    startTransition(async () => {
      const payload = {
        topic,
        title,
        body,
        data: {},
        target_type: targetType,
        target_class_id:
          targetType === "specific_class" ? targetClassId || null : null,
        target_program_id:
          targetType === "specific_program" ? targetProgramId || null : null,
        target_user_ids: null,
        scheduled_for: scheduledFor
          ? new Date(scheduledFor).toISOString()
          : null,
      };

      let result;
      if (existing) {
        result = await updateDispatch({ dispatch_id: existing.id, ...payload });
      } else {
        result = await createDispatch(payload);
      }

      if (result.error) {
        setError(result.error.message);
        haptics.error();
      } else {
        haptics.success();
        router.push("/admin/notifications");
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div
          className="rounded-lg border px-4 py-3 text-sm"
          style={{
            background: "var(--push-failed-bg)",
            color: "var(--push-failed-fg)",
            borderColor: "var(--push-failed)",
          }}
        >
          {error}
        </div>
      )}

      {/* Topic */}
      <div>
        <label
          className="block text-sm font-medium mb-1.5"
          style={{ color: "var(--foreground)" }}
        >
          Topic
        </label>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {TOPICS.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => {
                setTopic(t.value);
                haptics.selection();
              }}
              className="touch-target flex flex-col items-center gap-1 rounded-lg border p-2.5 text-xs transition-all active-push"
              style={{
                borderColor:
                  topic === t.value ? "var(--primary)" : "var(--border)",
                background:
                  topic === t.value ? "var(--primary)" : "var(--card)",
                color:
                  topic === t.value
                    ? "var(--primary-foreground)"
                    : "var(--foreground)",
              }}
            >
              <span className="text-lg">{t.emoji}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Title */}
      <div>
        <label
          className="block text-sm font-medium mb-1.5"
          style={{ color: "var(--foreground)" }}
        >
          Title{" "}
          <span className="text-muted-foreground font-normal">
            (max 100 chars)
          </span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={100}
          required
          placeholder="e.g. Upcoming closure day - please read"
          className="w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2"
          style={{
            borderColor: "var(--border)",
            background: "var(--input)",
            color: "var(--foreground)",
          }}
        />
      </div>

      {/* Body */}
      <div>
        <label
          className="block text-sm font-medium mb-1.5"
          style={{ color: "var(--foreground)" }}
        >
          Message body
        </label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={500}
          required
          rows={4}
          placeholder="Write your notification message here…"
          className="w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 resize-none"
          style={{
            borderColor: "var(--border)",
            background: "var(--input)",
            color: "var(--foreground)",
          }}
        />
        <p
          className="mt-1 text-xs"
          style={{
            color:
              bodyRemaining < 50
                ? "var(--push-failed)"
                : "var(--muted-foreground)",
          }}
        >
          {bodyRemaining} characters remaining
        </p>
      </div>

      {/* Target */}
      <div>
        <label
          className="block text-sm font-medium mb-1.5"
          style={{ color: "var(--foreground)" }}
        >
          Send to
        </label>
        <div className="space-y-2">
          {TARGET_TYPES.map((t) => (
            <label
              key={t.value}
              className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer card-interactive"
              style={{
                borderColor:
                  targetType === t.value ? "var(--primary)" : "var(--border)",
                background:
                  targetType === t.value
                    ? "color-mix(in oklch, var(--primary) 8%, var(--card))"
                    : "var(--card)",
              }}
            >
              <input
                type="radio"
                name="target_type"
                value={t.value}
                checked={targetType === t.value}
                onChange={() => {
                  setTargetType(t.value);
                  haptics.selection();
                }}
                className="mt-0.5"
              />
              <div>
                <div
                  className="text-sm font-medium"
                  style={{ color: "var(--foreground)" }}
                >
                  {t.label}
                </div>
                <div
                  className="text-xs"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  {t.description}
                </div>
              </div>
            </label>
          ))}
        </div>

        {/* Specific class */}
        {targetType === "specific_class" && (
          <div className="mt-3">
            <input
              type="text"
              value={targetClassId}
              onChange={(e) => setTargetClassId(e.target.value)}
              placeholder="Class ID (UUID)"
              className="w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none"
              style={{
                borderColor: "var(--border)",
                background: "var(--input)",
                color: "var(--foreground)",
              }}
            />
            <p
              className="mt-1 text-xs"
              style={{ color: "var(--muted-foreground)" }}
            >
              Paste the class UUID from your class settings page.
            </p>
          </div>
        )}

        {/* Specific program */}
        {targetType === "specific_program" && (
          <div className="mt-3">
            <input
              type="text"
              value={targetProgramId}
              onChange={(e) => setTargetProgramId(e.target.value)}
              placeholder="Program ID (UUID)"
              className="w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none"
              style={{
                borderColor: "var(--border)",
                background: "var(--input)",
                color: "var(--foreground)",
              }}
            />
          </div>
        )}
      </div>

      {/* Schedule */}
      <div>
        <label
          className="block text-sm font-medium mb-1.5"
          style={{ color: "var(--foreground)" }}
        >
          Schedule for (optional)
        </label>
        <input
          type="datetime-local"
          value={scheduledFor}
          onChange={(e) => setScheduledFor(e.target.value)}
          min={new Date().toISOString().slice(0, 16)}
          className="rounded-lg border px-3 py-2.5 text-sm focus:outline-none"
          style={{
            borderColor: "var(--border)",
            background: "var(--input)",
            color: "var(--foreground)",
          }}
        />
        <p
          className="mt-1 text-xs"
          style={{ color: "var(--muted-foreground)" }}
        >
          Leave blank to save as draft and send manually.
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-3 justify-end pt-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="touch-target rounded-lg border px-4 py-2.5 text-sm font-medium active-push"
          style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="touch-target rounded-lg px-5 py-2.5 text-sm font-semibold active-push disabled:opacity-50"
          style={{
            background: "var(--primary)",
            color: "var(--primary-foreground)",
          }}
        >
          {isPending
            ? "Saving…"
            : existing
              ? "Save Changes"
              : "Create Dispatch"}
        </button>
      </div>
    </form>
  );
}
