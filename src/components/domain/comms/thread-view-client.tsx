// src/components/domain/comms/thread-view-client.tsx
//
// ============================================================
// WattleOS V2 - Thread Conversation View (Client Component)
// ============================================================
// Chat-style message display with reply input.
// Messages from current user appear on the right (amber),
// others on the left (gray). Auto-scrolls to newest message.
//
// WHY client: Optimistic message rendering, auto-scroll,
// keyboard shortcuts (Enter to send) all require client state.
// ============================================================

"use client";

import { sendMessage } from "@/lib/actions/comms/messaging";
import type { MessageWithSender, User } from "@/types/domain";
import { useEffect, useRef, useState } from "react";

interface ThreadViewClientProps {
  threadId: string;
  initialMessages: MessageWithSender[];
  recipients: Array<
    Pick<User, "id" | "first_name" | "last_name" | "avatar_url">
  >;
  currentUserId: string;
}

export function ThreadViewClient({
  threadId,
  initialMessages,
  recipients,
  currentUserId,
}: ThreadViewClientProps) {
  const [messages, setMessages] =
    useState<MessageWithSender[]>(initialMessages);
  const [replyContent, setReplyContent] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    if (!replyContent.trim() || isSending) return;

    setError(null);
    setIsSending(true);

    // Optimistic add - Message type only has:
    // id, tenant_id, thread_id, sender_id, content, sent_at, created_at
    const nowIso = new Date().toISOString();
    const optimisticMessage: MessageWithSender = {
      id: `temp-${Date.now()}`,
      tenant_id: "",
      thread_id: threadId,
      sender_id: currentUserId,
      content: replyContent.trim(),
      sent_at: nowIso,
      created_at: nowIso,
      sender: {
        id: currentUserId,
        first_name: "You",
        last_name: "",
        avatar_url: null,
      },
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    const sentContent = replyContent;
    setReplyContent("");

    const result = await sendMessage({
      thread_id: threadId,
      content: sentContent,
    });

    setIsSending(false);

    if (result.error) {
      setError(result.error.message);
      // Remove optimistic message
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMessage.id));
      setReplyContent(sentContent);
      return;
    }

    const data = result.data;
    if (!data) return;

    // Replace optimistic message with real one.
    // Keep `sender` from optimistic message because sendMessage
    // returns Message (no sender join).
    setMessages((prev) =>
      prev.map((m) =>
        m.id === optimisticMessage.id
          ? {
              ...optimisticMessage,
              id: data.id,
              sent_at: data.sent_at,
              created_at: data.created_at,
            }
          : m,
      ),
    );
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div
      className="flex flex-col rounded-lg border border-border bg-background shadow-sm"
      style={{ height: "calc(100vh - 300px)", minHeight: "400px" }}
    >
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-muted-foreground">
              No messages yet. Start the conversation!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg: MessageWithSender, idx: number) => {
              const isOwn = msg.sender_id === currentUserId;
              const showSender =
                idx === 0 || messages[idx - 1].sender_id !== msg.sender_id;
              const senderName = isOwn
                ? "You"
                : `${msg.sender.first_name} ${msg.sender.last_name}`.trim();
              const initials = isOwn
                ? "Y"
                : (msg.sender.first_name?.[0] ?? "?").toUpperCase();

              return (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${isOwn ? "flex-row-reverse" : ""}`}
                >
                  {/* Avatar - only show on first message in a group */}
                  <div className="w-8 flex-shrink-0">
                    {showSender && (
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                          isOwn
                            ? "bg-amber-200 text-amber-800"
                            : "bg-gray-200 text-muted-foreground"
                        }`}
                      >
                        {msg.sender.avatar_url ? (
                          <img
                            src={msg.sender.avatar_url}
                            alt=""
                            className="h-8 w-8 rounded-full object-cover"
                          />
                        ) : (
                          initials
                        )}
                      </div>
                    )}
                  </div>

                  {/* Message bubble */}
                  <div className={`max-w-[70%] ${isOwn ? "text-right" : ""}`}>
                    {showSender && (
                      <p className="mb-1 text-xs font-medium text-muted-foreground">
                        {senderName}
                      </p>
                    )}
                    <div
                      className={`inline-block rounded-2xl px-4 py-2.5 text-sm ${
                        isOwn
                          ? "rounded-br-md bg-primary text-primary-foreground"
                          : "rounded-bl-md bg-muted text-foreground"
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {formatTime(msg.sent_at)}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Recipients bar */}
      <div className="border-t border-gray-100 px-6 py-2">
        <div className="flex items-center gap-1 overflow-x-auto">
          <span className="flex-shrink-0 text-[10px] font-medium text-muted-foreground">
            To:
          </span>
          {recipients.slice(0, 8).map((r) => (
            <span
              key={r.id}
              className="inline-flex flex-shrink-0 items-center rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground"
            >
              {r.first_name} {r.last_name}
            </span>
          ))}
          {recipients.length > 8 && (
            <span className="text-[10px] text-muted-foreground">
              +{recipients.length - 8} more
            </span>
          )}
        </div>
      </div>

      {/* Reply input */}
      <div className="border-t border-border px-4 py-3">
        {error && (
          <div className="mb-2 rounded-md bg-red-50 px-3 py-2">
            <p className="text-xs text-red-700">{error}</p>
          </div>
        )}
        <div className="flex items-end gap-3">
          <textarea
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder="Type a message... (Enter to send, Shift+Enter for new line)"
            className="flex-1 resize-none rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
            style={{ maxHeight: "120px" }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = "auto";
              target.style.height = Math.min(target.scrollHeight, 120) + "px";
            }}
          />
          <button
            onClick={handleSend}
            disabled={isSending || !replyContent.trim()}
            className="flex-shrink-0 rounded-xl bg-primary p-2.5 text-primary-foreground shadow-sm transition-colors hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  if (isToday) {
    return date.toLocaleTimeString("en-AU", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return (
      "Yesterday " +
      date.toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" })
    );
  }

  return date.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}