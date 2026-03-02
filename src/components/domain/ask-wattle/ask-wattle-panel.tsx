// src/components/domain/ask-wattle/ask-wattle-panel.tsx
//
// ============================================================
// WattleOS V2 - Ask Wattle Chat Panel
// ============================================================
// The primary UI for the documentation assistant. Designed as a
// slide-out panel that can be triggered from anywhere in the app.
//
// WHY a panel (not a page): Wattle should be available without
// navigating away from your current work. A guide marking
// attendance who needs help should get it in-context, not be
// ripped out of their flow.
//
// WHY the design choices:
// - Warm amber accent (not sterile blue) matches WattleOS brand
// - Rounded message bubbles with generous padding feel approachable
// - Typing indicator uses a gentle pulse, not aggressive dots
// - Sources appear as subtle chips, not a wall of links
// - Action cards appear as interactive buttons between text and sources
// - Input area is large and inviting, not a cramped text field
//
// This is a client component because it manages streaming state,
// user input, and scroll position - all interactive concerns.
// ============================================================

"use client";

import { useAskWattle, type ChatMessage } from "@/lib/hooks/use-ask-wattle";
import { getActionById } from "@/lib/docs/wattle-actions";
import type {
  MessageSource,
  RevertDescriptor,
  WattleActionSuggestion,
} from "@/types/ask-wattle";
import { ToolResultCard } from "./tool-result-cards";
import { useGlowRegistry } from "@/components/domain/glow/glow-registry";
import { usePathname, useRouter } from "next/navigation";
import React, { useCallback, useEffect, useRef, useState } from "react";

// ============================================================
// Sub-Components
// ============================================================

function WattleAvatar() {
  return (
    <div
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
      style={{
        background:
          "linear-gradient(135deg, var(--wattle-gold-muted) 0%, var(--wattle-gold) 100%)",
      }}
      aria-hidden="true"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--wattle-cream)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
        <circle cx="12" cy="10" r="3" />
        <path d="M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662" />
      </svg>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <WattleAvatar />
      <div
        className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm px-4 py-3"
        style={{
          background: "color-mix(in srgb, var(--wattle-gold) 8%, transparent)",
        }}
      >
        <span className="sr-only">Wattle is thinking...</span>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="inline-block h-2 w-2 rounded-full"
            style={{
              background: "var(--wattle-gold)",
              opacity: 0.4,
              animation: `wattlePulse 1.4s ease-in-out ${i * 0.2}s infinite`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

function StatusIndicator({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-3 px-4 py-2">
      <WattleAvatar />
      <div
        className="flex items-center gap-2 rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm"
        style={{
          background: "color-mix(in srgb, var(--wattle-gold) 8%, transparent)",
          color: "var(--wattle-brown)",
        }}
      >
        <span
          className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
          style={{
            background: "var(--wattle-gold)",
            animation: "wattlePulse 1.4s ease-in-out infinite",
          }}
        />
        <span>{message}</span>
      </div>
    </div>
  );
}

function SourceChips({ sources }: { sources: MessageSource[] }) {
  if (sources.length === 0) return null;

  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {sources.map((source) => (
        <a
          key={source.slug}
          href={source.url ?? `/docs/${source.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs transition-colors"
          style={{
            background:
              "color-mix(in srgb, var(--wattle-gold) 8%, transparent)",
            color: "var(--wattle-brown)",
            border: "1px solid var(--wattle-border)",
          }}
          title={`View: ${source.title}`}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
          <span className="max-w-[140px] truncate">{source.title}</span>
        </a>
      ))}
    </div>
  );
}

// ============================================================
// Action Cards - interactive buttons for platform actions
// ============================================================

function ActionIcon({ type }: { type: "navigate" | "create" }) {
  if (type === "create") {
    return (
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="16" />
        <line x1="8" y1="12" x2="16" y2="12" />
      </svg>
    );
  }

  // Navigate arrow
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14" />
      <path d="M12 5l7 7-7 7" />
    </svg>
  );
}

function ActionCards({
  actions,
  onActionClick,
}: {
  actions: WattleActionSuggestion[];
  onActionClick: (action: WattleActionSuggestion) => void;
}) {
  if (actions.length === 0) return null;

  return (
    <div className="mt-2 flex flex-col gap-1.5">
      {actions.map((action) => {
        const registryAction = getActionById(action.action_id);
        const actionType = registryAction?.type ?? "navigate";

        return (
          <button
            key={action.action_id}
            onClick={() => onActionClick(action)}
            className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm transition-all hover:scale-[1.01] active:scale-[0.99]"
            style={{
              background:
                "color-mix(in srgb, var(--wattle-gold) 10%, transparent)",
              border:
                "1px solid color-mix(in srgb, var(--wattle-gold) 20%, transparent)",
              color: "var(--wattle-dark)",
            }}
          >
            <span
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
              style={{
                background:
                  "color-mix(in srgb, var(--wattle-gold) 15%, transparent)",
                color: "var(--wattle-brown)",
              }}
            >
              <ActionIcon type={actionType} />
            </span>
            <span className="flex-1 font-medium leading-snug">
              {action.label}
            </span>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--wattle-tan)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        );
      })}
    </div>
  );
}

// ============================================================
// Message Bubble
// ============================================================

function MessageBubble({
  message,
  onActionClick,
  onRevert,
  onSendMessage,
}: {
  message: ChatMessage;
  onActionClick: (action: WattleActionSuggestion) => void;
  onRevert: (
    messageId: string,
    toolCallId: string,
    revert: RevertDescriptor,
  ) => void;
  onSendMessage: (content: string) => void;
}) {
  const isUser = message.role === "user";

  return (
    <div
      className={`flex items-start gap-3 px-4 py-2 ${isUser ? "flex-row-reverse" : ""}`}
    >
      {!isUser && <WattleAvatar />}

      <div className="flex max-w-[85%] flex-col">
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
            isUser ? "rounded-tr-sm" : "rounded-tl-sm"
          }`}
          style={
            isUser
              ? {
                  background: "var(--wattle-dark)",
                  color: "var(--wattle-cream)",
                }
              : {
                  background:
                    "color-mix(in srgb, var(--wattle-gold) 6%, transparent)",
                  color: "var(--wattle-dark)",
                  border: "1px solid var(--wattle-border)",
                }
          }
        >
          {/* Render markdown-light content (bold, inline code, links) */}
          <MessageContent content={message.content} />

          {message.isStreaming && !message.content && (
            <span
              className="inline-block h-4 w-1 rounded-full"
              style={{
                background: "var(--wattle-gold)",
                animation: "wattleBlink 0.8s ease-in-out infinite",
              }}
            />
          )}
        </div>

        {/* Tool result cards - visual representations of tool output */}
        {!isUser && message.toolResults.length > 0 && (
          <div className="mt-2 flex flex-col gap-2">
            {message.toolResults.map((tr) => (
              <ToolResultCard
                key={tr.tool_call_id}
                result={tr}
                onRevert={(toolCallId) => {
                  if (tr.revert) onRevert(message.id, toolCallId, tr.revert);
                }}
                onSendMessage={onSendMessage}
              />
            ))}
          </div>
        )}

        {/* Action cards appear between tool results and sources */}
        {!isUser && (
          <ActionCards
            actions={message.actions}
            onActionClick={onActionClick}
          />
        )}

        {!isUser && <SourceChips sources={message.sources} />}

        <span
          className={`mt-1 text-xs opacity-40 ${isUser ? "text-right" : ""}`}
          style={{ color: "var(--wattle-brown)" }}
        >
          {formatTime(message.timestamp)}
        </span>
      </div>
    </div>
  );
}

/** Light markdown rendering - bold, code, and line breaks */
function MessageContent({ content }: { content: string }) {
  if (!content) return null;

  // Process the content into segments
  const segments = content.split(/(\*\*.*?\*\*|`[^`]+`|\n)/g);

  return (
    <>
      {segments.map((segment, i) => {
        if (segment === "\n") {
          return <br key={i} />;
        }
        if (segment.startsWith("**") && segment.endsWith("**")) {
          return (
            <strong key={i} className="font-semibold">
              {segment.slice(2, -2)}
            </strong>
          );
        }
        if (segment.startsWith("`") && segment.endsWith("`")) {
          return (
            <code
              key={i}
              className="rounded px-1 py-0.5 text-xs"
              style={{
                background:
                  "color-mix(in srgb, var(--wattle-dark) 6%, transparent)",
              }}
            >
              {segment.slice(1, -1)}
            </code>
          );
        }
        return <React.Fragment key={i}>{segment}</React.Fragment>;
      })}
    </>
  );
}

function WelcomeState({
  onSuggestionClick,
}: {
  onSuggestionClick: (q: string) => void;
}) {
  const suggestions = [
    { label: "What's my daily summary?", icon: "📋" },
    { label: "Who's absent today?", icon: "👋" },
    { label: "Mark everyone in Banksia as present", icon: "✅" },
    { label: "Check in Mia to After School Care", icon: "🏫" },
  ];

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
      <div
        className="mb-4 flex h-16 w-16 items-center justify-center rounded-full"
        style={{
          background:
            "linear-gradient(135deg, var(--wattle-gold-muted) 0%, var(--wattle-gold) 100%)",
        }}
      >
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--wattle-cream)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
          <circle cx="12" cy="10" r="3" />
          <path d="M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662" />
        </svg>
      </div>
      <h3
        className="mb-1.5 text-lg font-medium"
        style={{
          color: "var(--wattle-dark)",
          fontFamily: "'Fraunces', Georgia, serif",
        }}
      >
        Ask Wattle
      </h3>
      <p
        className="mb-8 max-w-xs text-center text-sm leading-relaxed"
        style={{ color: "var(--wattle-brown)" }}
      >
        Your platform assistant. Ask anything about WattleOS - I can help you
        navigate, take action, and get things done.
      </p>

      <div className="grid w-full max-w-sm grid-cols-2 gap-2">
        {suggestions.map((s) => (
          <button
            key={s.label}
            onClick={() => onSuggestionClick(s.label)}
            className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background:
                "color-mix(in srgb, var(--wattle-gold) 6%, transparent)",
              border: "1px solid var(--wattle-border)",
              color: "var(--wattle-brown)",
            }}
          >
            <span className="text-base">{s.icon}</span>
            <span className="leading-snug">{s.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// Main Component
// ============================================================

export interface AskWattlePanelProps {
  /** Whether the panel is currently visible */
  isOpen: boolean;
  /** Callback to close the panel */
  onClose: () => void;
  /** Optional: user's role for tailored responses */
  userRole?: "guide" | "parent" | "admin" | "staff";
  /** User's first name for personalised responses */
  userName?: string;
  /** User's permission keys */
  permissions?: string[];
  /** Tenant/school name */
  tenantName?: string;
  /** A question to auto-send when the panel opens */
  pendingQuestion?: string | null;
  /** Callback when the pending question has been consumed */
  onPendingQuestionConsumed?: () => void;
  /**
   * Notifies the provider when loading state changes so it can track
   * background tasks and show a notification toast when the task completes
   * while the panel is closed.
   */
  onLoadingChange?: (isLoading: boolean, lastMessagePreview?: string) => void;
}

export function AskWattlePanel({
  isOpen,
  onClose,
  onLoadingChange,
  userRole,
  userName,
  permissions,
  tenantName,
  pendingQuestion,
  onPendingQuestionConsumed,
}: AskWattlePanelProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const glowRegistry = useGlowRegistry();

  const {
    messages,
    isLoading,
    error,
    sendMessage,
    clearError,
    resetConversation,
    revertToolAction,
    respondToConfirmation,
  } = useAskWattle({
    currentRoute: pathname,
    userRole,
    userName,
    permissions,
    tenantName,
    getManifest: glowRegistry.getManifest,
    onHighlight: glowRegistry.setHighlights,
  });

  // Notify provider of loading changes for background task tracking
  const prevLoadingRef = useRef(false);
  useEffect(() => {
    if (isLoading === prevLoadingRef.current) return;
    prevLoadingRef.current = isLoading;
    if (!isLoading) {
      const lastMsg = [...messages]
        .reverse()
        .find((m) => m.role === "assistant")?.content;
      onLoadingChange?.(false, lastMsg);
    } else {
      onLoadingChange?.(true);
    }
  }, [isLoading, messages, onLoadingChange]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  // Handle pending question from openWith()
  useEffect(() => {
    if (pendingQuestion && isOpen && !isLoading) {
      const timer = setTimeout(() => {
        sendMessage(pendingQuestion);
        onPendingQuestionConsumed?.();
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [
    pendingQuestion,
    isOpen,
    isLoading,
    sendMessage,
    onPendingQuestionConsumed,
  ]);

  const handleSend = useCallback(async () => {
    const trimmed = inputValue.trim();
    if (!trimmed || isLoading) return;

    setInputValue("");
    clearError();

    // Reset textarea height
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }

    await sendMessage(trimmed);
  }, [inputValue, isLoading, sendMessage, clearError]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  // Auto-resize textarea
  const handleInput = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setInputValue(e.target.value);
      e.target.style.height = "auto";
      e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
    },
    [],
  );

  // Handle action card clicks - navigate using Next.js router
  const handleActionClick = useCallback(
    (action: WattleActionSuggestion) => {
      const registryAction = getActionById(action.action_id);
      if (!registryAction) return;

      router.push(registryAction.route);
      onClose();
    },
    [router, onClose],
  );

  return (
    <>
      {/* Animation keyframes */}
      <style>{`
        @keyframes wattlePulse {
          0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
          40% { opacity: 0.6; transform: scale(1); }
        }
        @keyframes wattleBlink {
          0%, 100% { opacity: 0; }
          50% { opacity: 1; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes wattleSlideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes wattleSlideOut {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(100%); opacity: 0; }
        }
        @keyframes wattleRing {
          0% { box-shadow: 0 4px 14px color-mix(in srgb, var(--wattle-gold) 35%, transparent), 0 0 0 0 color-mix(in srgb, var(--wattle-gold) 70%, transparent); }
          60% { box-shadow: 0 4px 14px color-mix(in srgb, var(--wattle-gold) 35%, transparent), 0 0 0 10px color-mix(in srgb, var(--wattle-gold) 0%, transparent); }
          100% { box-shadow: 0 4px 14px color-mix(in srgb, var(--wattle-gold) 35%, transparent), 0 0 0 0 color-mix(in srgb, var(--wattle-gold) 0%, transparent); }
        }
      `}</style>

      {/* Panel */}
      <aside
        className={`fixed right-0 top-0 z-50 flex h-full w-full flex-col shadow-2xl sm:w-[420px] ${
          isOpen ? "" : "pointer-events-none"
        }`}
        style={{
          background: "var(--wattle-cream)",
          borderLeft: "1px solid var(--wattle-border)",
          animation: isOpen
            ? "wattleSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)"
            : "wattleSlideOut 0.25s ease-in forwards",
        }}
        role="dialog"
        aria-label="Ask Wattle - Platform Assistant"
        aria-hidden={!isOpen}
      >
        {/* Header */}
        <header
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: "1px solid var(--wattle-border)" }}
        >
          <div className="flex items-center gap-3">
            <WattleAvatar />
            <div>
              <h2
                className="text-base font-medium leading-tight"
                style={{
                  color: "var(--wattle-dark)",
                  fontFamily: "'Fraunces', Georgia, serif",
                }}
              >
                Ask Wattle
              </h2>
              <span className="text-xs" style={{ color: "var(--wattle-tan)" }}>
                Platform assistant
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <button
                onClick={resetConversation}
                className="rounded-lg p-2 transition-colors hover:bg-black/5"
                title="New conversation"
                aria-label="Start new conversation"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--wattle-brown)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </button>
            )}
            <button
              onClick={onClose}
              className="rounded-lg p-2 transition-colors hover:bg-black/5"
              aria-label="Close Wattle assistant"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--wattle-brown)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto pb-2">
          {messages.length === 0 ? (
            <WelcomeState
              onSuggestionClick={(q) => {
                setInputValue(q);
                sendMessage(q);
              }}
            />
          ) : (
            <div className="py-3">
              {messages
                .filter(
                  (msg) =>
                    !(
                      msg.role === "assistant" &&
                      msg.isStreaming &&
                      !msg.content
                    ),
                )
                .map((msg) => (
                  <MessageBubble
                    key={msg.id}
                    message={msg}
                    onActionClick={handleActionClick}
                    onRevert={(messageId, toolCallId, revert) =>
                      revertToolAction(messageId, toolCallId, revert)
                    }
                    onSendMessage={(content) => sendMessage(content)}
                  />
                ))}

              {isLoading &&
                messages[messages.length - 1]?.role === "assistant" &&
                (messages[messages.length - 1]?.statusMessage ? (
                  <StatusIndicator
                    message={messages[messages.length - 1].statusMessage!}
                  />
                ) : (
                  !messages[messages.length - 1]?.content && <TypingIndicator />
                ))}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Error banner */}
        {error && (
          <div
            className="mx-4 mb-2 flex items-center gap-2 rounded-lg px-3 py-2 text-xs"
            style={{
              background:
                "color-mix(in srgb, var(--destructive) 6%, transparent)",
              color: "var(--destructive)",
              border:
                "1px solid color-mix(in srgb, var(--destructive) 10%, transparent)",
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
            <span className="flex-1">{error}</span>
            <button onClick={clearError} className="font-medium underline">
              Dismiss
            </button>
          </div>
        )}

        {/* Input area */}
        <div
          className="px-4 pb-4 pt-2"
          style={{ borderTop: "1px solid var(--wattle-border)" }}
        >
          <div
            className="flex items-end gap-2 rounded-2xl px-4 py-3"
            style={{
              background: "var(--card)",
              border:
                "1.5px solid color-mix(in srgb, var(--wattle-gold) 20%, transparent)",
              boxShadow:
                "0 1px 3px color-mix(in srgb, var(--wattle-dark) 4%, transparent)",
            }}
          >
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything about WattleOS..."
              rows={1}
              disabled={isLoading}
              className="flex-1 resize-none bg-transparent text-sm leading-relaxed outline-none placeholder:text-[var(--wattle-tan)] disabled:opacity-50"
              style={{ color: "var(--wattle-dark)", maxHeight: 120 }}
              aria-label="Type your question"
            />
            <button
              onClick={handleSend}
              disabled={!inputValue.trim() || isLoading}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all disabled:opacity-30"
              style={{
                background: inputValue.trim()
                  ? "linear-gradient(135deg, var(--wattle-gold-muted) 0%, var(--wattle-gold) 100%)"
                  : "color-mix(in srgb, var(--wattle-gold) 15%, transparent)",
              }}
              aria-label="Send message"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke={
                  inputValue.trim()
                    ? "var(--wattle-cream)"
                    : "var(--wattle-tan)"
                }
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
          <p
            className="mt-1.5 text-center text-[10px]"
            style={{ color: "var(--wattle-tan)" }}
          >
            Wattle can check records, take actions, and answer questions about
            WattleOS
          </p>
        </div>
      </aside>
    </>
  );
}

// ============================================================
// Trigger Button (floating action button for the app shell)
// ============================================================

export function AskWattleTrigger({
  onClick,
  isBackgroundRunning = false,
}: {
  onClick: () => void;
  isBackgroundRunning?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="group fixed bottom-6 right-6 z-30 flex h-14 w-14 items-center justify-center rounded-full transition-all hover:scale-105 hover:shadow-xl active:scale-95"
      style={{
        background:
          "linear-gradient(135deg, var(--wattle-gold-muted) 0%, var(--wattle-gold) 100%)",
        animation: isBackgroundRunning
          ? "wattleRing 1.8s ease-out infinite"
          : undefined,
        boxShadow: isBackgroundRunning
          ? undefined
          : "0 4px 14px color-mix(in srgb, var(--wattle-gold) 35%, transparent)",
      }}
      aria-label={
        isBackgroundRunning
          ? "Wattle is working… click to view"
          : "Open Ask Wattle assistant"
      }
      title={
        isBackgroundRunning
          ? "Wattle is working in the background"
          : "Ask Wattle"
      }
    >
      {isBackgroundRunning ? (
        /* Spinner arc when a background task is running */
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--wattle-cream)"
          strokeWidth="2.5"
          strokeLinecap="round"
          style={{ animation: "spin 0.9s linear infinite" }}
        >
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
      ) : (
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--wattle-cream)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="transition-transform group-hover:rotate-12"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          <circle cx="12" cy="10" r="1" fill="var(--wattle-cream)" />
          <circle cx="8" cy="10" r="1" fill="var(--wattle-cream)" />
          <circle cx="16" cy="10" r="1" fill="var(--wattle-cream)" />
        </svg>
      )}
    </button>
  );
}

// ============================================================
// Utilities
// ============================================================

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-AU", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}
