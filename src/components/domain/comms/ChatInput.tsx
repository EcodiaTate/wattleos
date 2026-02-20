// src/components/domain/comms/ChatInput.tsx
//
// WHY client component: Message input requires keyboard
// handling (Enter to send), form state, and optimistic
// message submission.

"use client";

import { useState, useRef, useTransition } from "react";
import {
  sendMessage,
  type ChatMessageWithSender,
} from "@/lib/actions/comms/chat-channels";

interface ChatInputProps {
  channelId: string;
  onOptimisticMessage: (msg: ChatMessageWithSender) => void;
}

export function ChatInput({ channelId, onOptimisticMessage }: ChatInputProps) {
  const [content, setContent] = useState("");
  const [isPending, startTransition] = useTransition();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Enter to send, Shift+Enter for new line
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleSend() {
    const trimmed = content.trim();
    if (!trimmed) return;

    // Create optimistic message
    const optimisticMsg: ChatMessageWithSender = {
      id: `optimistic-${Date.now()}`,
      tenant_id: "",
      channel_id: channelId,
      sender_id: "current-user",
      content: trimmed,
      message_type: "text",
      attachment_url: null,
      attachment_name: null,
      reply_to_id: null,
      is_hidden: false,
      hidden_by: null,
      hidden_reason: null,
      edited_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
      sender: {
        id: "current-user",
        first_name: "You",
        last_name: "",
        avatar_url: null,
      },
    };

    onOptimisticMessage(optimisticMsg);
    setContent("");

    // Auto-resize textarea back to single line
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    startTransition(async () => {
      await sendMessage({
        channel_id: channelId,
        content: trimmed,
        message_type: "text",
      });
    });
  }

  // Auto-resize textarea
  function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setContent(e.target.value);
    const textarea = e.target;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`;
  }

  return (
    <div className="border-t border-gray-200 bg-white px-2 pt-3 pb-2">
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          rows={1}
          className="flex-1 resize-none rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          style={{ maxHeight: "150px" }}
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={!content.trim() || isPending}
          className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-600 text-white transition-colors hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
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
      <p className="mt-1 text-xs text-gray-400">
        Press Enter to send, Shift+Enter for new line
      </p>
    </div>
  );
}
