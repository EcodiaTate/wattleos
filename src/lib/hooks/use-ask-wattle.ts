// src/hooks/use-ask-wattle.ts
//
// ============================================================
// WattleOS V2 - useAskWattle React Hook
// ============================================================
// Manages the full lifecycle of an Ask Wattle conversation:
// sending messages, consuming the SSE stream, accumulating
// tokens into a response, tracking sources, and managing
// loading/error states.
//
// WHY a custom hook (not a library like Vercel AI SDK): The
// Vercel AI SDK adds 50KB+ of dependencies and abstractions
// we don't need. Our SSE format is simple - a custom hook
// does everything we need with zero deps.
//
// WHY optimistic message insertion: The user's message appears
// in the chat immediately (before the API responds). This makes
// the UI feel instant. The assistant's message appears as an
// empty bubble that fills with streaming text - like watching
// someone type.
// ============================================================

"use client";

import type {
  AskWattleStreamChunk,
  ConfirmationRequest,
  GlowHighlight,
  MessageSource,
  RevertDescriptor,
  ToolResultStructuredData,
  WattleActionSuggestion,
} from "@/types/ask-wattle";
import { useCallback, useRef, useState } from "react";

// ============================================================
// Types
// ============================================================

export type RevertState = "idle" | "reverting" | "reverted" | "failed";

export interface ChatToolResult {
  tool_call_id: string;
  tool_name: string;
  success: boolean;
  structured: ToolResultStructuredData;
  revert?: RevertDescriptor;
  revertState: RevertState;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources: MessageSource[];
  actions: WattleActionSuggestion[];
  isStreaming: boolean;
  timestamp: Date;
  /** Status message shown during tool execution (e.g. "Checking attendance...") */
  statusMessage: string | null;
  /** Structured tool results for visual rendering */
  toolResults: ChatToolResult[];
  /** Pending confirmation request for bulk/destructive operations */
  confirmation: ConfirmationRequest | null;
  confirmationState: "pending" | "accepted" | "cancelled" | null;
}

export interface UseAskWattleOptions {
  /** Pre-existing conversation to continue */
  conversationId?: string;
  /** Current route for context-aware answers */
  currentRoute?: string;
  /** User's role for audience-aware responses */
  userRole?: "guide" | "parent" | "admin" | "staff";
  /** User's first name for personalised responses */
  userName?: string;
  /** User's permission keys (hint for prompt - server re-validates) */
  permissions?: string[];
  /** Tenant/school name */
  tenantName?: string;
  /** Callback to get the current UI manifest for glow guidance */
  getManifest?: () => string;
  /** Callback to activate glow highlights on the UI */
  onHighlight?: (
    highlights: GlowHighlight[],
    workflowTitle?: string,
    totalSteps?: number,
  ) => void;
}

export interface UseAskWattleReturn {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  conversationId: string | null;
  sendMessage: (content: string) => Promise<void>;
  clearError: () => void;
  resetConversation: () => void;
  /** Revert a write tool action (undo button) */
  revertToolAction: (
    messageId: string,
    toolCallId: string,
    revert: RevertDescriptor,
  ) => Promise<void>;
  /** Respond to a confirmation prompt (accept/cancel) */
  respondToConfirmation: (
    messageId: string,
    accepted: boolean,
  ) => Promise<void>;
}

// ============================================================
// Hook
// ============================================================

export function useAskWattle(
  options: UseAskWattleOptions = {},
): UseAskWattleReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(
    options.conversationId ?? null,
  );

  // Abort controller for cancelling in-flight requests
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isLoading) return;

      // Cancel any in-flight request
      abortRef.current?.abort();
      abortRef.current = new AbortController();

      setError(null);
      setIsLoading(true);

      // Optimistically add the user message
      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: content.trim(),
        sources: [],
        actions: [],
        isStreaming: false,
        timestamp: new Date(),
        statusMessage: null,
        toolResults: [],
        confirmation: null,
        confirmationState: null,
      };

      // Create a placeholder for the assistant response
      const assistantId = `assistant-${Date.now()}`;
      const assistantMessage: ChatMessage = {
        id: assistantId,
        role: "assistant",
        content: "",
        sources: [],
        actions: [],
        isStreaming: true,
        timestamp: new Date(),
        statusMessage: null,
        toolResults: [],
        confirmation: null,
        confirmationState: null,
      };

      setMessages((prev) => [...prev, userMessage, assistantMessage]);

      try {
        const response = await fetch("/api/ask-wattle", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: content.trim(),
            conversation_id: conversationId,
            current_route: options.currentRoute,
            user_role: options.userRole,
            user_name: options.userName,
            permissions: options.permissions,
            tenant_name: options.tenantName,
            ui_manifest: options.getManifest?.() || undefined,
          }),
          signal: abortRef.current.signal,
        });

        if (!response.ok) {
          const errorBody = await response.json().catch(() => ({}));
          throw new Error(
            (errorBody as { error?: string }).error ??
              `HTTP ${response.status}`,
          );
        }

        if (!response.body) {
          throw new Error("No response stream");
        }

        // Read the SSE stream
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Process complete SSE events (separated by \n\n)
          const events = buffer.split("\n\n");
          buffer = events.pop() ?? ""; // Keep incomplete event in buffer

          for (const event of events) {
            const dataLine = event
              .split("\n")
              .find((line) => line.startsWith("data: "));
            if (!dataLine) continue;

            const jsonStr = dataLine.slice(6); // Remove "data: " prefix
            let chunk: AskWattleStreamChunk;

            try {
              chunk = JSON.parse(jsonStr) as AskWattleStreamChunk;
            } catch {
              continue; // Skip malformed events
            }

            switch (chunk.type) {
              case "text":
                // Append text token to the streaming message
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantId
                      ? { ...msg, content: msg.content + (chunk.content ?? "") }
                      : msg,
                  ),
                );
                break;

              case "sources":
                // Attach sources to the assistant message
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantId
                      ? { ...msg, sources: chunk.sources ?? [] }
                      : msg,
                  ),
                );
                break;

              case "actions":
                // Attach action suggestions to the assistant message
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantId
                      ? { ...msg, actions: chunk.actions ?? [] }
                      : msg,
                  ),
                );
                break;

              case "status":
                // Show tool execution status (e.g. "Checking attendance...")
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantId
                      ? { ...msg, statusMessage: chunk.status_message || null }
                      : msg,
                  ),
                );
                break;

              case "tool_result": {
                // Append structured tool result for visual rendering
                const tr = chunk.tool_result;
                if (tr) {
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === assistantId
                        ? {
                            ...msg,
                            toolResults: [
                              ...msg.toolResults,
                              {
                                tool_call_id: tr.tool_call_id,
                                tool_name: tr.tool_name,
                                success: tr.success,
                                structured: tr.structured,
                                revert: tr.revert,
                                revertState: "idle" as const,
                              },
                            ],
                          }
                        : msg,
                    ),
                  );
                }
                break;
              }

              case "confirm_action": {
                // Show confirmation prompt for bulk/destructive operations
                const conf = chunk.confirmation;
                if (conf) {
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === assistantId
                        ? {
                            ...msg,
                            confirmation: conf,
                            confirmationState: "pending" as const,
                          }
                        : msg,
                    ),
                  );
                }
                break;
              }

              case "highlight":
                // Activate glow highlights on the UI
                if (chunk.highlights && options.onHighlight) {
                  options.onHighlight(
                    chunk.highlights,
                    chunk.workflow_title,
                    chunk.highlight_total_steps,
                  );
                }
                break;

              case "conversation_id":
                if (chunk.conversation_id) {
                  setConversationId(chunk.conversation_id);
                }
                break;

              case "error":
                setError(chunk.error ?? "Something went wrong");
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantId
                      ? {
                          ...msg,
                          isStreaming: false,
                          content:
                            msg.content ||
                            "Sorry, I ran into an issue. Could you try asking again?",
                        }
                      : msg,
                  ),
                );
                break;

              case "done":
                // Mark streaming as complete, clear status
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantId
                      ? { ...msg, isStreaming: false, statusMessage: null }
                      : msg,
                  ),
                );
                break;
            }
          }
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") return;

        const errorMessage =
          err instanceof Error ? err.message : "Failed to get a response";
        setError(errorMessage);

        // Update the assistant message to show the error gracefully
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantId
              ? {
                  ...msg,
                  isStreaming: false,
                  content:
                    msg.content ||
                    "Sorry, I wasn't able to answer that. Please try again in a moment.",
                }
              : msg,
          ),
        );
      } finally {
        setIsLoading(false);
      }
    },
    [
      conversationId,
      isLoading,
      options.currentRoute,
      options.userRole,
      options.userName,
      options.permissions,
      options.tenantName,
    ],
  );

  // ── Revert a write tool action ──────────────────────────────

  const revertToolAction = useCallback(
    async (messageId: string, toolCallId: string, revert: RevertDescriptor) => {
      // Optimistically set to "reverting"
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? {
                ...msg,
                toolResults: msg.toolResults.map((tr) =>
                  tr.tool_call_id === toolCallId
                    ? { ...tr, revertState: "reverting" as const }
                    : tr,
                ),
              }
            : msg,
        ),
      );

      try {
        const response = await fetch("/api/ask-wattle/revert", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(revert),
        });

        if (!response.ok) {
          throw new Error("Revert failed");
        }

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === messageId
              ? {
                  ...msg,
                  toolResults: msg.toolResults.map((tr) =>
                    tr.tool_call_id === toolCallId
                      ? { ...tr, revertState: "reverted" as const }
                      : tr,
                  ),
                }
              : msg,
          ),
        );
      } catch {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === messageId
              ? {
                  ...msg,
                  toolResults: msg.toolResults.map((tr) =>
                    tr.tool_call_id === toolCallId
                      ? { ...tr, revertState: "failed" as const }
                      : tr,
                  ),
                }
              : msg,
          ),
        );
      }
    },
    [],
  );

  // ── Respond to confirmation prompt ──────────────────────────

  const respondToConfirmation = useCallback(
    async (messageId: string, accepted: boolean) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? {
                ...msg,
                confirmationState: accepted
                  ? ("accepted" as const)
                  : ("cancelled" as const),
              }
            : msg,
        ),
      );

      if (accepted) {
        // Find the confirmation to build the follow-up message
        const msg = messages.find((m) => m.id === messageId);
        if (msg?.confirmation) {
          await sendMessage(
            `Yes, proceed with: ${msg.confirmation.description}`,
          );
        }
      }
    },
    [messages, sendMessage],
  );

  const clearError = useCallback(() => setError(null), []);

  const resetConversation = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    setConversationId(null);
    setError(null);
    setIsLoading(false);
  }, []);

  return {
    messages,
    isLoading,
    error,
    conversationId,
    sendMessage,
    clearError,
    resetConversation,
    revertToolAction,
    respondToConfirmation,
  };
}
