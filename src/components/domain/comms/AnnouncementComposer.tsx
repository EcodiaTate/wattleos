// src/components/domain/comms/AnnouncementComposer.tsx
//
// WHY client component: The composer has multiple interactive
// controls (scope switching, scheduling toggle, rich text) that
// require client-side state management.

"use client";

import {
  createAnnouncement,
  updateAnnouncement,
  type Announcement,
  type AnnouncementPriority,
  type AnnouncementScope,
} from "@/lib/actions/comms/announcements";
import { GlowTarget } from "@/components/domain/glow/glow-registry";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

interface AnnouncementComposerProps {
  classes: Array<{ id: string; name: string }>;
  /** If provided, we're editing an existing announcement */
  existing?: Announcement;
}

export function AnnouncementComposer({
  classes,
  existing,
}: AnnouncementComposerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // ── Form state ─────────────────────────────────────
  const [title, setTitle] = useState(existing?.title ?? "");
  const [body, setBody] = useState(existing?.body ?? "");
  const [priority, setPriority] = useState<AnnouncementPriority>(
    existing?.priority ?? "normal",
  );
  const [scope, setScope] = useState<AnnouncementScope>(
    existing?.scope ?? "school",
  );
  const [targetClassId, setTargetClassId] = useState<string>(
    existing?.target_class_id ?? "",
  );
  const [requiresAck, setRequiresAck] = useState(
    existing?.requires_acknowledgement ?? false,
  );
  const [pinToTop, setPinToTop] = useState(existing?.pin_to_top ?? false);
  const [showScheduling, setShowScheduling] = useState(
    !!existing?.scheduled_for,
  );
  const [scheduledFor, setScheduledFor] = useState(
    existing?.scheduled_for
      ? new Date(existing.scheduled_for).toISOString().slice(0, 16)
      : "",
  );
  const [expiresAt, setExpiresAt] = useState(
    existing?.expires_at
      ? new Date(existing.expires_at).toISOString().slice(0, 16)
      : "",
  );
  const [error, setError] = useState<string | null>(null);

  // Normalise ActionResponse error shapes into a string for UI
  function errorMessage(err: unknown): string {
    if (!err) return "Something went wrong";
    if (typeof err === "string") return err;
    if (typeof err === "object" && "message" in err) {
      const msg = (err as { message?: unknown }).message;
      if (typeof msg === "string" && msg.trim()) return msg;
    }
    return "Something went wrong";
  }

  // ── Priority options ───────────────────────────────
  const priorities: {
    value: AnnouncementPriority;
    label: string;
    color: string;
  }[] = [
    { value: "low", label: "Low", color: "bg-info/15 text-info" },
    { value: "normal", label: "Normal", color: "bg-muted text-foreground" },
    { value: "high", label: "High", color: "bg-primary/15 text-primary" },
    { value: "urgent", label: "Urgent", color: "bg-destructive/15 text-destructive" },
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
          setError(errorMessage(result.error));
          return;
        }

        router.push(`/comms/announcements/${existing.id}`);
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
          setError(errorMessage(result.error));
          return;
        }

        router.push(`/comms/announcements`);
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* ── Title ─────────────────────────────────────── */}
      <div>
        <label
          htmlFor="title"
          className="block text-sm font-medium text-foreground"
        >
          Title
        </label>
        <GlowTarget id="comms-input-ann-title" category="input" label="Announcement title">
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Term 2 Start Date Update"
            className="mt-1 block w-full rounded-lg border border-border px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </GlowTarget>
      </div>

      {/* ── Body ──────────────────────────────────────── */}
      <div>
        <label
          htmlFor="body"
          className="block text-sm font-medium text-foreground"
        >
          Content
        </label>
        <GlowTarget id="comms-input-ann-body" category="input" label="Announcement body">
          <textarea
            id="body"
            rows={8}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write your announcement here. Markdown is supported."
            className="mt-1 block w-full rounded-lg border border-border px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </GlowTarget>
        <p className="mt-1 text-xs text-muted-foreground">Markdown supported</p>
      </div>

      {/* ── Priority ──────────────────────────────────── */}
      <div>
        <label className="block text-sm font-medium text-foreground">
          Priority
        </label>
        <GlowTarget id="comms-select-ann-priority" category="select" label="Priority">
          <div className="mt-2 flex gap-2">
            {priorities.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setPriority(p.value)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                  priority === p.value
                    ? `${p.color} ring-2 ring-offset-1 ring-current`
                    : "bg-muted text-muted-foreground hover:bg-muted"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </GlowTarget>
      </div>

      {/* ── Scope / Targeting ─────────────────────────── */}
      <div className="rounded-lg border border-border bg-muted p-4 space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground">
            Audience
          </label>
          <GlowTarget id="comms-select-ann-scope" category="select" label="Audience scope">
            <div className="mt-2 flex gap-2">
              {(["school", "class", "program"] as AnnouncementScope[]).map(
                (s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setScope(s)}
                    className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                      scope === s
                        ? "bg-primary text-background"
                        : "bg-card text-muted-foreground border border-border hover:bg-muted"
                    }`}
                  >
                    {s === "school"
                      ? "Whole School"
                      : s === "class"
                        ? "Specific Class"
                        : "Program"}
                  </button>
                ),
              )}
            </div>
          </GlowTarget>
        </div>

        {scope === "class" && (
          <div>
            <label
              htmlFor="targetClass"
              className="block text-sm font-medium text-foreground"
            >
              Target Class
            </label>
            <select
              id="targetClass"
              value={targetClassId}
              onChange={(e) => setTargetClassId(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-border bg-card px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
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
        <GlowTarget id="comms-toggle-ann-ack" category="toggle" label="Require acknowledgement">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={requiresAck}
              onChange={(e) => setRequiresAck(e.target.checked)}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
            />
            <div>
              <span className="text-sm font-medium text-foreground">
                Require acknowledgement
              </span>
              <p className="text-xs text-muted-foreground">
                Parents must confirm they&apos;ve read this announcement
              </p>
            </div>
          </label>
        </GlowTarget>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={pinToTop}
            onChange={(e) => setPinToTop(e.target.checked)}
            className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
          />
          <div>
            <span className="text-sm font-medium text-foreground">
              Pin to top
            </span>
            <p className="text-xs text-muted-foreground">
              Keep this announcement at the top of the feed
            </p>
          </div>
        </label>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={showScheduling}
            onChange={(e) => setShowScheduling(e.target.checked)}
            className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
          />
          <div>
            <span className="text-sm font-medium text-foreground">
              Schedule for later
            </span>
            <p className="text-xs text-muted-foreground">
              Publish at a specific date and time
            </p>
          </div>
        </label>
      </div>

      {/* ── Scheduling ────────────────────────────────── */}
      {showScheduling && (
        <div className="grid grid-cols-2 gap-4 rounded-lg border border-border bg-muted p-4">
          <div>
            <label
              htmlFor="scheduledFor"
              className="block text-sm font-medium text-foreground"
            >
              Publish Date &amp; Time
            </label>
            <input
              id="scheduledFor"
              type="datetime-local"
              value={scheduledFor}
              onChange={(e) => setScheduledFor(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-border px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label
              htmlFor="expiresAt"
              className="block text-sm font-medium text-foreground"
            >
              Expires At (optional)
            </label>
            <input
              id="expiresAt"
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-border px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>
      )}

      {/* ── Actions ───────────────────────────────────── */}
      <div className="flex items-center justify-end gap-3 border-t border-border pt-6">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted"
        >
          Cancel
        </button>
        <GlowTarget id="comms-btn-ann-save-draft" category="button" label="Save draft">
          <button
            type="button"
            onClick={() => handleSubmit(false)}
            disabled={isPending}
            className="rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50"
          >
            {isPending ? "Saving..." : "Save as Draft"}
          </button>
        </GlowTarget>
        {!showScheduling && (
          <GlowTarget id="comms-btn-ann-publish" category="button" label="Publish announcement">
            <button
              type="button"
              onClick={() => handleSubmit(true)}
              disabled={isPending}
              className="rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-background shadow-sm hover:bg-primary disabled:opacity-50"
            >
              {isPending ? "Publishing..." : "Publish Now"}
            </button>
          </GlowTarget>
        )}
        {showScheduling && (
          <button
            type="button"
            onClick={() => handleSubmit(false)}
            disabled={isPending || !scheduledFor}
            className="rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-background shadow-sm hover:bg-primary disabled:opacity-50"
          >
            {isPending ? "Scheduling..." : "Schedule"}
          </button>
        )}
      </div>
    </div>
  );
}
