// src/components/domain/comms/AnnouncementComposer.tsx
//
// WHY client component: The composer has multiple interactive
// controls (scope switching, scheduling toggle, rich text) that
// require client-side state management.

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createAnnouncement,
  updateAnnouncement,
  type AnnouncementPriority,
  type AnnouncementScope,
  type Announcement,
} from "@/lib/actions/comms/announcements";

interface AnnouncementComposerProps {
  tenantSlug: string;
  classes: Array<{ id: string; name: string }>;
  /** If provided, we're editing an existing announcement */
  existing?: Announcement;
}

export function AnnouncementComposer({
  tenantSlug,
  classes,
  existing,
}: AnnouncementComposerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // ── Form state ─────────────────────────────────────
  const [title, setTitle] = useState(existing?.title ?? "");
  const [body, setBody] = useState(existing?.body ?? "");
  const [priority, setPriority] = useState<AnnouncementPriority>(
    existing?.priority ?? "normal"
  );
  const [scope, setScope] = useState<AnnouncementScope>(
    existing?.scope ?? "school"
  );
  const [targetClassId, setTargetClassId] = useState<string>(
    existing?.target_class_id ?? ""
  );
  const [requiresAck, setRequiresAck] = useState(
    existing?.requires_acknowledgement ?? false
  );
  const [pinToTop, setPinToTop] = useState(existing?.pin_to_top ?? false);
  const [showScheduling, setShowScheduling] = useState(
    !!existing?.scheduled_for
  );
  const [scheduledFor, setScheduledFor] = useState(
    existing?.scheduled_for
      ? new Date(existing.scheduled_for).toISOString().slice(0, 16)
      : ""
  );
  const [expiresAt, setExpiresAt] = useState(
    existing?.expires_at
      ? new Date(existing.expires_at).toISOString().slice(0, 16)
      : ""
  );
  const [error, setError] = useState<string | null>(null);

  // ── Priority options ───────────────────────────────
  const priorities: {
    value: AnnouncementPriority;
    label: string;
    color: string;
  }[] = [
    { value: "low", label: "Low", color: "bg-blue-100 text-blue-700" },
    { value: "normal", label: "Normal", color: "bg-gray-100 text-gray-700" },
    { value: "high", label: "High", color: "bg-orange-100 text-orange-700" },
    { value: "urgent", label: "Urgent", color: "bg-red-100 text-red-700" },
  ];

  // ── Submit handler ─────────────────────────────────
  async function handleSubmit(publishNow: boolean) {
    setError(null);

    if (!title.trim()) {
      setError("Title is required");
      return;
    }
    if (!body.trim()) {
      setError("Announcement body is required");
      return;
    }
    if (scope === "class" && !targetClassId) {
      setError("Please select a target class");
      return;
    }

    startTransition(async () => {
      if (existing) {
        const result = await updateAnnouncement(existing.id, {
          title: title.trim(),
          body: body.trim(),
          priority,
          scope,
          target_class_id: scope === "class" ? targetClassId : null,
          scheduled_for: showScheduling && scheduledFor ? scheduledFor : null,
          expires_at: expiresAt || null,
          requires_acknowledgement: requiresAck,
          pin_to_top: pinToTop,
        });

        if (result.error) {
          setError(result.error);
          return;
        }

        router.push(
          `/${tenantSlug}/comms/announcements/${existing.id}`
        );
      } else {
        const result = await createAnnouncement({
          title: title.trim(),
          body: body.trim(),
          priority,
          scope,
          target_class_id: scope === "class" ? targetClassId : undefined,
          scheduled_for:
            showScheduling && scheduledFor ? scheduledFor : undefined,
          expires_at: expiresAt || undefined,
          requires_acknowledgement: requiresAck,
          pin_to_top: pinToTop,
          publish_now: publishNow && !showScheduling,
        });

        if (result.error) {
          setError(result.error);
          return;
        }

        router.push(`/${tenantSlug}/comms/announcements`);
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* ── Title ─────────────────────────────────────── */}
      <div>
        <label
          htmlFor="title"
          className="block text-sm font-medium text-gray-700"
        >
          Title
        </label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Term 2 Start Date Update"
          className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
        />
      </div>

      {/* ── Body ──────────────────────────────────────── */}
      <div>
        <label
          htmlFor="body"
          className="block text-sm font-medium text-gray-700"
        >
          Content
        </label>
        <textarea
          id="body"
          rows={8}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write your announcement here. Markdown is supported."
          className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
        />
        <p className="mt-1 text-xs text-gray-400">Markdown supported</p>
      </div>

      {/* ── Priority ──────────────────────────────────── */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Priority
        </label>
        <div className="mt-2 flex gap-2">
          {priorities.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => setPriority(p.value)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                priority === p.value
                  ? `${p.color} ring-2 ring-offset-1 ring-current`
                  : "bg-gray-50 text-gray-500 hover:bg-gray-100"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Scope / Targeting ─────────────────────────── */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Audience
          </label>
          <div className="mt-2 flex gap-2">
            {(["school", "class", "program"] as AnnouncementScope[]).map(
              (s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setScope(s)}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    scope === s
                      ? "bg-amber-600 text-white"
                      : "bg-white text-gray-600 border border-gray-300 hover:bg-gray-100"
                  }`}
                >
                  {s === "school"
                    ? "Whole School"
                    : s === "class"
                      ? "Specific Class"
                      : "Program"}
                </button>
              )
            )}
          </div>
        </div>

        {scope === "class" && (
          <div>
            <label
              htmlFor="targetClass"
              className="block text-sm font-medium text-gray-700"
            >
              Target Class
            </label>
            <select
              id="targetClass"
              value={targetClassId}
              onChange={(e) => setTargetClassId(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option value="">Select a class...</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* ── Options ───────────────────────────────────── */}
      <div className="space-y-3">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={requiresAck}
            onChange={(e) => setRequiresAck(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
          />
          <div>
            <span className="text-sm font-medium text-gray-700">
              Require acknowledgement
            </span>
            <p className="text-xs text-gray-500">
              Parents must confirm they&apos;ve read this announcement
            </p>
          </div>
        </label>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={pinToTop}
            onChange={(e) => setPinToTop(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
          />
          <div>
            <span className="text-sm font-medium text-gray-700">
              Pin to top
            </span>
            <p className="text-xs text-gray-500">
              Keep this announcement at the top of the feed
            </p>
          </div>
        </label>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={showScheduling}
            onChange={(e) => setShowScheduling(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
          />
          <div>
            <span className="text-sm font-medium text-gray-700">
              Schedule for later
            </span>
            <p className="text-xs text-gray-500">
              Publish at a specific date and time
            </p>
          </div>
        </label>
      </div>

      {/* ── Scheduling ────────────────────────────────── */}
      {showScheduling && (
        <div className="grid grid-cols-2 gap-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
          <div>
            <label
              htmlFor="scheduledFor"
              className="block text-sm font-medium text-gray-700"
            >
              Publish Date &amp; Time
            </label>
            <input
              id="scheduledFor"
              type="datetime-local"
              value={scheduledFor}
              onChange={(e) => setScheduledFor(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
          <div>
            <label
              htmlFor="expiresAt"
              className="block text-sm font-medium text-gray-700"
            >
              Expires At (optional)
            </label>
            <input
              id="expiresAt"
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
        </div>
      )}

      {/* ── Actions ───────────────────────────────────── */}
      <div className="flex items-center justify-end gap-3 border-t border-gray-200 pt-6">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => handleSubmit(false)}
          disabled={isPending}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          {isPending ? "Saving..." : "Save as Draft"}
        </button>
        {!showScheduling && (
          <button
            type="button"
            onClick={() => handleSubmit(true)}
            disabled={isPending}
            className="rounded-lg bg-amber-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-amber-700 disabled:opacity-50"
          >
            {isPending ? "Publishing..." : "Publish Now"}
          </button>
        )}
        {showScheduling && (
          <button
            type="button"
            onClick={() => handleSubmit(false)}
            disabled={isPending || !scheduledFor}
            className="rounded-lg bg-amber-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-amber-700 disabled:opacity-50"
          >
            {isPending ? "Scheduling..." : "Schedule"}
          </button>
        )}
      </div>
    </div>
  );
}
