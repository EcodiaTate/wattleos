// src/components/domain/comms/message-inbox-client.tsx
//
// ============================================================
// WattleOS V2 - Message Inbox (Client Component)
// ============================================================
// Shows message threads with preview, unread indicators,
// and compose form for new class broadcasts.
//
// WHY client: Compose form state + optimistic refresh after
// sending require client-side interactivity.
// ============================================================

"use client";

import { createClassBroadcast, getInbox } from "@/lib/actions/comms/messaging";
import { THREAD_TYPE_CONFIG } from "@/lib/constants/communications";
import type {
  ClassWithCounts,
  MessageThreadType,
  MessageThreadWithPreview,
} from "@/types/domain";
import Link from "next/link";
import { useState } from "react";

interface MessageInboxClientProps {
  initialThreads: MessageThreadWithPreview[];
  classes: ClassWithCounts[];
  currentUserId: string;
}

export function MessageInboxClient({
  initialThreads,
  classes,
  currentUserId,
}: MessageInboxClientProps) {
  const [threads, setThreads] = useState(initialThreads);
  const [showCompose, setShowCompose] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Compose form state
  const [composeClassId, setComposeClassId] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeMessage, setComposeMessage] = useState("");

  async function handleSendBroadcast() {
    if (!composeClassId || !composeSubject.trim() || !composeMessage.trim())
      return;

    setError(null);
    setIsSubmitting(true);

    const result = await createClassBroadcast({
      class_id: composeClassId,
      subject: composeSubject,
      initial_message: composeMessage,
    });

    setIsSubmitting(false);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    // Refresh inbox
    const refreshed = await getInbox({ limit: 30 });
    if (refreshed.data) setThreads(refreshed.data);

    // Reset form
    setComposeClassId("");
    setComposeSubject("");
    setComposeMessage("");
    setShowCompose(false);
  }

  return (
    <div className="space-y-4">
      {/* Compose button / form */}
      {!showCompose ? (
        <button
          onClick={() => setShowCompose(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm hover:bg-amber-700 transition-colors"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 4.5v15m7.5-7.5h-15"
            />
          </svg>
          New Class Message
        </button>
      ) : (
        <div className="rounded-lg border border-border bg-background p-[var(--density-card-padding)] shadow-sm">
          <h2 className="text-lg font-semibold text-foreground">
            Send Class Message
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            This message will be sent to all parents of students in the selected
            class.
          </p>

          {error && (
            <div className="mt-3 rounded-md bg-red-50 p-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="mt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground">
                Class
              </label>
              <select
                value={composeClassId}
                onChange={(e) => setComposeClassId(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">Select a class...</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name} ({cls.active_enrollment_count} students)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground">
                Subject
              </label>
              <input
                type="text"
                value={composeSubject}
                onChange={(e) => setComposeSubject(e.target.value)}
                placeholder="e.g., Field Trip Reminder"
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground">
                Message
              </label>
              <textarea
                value={composeMessage}
                onChange={(e) => setComposeMessage(e.target.value)}
                rows={4}
                placeholder="Write your message to parents..."
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleSendBroadcast}
                disabled={
                  isSubmitting ||
                  !composeClassId ||
                  !composeSubject.trim() ||
                  !composeMessage.trim()
                }
                className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
              >
                {isSubmitting ? "Sending..." : "Send to Class"}
              </button>
              <button
                onClick={() => setShowCompose(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-foreground hover:bg-background transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Thread list */}
      {threads.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
          <p className="text-sm text-muted-foreground">
            No messages yet. Send a class message to start communicating with
            parents.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-gray-200 rounded-lg border border-border bg-background shadow-sm">
          {threads.map((thread) => {
            const typeConfig = THREAD_TYPE_CONFIG[thread.thread_type];
            const hasUnread = thread.unread_count > 0;
            const lastMsg = thread.last_message;
            const lastSender = thread.last_message_sender;

            // Truncate message preview
            const preview = lastMsg
              ? lastMsg.content.length > 100
                ? lastMsg.content.slice(0, 100) + "..."
                : lastMsg.content
              : "No messages yet";

            const senderName = lastSender
              ? lastSender.id === currentUserId
                ? "You"
                : `${lastSender.first_name} ${lastSender.last_name}`
              : "";

            return (
              <Link
                key={thread.id}
                href={`/comms/messages/${thread.id}`}
                className={`block px-5 py-4 transition-colors hover:bg-muted/50 ${
                  hasUnread ? "bg-amber-50/50" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-[var(--density-card-padding)]">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {hasUnread && (
                        <span className="inline-flex h-2 w-2 rounded-full bg-primary" />
                      )}
                      <span
                        className={`text-sm ${hasUnread ? "font-semibold text-foreground" : "font-medium text-foreground"}`}
                      >
                        {thread.subject || "No subject"}
                      </span>
                      <span
                        className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${typeConfig.bgColor} ${typeConfig.color}`}
                      >
                        {typeConfig.icon}{" "}
                        {thread.target_class?.name ?? typeConfig.label}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-sm text-muted-foreground">
                      {senderName && (
                        <span className="font-medium text-muted-foreground">
                          {senderName}:{" "}
                        </span>
                      )}
                      {preview}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="whitespace-nowrap text-xs text-muted-foreground">
                      {lastMsg
                        ? formatRelativeTime(lastMsg.sent_at)
                        : ""}
                    </span>
                    {hasUnread && (
                      <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                        {thread.unread_count}
                      </span>
                    )}
                    <span className="text-[10px] text-muted-foreground">
                      {thread.recipient_count} recipients
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-AU", { day: "numeric", month: "short" });
}