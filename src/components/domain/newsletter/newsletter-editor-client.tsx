"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import type { NewsletterWithDetails } from "@/types/domain";
import {
  cancelNewsletter,
  sendNewsletter,
  scheduleNewsletter,
  updateNewsletter,
} from "@/lib/actions/comms/newsletter";
import { useHaptics } from "@/lib/hooks/use-haptics";
import { sanitizeHtml } from "@/lib/utils/sanitize-html";
import { NewsletterStatusPill } from "./newsletter-status-pill";

interface NewsletterEditorClientProps {
  newsletter: NewsletterWithDetails;
  canSend: boolean;
  classes: Array<{ id: string; name: string }>;
}

type AudienceOption =
  | "all_parents"
  | "all_staff"
  | "all_users"
  | "class"
  | "program";

const AUDIENCE_OPTIONS: Array<{ value: AudienceOption; label: string }> = [
  { value: "all_parents", label: "All Parents" },
  { value: "all_staff", label: "All Staff" },
  { value: "all_users", label: "Everyone" },
  { value: "class", label: "Specific Class" },
];

export function NewsletterEditorClient({
  newsletter,
  canSend,
  classes,
}: NewsletterEditorClientProps) {
  const router = useRouter();
  const haptics = useHaptics();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [title, setTitle] = useState(newsletter.title);
  const [subjectLine, setSubjectLine] = useState(newsletter.subject_line);
  const [preheader, setPreheader] = useState(newsletter.preheader ?? "");
  const [bodyHtml, setBodyHtml] = useState(newsletter.body_html);
  const [audience, setAudience] = useState<AudienceOption>(newsletter.audience);
  const [targetClassId, setTargetClassId] = useState(
    newsletter.target_class_id ?? "",
  );
  const [scheduleDate, setScheduleDate] = useState(
    newsletter.scheduled_for ?? "",
  );

  const isEditable =
    newsletter.status === "draft" || newsletter.status === "scheduled";

  const handleSave = useCallback(() => {
    haptics.impact("light");
    startTransition(async () => {
      setError(null);
      setSuccessMsg(null);
      const result = await updateNewsletter({
        newsletter_id: newsletter.id,
        title: title.trim(),
        subject_line: subjectLine.trim(),
        preheader: preheader.trim() || null,
        body_html: bodyHtml,
        audience,
        target_class_id: audience === "class" ? targetClassId || null : null,
      });

      if (result.error) {
        setError(result.error.message);
        return;
      }
      setSuccessMsg("Saved");
      setTimeout(() => setSuccessMsg(null), 2000);
    });
  }, [
    haptics,
    newsletter.id,
    title,
    subjectLine,
    preheader,
    bodyHtml,
    audience,
    targetClassId,
  ]);

  const handleSend = useCallback(() => {
    haptics.impact("heavy");
    startTransition(async () => {
      setError(null);
      const result = await sendNewsletter(newsletter.id);
      if (result.error) {
        setError(result.error.message);
        return;
      }
      router.push(`/comms/newsletters/${newsletter.id}`);
      router.refresh();
    });
  }, [haptics, newsletter.id, router]);

  const handleSchedule = useCallback(() => {
    if (!scheduleDate) {
      setError("Please select a date and time");
      return;
    }
    haptics.impact("medium");
    startTransition(async () => {
      setError(null);
      const result = await scheduleNewsletter(newsletter.id, scheduleDate);
      if (result.error) {
        setError(result.error.message);
        return;
      }
      router.refresh();
      setSuccessMsg("Scheduled");
      setTimeout(() => setSuccessMsg(null), 2000);
    });
  }, [haptics, newsletter.id, scheduleDate, router]);

  const handleCancel = useCallback(() => {
    haptics.impact("medium");
    startTransition(async () => {
      setError(null);
      const result = await cancelNewsletter(newsletter.id);
      if (result.error) {
        setError(result.error.message);
        return;
      }
      router.push("/comms/newsletters");
      router.refresh();
    });
  }, [haptics, newsletter.id, router]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1
            className="text-xl font-bold"
            style={{ color: "var(--foreground)" }}
          >
            {isEditable ? "Edit Newsletter" : newsletter.title}
          </h1>
          <NewsletterStatusPill status={newsletter.status} size="md" />
        </div>
        <div className="flex items-center gap-2">
          {successMsg && (
            <span
              className="text-xs font-medium"
              style={{ color: "var(--newsletter-sent)" }}
            >
              {successMsg}
            </span>
          )}
          {isEditable && (
            <>
              <button
                onClick={handleSave}
                disabled={isPending}
                className="active-push touch-target rounded-lg border border-border px-3 py-2 text-sm font-medium"
                style={{ color: "var(--foreground)" }}
              >
                Save Draft
              </button>
              {canSend && (
                <button
                  onClick={handleSend}
                  disabled={isPending}
                  className="active-push touch-target rounded-lg px-3 py-2 text-sm font-medium"
                  style={{
                    backgroundColor: "var(--newsletter-sent)",
                    color: "var(--newsletter-sent-fg)",
                  }}
                >
                  Send Now
                </button>
              )}
              <button
                onClick={handleCancel}
                disabled={isPending}
                className="active-push touch-target rounded-lg px-3 py-2 text-sm font-medium"
                style={{ color: "var(--destructive)" }}
              >
                Cancel
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div
          className="rounded-lg border px-4 py-3 text-sm"
          style={{
            borderColor: "var(--destructive)",
            color: "var(--destructive)",
          }}
        >
          {error}
        </div>
      )}

      {/* Form */}
      {isEditable ? (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main content - 2 cols */}
          <div className="space-y-4 lg:col-span-2">
            <Field label="Title">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                style={{
                  backgroundColor: "var(--input)",
                  color: "var(--foreground)",
                }}
                placeholder="Newsletter title (internal)"
              />
            </Field>

            <Field label="Subject Line">
              <input
                type="text"
                value={subjectLine}
                onChange={(e) => setSubjectLine(e.target.value)}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                style={{
                  backgroundColor: "var(--input)",
                  color: "var(--foreground)",
                }}
                placeholder="Email subject line"
              />
            </Field>

            <Field label="Preheader (optional)">
              <input
                type="text"
                value={preheader}
                onChange={(e) => setPreheader(e.target.value)}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                style={{
                  backgroundColor: "var(--input)",
                  color: "var(--foreground)",
                }}
                placeholder="Preview text in email clients"
                maxLength={200}
              />
            </Field>

            <Field label="Body (HTML)">
              <textarea
                value={bodyHtml}
                onChange={(e) => setBodyHtml(e.target.value)}
                rows={16}
                className="w-full rounded-lg border border-border px-3 py-2 font-mono text-sm"
                style={{
                  backgroundColor: "var(--input)",
                  color: "var(--foreground)",
                }}
                placeholder="<h2>Welcome to our newsletter!</h2><p>...</p>"
              />
            </Field>
          </div>

          {/* Sidebar - settings */}
          <div className="space-y-4">
            <div
              className="rounded-lg border border-border p-4 space-y-4"
              style={{ backgroundColor: "var(--card)" }}
            >
              <h3
                className="text-sm font-semibold"
                style={{ color: "var(--foreground)" }}
              >
                Settings
              </h3>

              <Field label="Audience">
                <select
                  value={audience}
                  onChange={(e) =>
                    setAudience(e.target.value as AudienceOption)
                  }
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                  style={{
                    backgroundColor: "var(--input)",
                    color: "var(--foreground)",
                  }}
                >
                  {AUDIENCE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </Field>

              {audience === "class" && (
                <Field label="Target Class">
                  <select
                    value={targetClassId}
                    onChange={(e) => setTargetClassId(e.target.value)}
                    className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                    style={{
                      backgroundColor: "var(--input)",
                      color: "var(--foreground)",
                    }}
                  >
                    <option value="">Select a class...</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </Field>
              )}

              {canSend && (
                <div className="space-y-2">
                  <Field label="Schedule (optional)">
                    <input
                      type="datetime-local"
                      value={scheduleDate ? scheduleDate.slice(0, 16) : ""}
                      onChange={(e) =>
                        setScheduleDate(
                          e.target.value
                            ? new Date(e.target.value).toISOString()
                            : "",
                        )
                      }
                      className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                      style={{
                        backgroundColor: "var(--input)",
                        color: "var(--foreground)",
                      }}
                    />
                  </Field>
                  {scheduleDate && (
                    <button
                      onClick={handleSchedule}
                      disabled={isPending}
                      className="active-push touch-target w-full rounded-lg px-3 py-2 text-sm font-medium"
                      style={{
                        backgroundColor: "var(--newsletter-scheduled)",
                        color: "var(--newsletter-scheduled-fg)",
                      }}
                    >
                      Schedule Send
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Read-only view for sent/cancelled */
        <div className="space-y-4">
          <div
            className="rounded-lg border border-border p-6"
            style={{ backgroundColor: "var(--card)" }}
          >
            <div
              className="prose max-w-none text-sm"
              style={{ color: "var(--foreground)" }}
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(newsletter.body_html) }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1">
      <span
        className="text-xs font-medium"
        style={{ color: "var(--muted-foreground)" }}
      >
        {label}
      </span>
      {children}
    </label>
  );
}
