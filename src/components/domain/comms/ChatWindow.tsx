// src/components/domain/comms/ChatWindow.tsx
//
// WHY client component: Real-time messaging requires Supabase
// Realtime subscriptions (WebSocket), auto-scroll behavior,
// and optimistic message rendering. This is the core of the
// chat experience and must be fully client-side.

"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createBrowserClient } from "@supabase/ssr";
import type { ChatMessageWithSender } from "@/lib/actions/comms/chat-channels";
import { markChannelRead } from "@/lib/actions/comms/chat-channels";
import { ChatInput } from "@/components/domain/comms/ChatInput";

interface ChatWindowProps {
  channelId: string;
  initialMessages: ChatMessageWithSender[];
  tenantSlug: string;
}

export function ChatWindow({
  channelId,
  initialMessages,
  tenantSlug,
}: ChatWindowProps) {
  const [messages, setMessages] =
    useState<ChatMessageWithSender[]>(initialMessages);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

  // ── Auto-scroll to bottom ──────────────────────────
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages.length, scrollToBottom]);

  // ── Track scroll position ──────────────────────────
  function handleScroll() {
    const container = scrollContainerRef.current;
    if (!container) return;
    const threshold = 100;
    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    setIsAtBottom(distanceFromBottom < threshold);
  }

  // ── Supabase Realtime subscription ─────────────────
  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const channel = supabase
      .channel(`chat:${channelId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `channel_id=eq.${channelId}`,
        },
        async (payload) => {
          // Fetch the full message with sender info
          const { data } = await supabase
            .from("chat_messages")
            .select(
              `
              *,
              sender:users!chat_messages_sender_id_fkey(id, first_name, last_name, avatar_url)
            `
            )
            .eq("id", payload.new.id)
            .single();

          if (data) {
            setMessages((prev) => {
              // Avoid duplicates (in case of optimistic add)
              if (prev.some((m) => m.id === data.id)) return prev;
              return [...prev, data as ChatMessageWithSender];
            });

            // Mark as read if we're at the bottom
            if (isAtBottom) {
              markChannelRead(channelId);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelId, isAtBottom]);

  // ── Optimistic message handler ─────────────────────
  function handleOptimisticMessage(msg: ChatMessageWithSender) {
    setMessages((prev) => [...prev, msg]);
  }

  // ── Group messages by date ─────────────────────────
  const groupedByDate: { date: string; messages: ChatMessageWithSender[] }[] =
    [];
  let currentDate = "";

  for (const msg of messages) {
    if (msg.deleted_at) continue;

    const msgDate = new Date(msg.created_at).toLocaleDateString("en-AU", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });

    if (msgDate !== currentDate) {
      currentDate = msgDate;
      groupedByDate.push({ date: msgDate, messages: [] });
    }
    groupedByDate[groupedByDate.length - 1].messages.push(msg);
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* ── Message List ──────────────────────────────── */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-2 py-4"
      >
        {groupedByDate.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-gray-400">
            No messages yet. Start the conversation!
          </div>
        ) : (
          <div className="space-y-6">
            {groupedByDate.map((group) => (
              <div key={group.date}>
                {/* Date divider */}
                <div className="flex items-center gap-3 py-2">
                  <div className="flex-1 border-t border-gray-200" />
                  <span className="text-xs font-medium text-gray-400">
                    {group.date}
                  </span>
                  <div className="flex-1 border-t border-gray-200" />
                </div>

                {/* Messages */}
                <div className="space-y-1">
                  {group.messages.map((msg, idx) => {
                    const prevMsg =
                      idx > 0 ? group.messages[idx - 1] : null;
                    const showSender =
                      !prevMsg || prevMsg.sender_id !== msg.sender_id;

                    return (
                      <MessageBubble
                        key={msg.id}
                        message={msg}
                        showSender={showSender}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Scroll to bottom indicator ────────────────── */}
      {!isAtBottom && (
        <div className="flex justify-center py-1">
          <button
            type="button"
            onClick={scrollToBottom}
            className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700 shadow-sm hover:bg-amber-200"
          >
            ↓ New messages
          </button>
        </div>
      )}

      {/* ── Chat Input ────────────────────────────────── */}
      <ChatInput
        channelId={channelId}
        onOptimisticMessage={handleOptimisticMessage}
      />
    </div>
  );
}

// ── Message Bubble ─────────────────────────────────────
function MessageBubble({
  message,
  showSender,
}: {
  message: ChatMessageWithSender;
  showSender: boolean;
}) {
  const isHidden = message.is_hidden;

  if (isHidden) {
    return (
      <div className="px-12 py-1">
        <p className="text-xs italic text-gray-400">
          Message hidden by moderator
          {message.hidden_reason && `: ${message.hidden_reason}`}
        </p>
      </div>
    );
  }

  if (message.message_type === "system") {
    return (
      <div className="flex justify-center py-1">
        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-500">
          {message.content}
        </span>
      </div>
    );
  }

  return (
    <div className={`group flex gap-3 px-2 py-0.5 hover:bg-gray-50 ${showSender ? "mt-3" : ""}`}>
      {/* Avatar column */}
      <div className="w-8 flex-shrink-0">
        {showSender && (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-xs font-medium text-amber-700">
            {message.sender.first_name?.[0]}
            {message.sender.last_name?.[0]}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {showSender && (
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-semibold text-gray-900">
              {message.sender.first_name} {message.sender.last_name}
            </span>
            <time className="text-xs text-gray-400">
              {new Date(message.created_at).toLocaleTimeString("en-AU", {
                hour: "numeric",
                minute: "2-digit",
              })}
            </time>
            {message.edited_at && (
              <span className="text-xs text-gray-400">(edited)</span>
            )}
          </div>
        )}

        <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">
          {message.content}
        </p>

        {/* Attachment */}
        {message.attachment_url && (
          <div className="mt-1">
            {message.message_type === "image" ? (
              <img
                src={message.attachment_url}
                alt={message.attachment_name ?? "Attachment"}
                className="max-h-64 max-w-sm rounded-lg border border-gray-200"
              />
            ) : (
              <a
                href={message.attachment_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
              >
                <svg
                  className="h-4 w-4 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13"
                  />
                </svg>
                {message.attachment_name ?? "Attachment"}
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
