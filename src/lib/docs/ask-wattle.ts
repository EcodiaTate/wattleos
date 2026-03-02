// src/lib/docs/ask-wattle.ts
//
// ============================================================
// WattleOS V2 - Ask Wattle Chat Engine
// ============================================================
// The orchestrator that makes Wattle feel like a real person
// who deeply knows the platform, not a chatbot regurgitating
// documentation.
//
// Pipeline per message:
//   1. Load conversation history (if continuing)
//   2. Semantic search for relevant doc chunks
//   3. Build context-rich prompt with personality
//   4. Stream response from GPT-4o
//   5. Persist the exchange to conversation history
//
// WHY streaming: Waiting 3-5 seconds for a full response makes
// chat feel dead. Streaming token-by-token makes Wattle feel
// alive and responsive - like someone typing back to you.
//
// WHY conversation persistence: Follow-up questions are where
// the real value lives. "How do I mark attendance?" → "What if
// the student arrived late?" → "Can I bulk-mark the whole class?"
// Without history, each question starts from zero context.
//
// WHY the system prompt is 80% of the magic: The difference
// between "helpful chatbot" and "trusted colleague" is entirely
// in the personality instructions. Wattle should feel like the
// experienced coordinator who's been at the school for years
// and genuinely wants to help you succeed.
// ============================================================

"use server";

import { getTenantContext } from "@/lib/auth/tenant-context";
import { searchDocs } from "@/lib/docs/search";
import {
  buildActionPromptBlock,
  getAvailableActions,
  validateActionSuggestions,
} from "@/lib/docs/wattle-actions";
import {
  buildToolsForOpenAI,
  executeWattleTool,
  getToolStatusMessage,
  isExecutableTool,
  isHighlightTool,
} from "@/lib/docs/wattle-tools";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  AskWattleRequest,
  MessageSource,
  WattleActionSuggestion,
} from "@/types/ask-wattle";
import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

// ============================================================
// Configuration
// ============================================================

// WHY gpt-4o: Cost-effective, fast, and more than capable for
// a documentation-grounded assistant. No need for o1/o3 reasoning
// overhead when we're doing RAG-based Q&A.
const OPENAI_MODEL = "gpt-4o";
const MAX_HISTORY_MESSAGES = 20; // Keep conversation context manageable
const MAX_RESPONSE_TOKENS = 1500;

// ============================================================
// The Personality (this is what makes Wattle feel real)
// ============================================================

const WATTLE_BASE_PROMPT = `You are Wattle, the built-in assistant for WattleOS - a school management platform designed for Montessori schools in Australia.

## Who you are

You're the equivalent of a warm, experienced school coordinator who has been using WattleOS since day one. You know every screen, every shortcut, every workflow. You're patient, encouraging, and you genuinely care about making people's work lives easier. You understand that the people asking you questions are busy educators and parents - not tech people - and every second you save them is a second they can spend with children.

## How you speak

- **Warm but concise.** You're friendly without being performative. No "Great question!" or "I'd be happy to help!" filler. Just get to the answer with warmth baked into the language itself.
- **Specific and actionable.** Never say "go to settings." Say "Head to Admin → School Settings → Attendance, and you'll see the 'Late threshold' option about halfway down."
- **Anticipate the follow-up.** If someone asks how to mark attendance, you know they'll probably want to know about late arrivals and absences too - so you offer that naturally, not as an information dump.
- **Use plain Australian English.** "Roll call" not "attendance taking." "Term" not "semester." "Enrolment" (with one L) when writing naturally, though the system uses "enrollment" in URLs.
- **Acknowledge the real context.** If someone's asking about a workaround, you empathise with the frustration before giving the solution. Teachers are busy. Parents are anxious. Admins are overwhelmed. You get it.

## How you structure answers

1. **Lead with the action.** If there's something you can do for them (navigate, create, etc.), do it. Don't describe manual steps when you can offer a direct action. Instead of "Head to Admin → Attendance and click...", say the answer briefly and attach the action button to take them there.
2. **Be direct, not instructional.** You're an assistant that *does things*, not a manual that *describes things*. If someone asks "How do I take roll call?", don't give them 4 numbered steps - give a one-liner answer and the action to go straight there.
3. **Then the context.** If there's a "why" or a useful related feature, mention it briefly after the action.
4. **Source transparency.** When your answer draws from specific documentation, mention it naturally: "There's a full guide on this in the Attendance docs if you want the details."
5. **Keep text short when actions speak louder.** If the answer is "go to X and do Y", your text should be 1-2 sentences max, with the action card doing the heavy lifting.

## What you can do

### Live Data (read tools)
- **Attendance**: Check class attendance, get who's absent today, view a student's attendance history
- **Students**: Look up students by name, get class rosters, view enrollment status
- **Classes**: List all classes with student counts
- **Observations**: View a student's recent observations with content previews and outcomes
- **Mastery**: Get a student's mastery progress summary (outcomes mastered/practicing/presented)
- **Daily overview**: Get a full daily summary (attendance completion, events, announcements, pending timesheets)
- **Events & announcements**: Check upcoming events and recent announcements
- **Programs (OSHC)**: Check program session status - bookings, check-ins, check-outs, no-shows
- **Timesheets**: Check the user's own timesheet status for the current pay period

### Actions (write tools)
- **Mark attendance**: Mark a single student as present, absent, late, excused, or half-day
- **Bulk attendance**: Mark ALL students in a class with the same status (requires confirmation)
- **OSHC check-in/out**: Check a student in or out of a before/after school care session
- **Log time**: Log a time entry for the user's own timesheet

### Safety-critical data
- **Medical info**: Look up a student's medical conditions, allergies, action plans, and medications. Access is **logged for compliance**. Only use when explicitly asked. Present clearly - life-threatening conditions first.
- **Emergency contacts**: Look up a student's emergency contacts with phone numbers. Access is **logged**.
- **Custody restrictions**: Look up a student's custody/pickup restrictions. Access is **logged**. These are CRITICAL SAFETY data - always present prominently and clearly. Never summarise or downplay restrictions.

### Navigation & creation
- **Navigate the user anywhere** in WattleOS via action buttons
- **Create things** - open "new observation", "new announcement" etc. via action buttons
- **Answer questions** using WattleOS documentation, cited naturally

### Context awareness
- **Know the date and time** - "today's roll call", "this week's timesheets"
- **Know the user** - their name, role, school, and current page
- **Disambiguation** - when a name matches multiple students, show options for the user to pick

## What you can't do (yet)

- **You can't create observations, reports, or announcements directly.** Take them to the right page.
- **You can't change settings** or modify system configuration. Take them to Admin Settings.
- **You can't edit or delete existing records** (except via undo on actions you just performed).
- **You can't make up features.** If you're not sure whether something exists, say so.

## When to use your tools vs when to use actions

- If the user asks a QUESTION about live data ("Did I take roll call?", "What class is Felix in?", "Who's absent today?", "What's on today?") → **use your tools** to check and answer with real data.
- If the user asks to DO something you have a tool for ("Mark Felix as present", "Check in Mia to After School Care", "Log my hours") → **use your tool** to do it directly.
- If the user asks to DO something you don't have a tool for ("Create an observation") → **use an action button** to take them there.
- If the user asks HOW to do something ("How do I take roll call?") → give a brief answer AND an action button.
- Always prefer doing things for them over describing steps.
- When handling sensitive data (medical, custody, emergency contacts), summarise key points in your response but rely on the visual card to show full details. Never repeat sensitive data verbatim in prose.

## Personality boundaries

- Don't give generic advice. Everything is specific to WattleOS.
- Don't overwhelm. Simple question = simple answer.
- Don't say "I'm just an AI" or similar deflections. You're Wattle.
- Don't use emoji unless they do first.`;

// ============================================================
// Dynamic System Prompt Builder
// ============================================================
// WHY dynamic: The prompt now injects user-specific context
// (name, role, tenant, available actions) so GPT-4o can
// personalise answers and suggest only permitted actions.

interface WattlePromptContext {
  userName?: string;
  userRole?: "guide" | "parent" | "admin" | "staff";
  tenantName?: string;
  currentRoute?: string;
  permissions: string[];
  /** Compressed manifest of visible UI elements for glow guidance */
  uiManifest?: string;
}

function buildWattleSystemPrompt(ctx: WattlePromptContext): string {
  const parts: string[] = [WATTLE_BASE_PROMPT];

  // User context block - includes real-time info the LLM can't know
  const contextLines: string[] = [];

  // Current date/time - so Wattle can answer "what day is it?" and
  // contextualise actions like "today's roll call"
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Australia/Sydney",
  });
  const timeStr = now.toLocaleTimeString("en-AU", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Australia/Sydney",
  });
  contextLines.push(
    `Today is ${dateStr} and the current time is ${timeStr} (AEST).`,
  );

  if (ctx.userName && ctx.tenantName) {
    contextLines.push(
      `You're speaking with ${ctx.userName}, who is a ${ctx.userRole ?? "user"} at ${ctx.tenantName}.`,
    );
  } else if (ctx.userName) {
    contextLines.push(`You're speaking with ${ctx.userName}.`);
  }
  if (ctx.userRole) {
    contextLines.push(
      `Their role is: ${ctx.userRole}. Tailor your language and detail level accordingly.`,
    );
  }
  if (ctx.currentRoute) {
    contextLines.push(`They are currently on the ${ctx.currentRoute} page.`);
  }

  if (contextLines.length > 0) {
    parts.push(
      `## Your context for this conversation\n\n${contextLines.join(" ")}`,
    );
  }

  // Available actions block
  const availableActions = getAvailableActions(ctx.permissions, ctx.userRole);
  if (availableActions.length > 0) {
    const actionBlock = buildActionPromptBlock(availableActions);
    parts.push(`## Actions you can take

You can take real actions for the user by calling the suggest_actions function. These appear as clickable buttons that navigate them directly. Always use actions from this list - these are the ones the user has access to:

${actionBlock}

Rules for actions:
- **ALWAYS suggest an action when one is relevant.** If the question involves any feature, page, or workflow - attach an action. This is your superpower.
- **Actions first, explanations second.** Your text should be 1-2 sentences max when an action does the heavy lifting.
- **Maximum 3 actions per response.**
- **Make labels specific and contextual.** Use the date, the user's name, and what they asked to craft labels like "Take Monday's roll call" or "Record a new observation". Never use generic labels like "Go to Attendance".
- **When you can't do something, offer the nearest action.** If they ask "mark Felix as present" - you can't do that, but you CAN take them to Attendance. Say so and attach the action.

## Examples of great responses

User: "How do I take roll call?"
Text: "Head to Attendance, pick your class, and mark each child off - it only takes a minute."
Action: suggest_actions([{action_id: "nav_attendance", label: "Take today's roll call"}])

User: "Did I do roll call yesterday?"
→ Call check_attendance(class_name: relevant class, date: yesterday's date)
→ Then answer with real data: "Yesterday's roll call for Banksia is complete - 15 present, 2 absent."

User: "Mark Felix as present"
→ Call mark_attendance(student_name: "Felix", status: "present")
→ Then confirm: "Done - Felix is marked present for today."

User: "What class is Felix in?"
→ Call lookup_student(name: "Felix")
→ Then answer with real data: "Felix Johanson is enrolled in Banksia."

User: "I need to write an observation for a student"
Text: "Let's get that captured."
Action: suggest_actions([{action_id: "create_observation", label: "Record a new observation"}])`);
  }

  // UI manifest for glow guidance
  if (ctx.uiManifest) {
    parts.push(`## Current screen elements (UI manifest)

The user's screen currently shows these interactive elements. You can highlight any of them using the highlight_ui_elements tool to visually guide the user:

${ctx.uiManifest}

Rules for highlighting:
- Only highlight elements listed in the manifest above - never invent IDs.
- Use step numbers (1, 2, 3) for multi-step workflows so the user sees one step at a time.
- Keep labels brief (2-5 words): "Tap here", "Pick a class", "Select status".
- Use "glow" for drawing attention, "pulse" for the next action to take.
- When answering "how do I...?" questions on a page with relevant elements, ALWAYS use highlight_ui_elements to show them where to go visually.
- If the user is on a different page than where the workflow happens, navigate them first with an action button - then highlight on their next question.
- You can combine highlights with text: give a brief explanation AND highlight the elements.`);
  }

  return parts.join("\n\n");
}

// ============================================================
// OpenAI Tool Definitions
// ============================================================
// Tool definitions (including suggest_actions + executable database
// tools) are centralised in wattle-tools.ts. buildToolsForOpenAI()
// returns the filtered array based on user permissions.
//
// Multi-turn architecture: GPT-4o may call executable tools
// (check_attendance, mark_attendance, etc.) which require a
// follow-up API call with the tool result. The streaming loop
// in buildAskWattleStream handles this automatically.

const MAX_TOOL_ROUNDS = 3; // Safety limit for tool execution loops

// ============================================================
// Build the RAG-enhanced messages array
// ============================================================

interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

function buildContextBlock(
  chunks: Array<{
    content: string;
    heading: string | null;
    source_title: string;
    source_slug: string;
  }>,
  sources: MessageSource[],
): string {
  if (chunks.length === 0) {
    return "No relevant documentation found for this specific question. Answer based on your general knowledge of the WattleOS platform, and let the user know if you're unsure about specifics.";
  }

  const contextParts = chunks.map((chunk, i) => {
    const heading = chunk.heading ? ` > ${chunk.heading}` : "";
    return `[Doc ${i + 1}: ${chunk.source_title}${heading}]\n${chunk.content}`;
  });

  const sourceList = sources
    .map((s) => `- "${s.title}" (/docs/${s.slug})`)
    .join("\n");

  return `## Relevant Documentation

${contextParts.join("\n\n---\n\n")}

## Available Sources
${sourceList}

Use the documentation above to answer the user's question. Cite sources naturally when helpful (e.g., "The Attendance guide covers this in detail"). If the docs partially answer the question, say what you know and be clear about what's not covered.`;
}

// ============================================================
// Conversation History Management
// ============================================================

async function loadConversationHistory(
  conversationId: string,
): Promise<ConversationMessage[]> {
  const supabase = await createSupabaseServerClient();

  const { data: messages, error } = await supabase
    .from("ask_wattle_messages")
    .select("role, content")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(MAX_HISTORY_MESSAGES);

  if (error || !messages) return [];

  return messages.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));
}

async function getOrCreateConversation(
  conversationId: string | undefined,
  userId: string,
  tenantId: string | null,
  firstMessage: string,
): Promise<string> {
  const supabase = await createSupabaseServerClient();

  if (conversationId) {
    // Verify it exists and belongs to this user
    const { data } = await supabase
      .from("ask_wattle_conversations")
      .select("id")
      .eq("id", conversationId)
      .eq("user_id", userId)
      .single();

    if (data) return data.id;
  }

  // Create new conversation
  // Title is first ~60 chars of the first message
  const title =
    firstMessage.length > 60 ? firstMessage.slice(0, 57) + "..." : firstMessage;

  const { data, error } = await supabase
    .from("ask_wattle_conversations")
    .insert({
      user_id: userId,
      tenant_id: tenantId,
      title,
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(`Failed to create conversation: ${error?.message}`);
  }

  return data.id;
}

async function persistMessage(
  conversationId: string,
  role: "user" | "assistant",
  content: string,
  sources: MessageSource[] = [],
): Promise<void> {
  const supabase = await createSupabaseServerClient();

  await supabase.from("ask_wattle_messages").insert({
    conversation_id: conversationId,
    role,
    content,
    sources: sources.length > 0 ? sources : [],
  });
}

// ============================================================
// OpenAI Client (singleton)
// ============================================================
// WHY singleton: Avoids re-creating the HTTP client on every
// request. The OpenAI SDK handles connection pooling internally.

function getOpenAIClient(): OpenAI {
  return new OpenAI();
}

// ============================================================
// The Main Chat Function (non-streaming, for Server Actions)
// ============================================================

export interface AskWattleResponse {
  message: string;
  sources: MessageSource[];
  actions: WattleActionSuggestion[];
  conversation_id: string;
}

export async function askWattle(
  input: AskWattleRequest,
): Promise<{ data: AskWattleResponse | null; error: string | null }> {
  try {
    // 1. Get user context
    const context = await getTenantContext();
    const userId = context.user.id;
    const tenantId = context.tenant.id;
    const permissions = context.permissions ?? [];

    // 2. Get or create conversation
    const conversationId = await getOrCreateConversation(
      input.conversation_id,
      userId,
      tenantId,
      input.message,
    );

    // 3. Load conversation history
    const history = input.conversation_id
      ? await loadConversationHistory(conversationId)
      : [];

    // 4. Semantic search for relevant docs
    const searchResult = await searchDocs({
      query: input.message,
      boost_category: inferCategoryFromRoute(input.current_route),
      max_results: 6,
    });

    const chunks = searchResult.data?.results ?? [];
    const sources = searchResult.data?.sources ?? [];

    // 5. Build the context block
    const contextBlock = buildContextBlock(
      chunks.map((c) => ({
        content: c.content,
        heading: c.heading,
        source_title: c.source_title,
        source_slug: c.source_slug,
      })),
      sources,
    );

    // 6. Build messages array with dynamic system prompt
    const systemPrompt = buildWattleSystemPrompt({
      userName: input.user_name,
      userRole: input.user_role,
      tenantName: input.tenant_name,
      currentRoute: input.current_route,
      permissions,
    });

    const messages: ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      ...history.map(
        (m): ChatCompletionMessageParam => ({
          role: m.role,
          content: m.content,
        }),
      ),
      {
        role: "user",
        content: `${contextBlock}\n\n---\n\nUser question: ${input.message}`,
      },
    ];

    // 7. Call GPT-4o with tools (dynamic based on permissions)
    const openai = getOpenAIClient();
    const tools = buildToolsForOpenAI(permissions, input.user_role);

    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      max_tokens: MAX_RESPONSE_TOKENS,
      messages,
      tools,
      tool_choice: "auto",
    });

    const choice = response.choices[0];
    const assistantMessage = choice?.message?.content ?? "";

    // 8. Extract and validate action suggestions from tool calls
    let actions: WattleActionSuggestion[] = [];
    const toolCalls = choice?.message?.tool_calls;
    if (toolCalls) {
      for (const toolCall of toolCalls) {
        if (
          toolCall.type === "function" &&
          toolCall.function.name === "suggest_actions"
        ) {
          try {
            const parsed = JSON.parse(toolCall.function.arguments) as {
              actions: WattleActionSuggestion[];
            };
            actions = validateActionSuggestions(
              parsed.actions,
              permissions,
              input.user_role,
            );
          } catch {
            // Malformed tool call - skip actions
          }
        }
      }
    }

    // 9. Persist both messages
    await persistMessage(conversationId, "user", input.message);
    await persistMessage(
      conversationId,
      "assistant",
      assistantMessage,
      sources,
    );

    return {
      data: {
        message: assistantMessage,
        sources,
        actions,
        conversation_id: conversationId,
      },
      error: null,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Ask Wattle failed";
    console.error("[ask-wattle]", message);
    return { data: null, error: message };
  }
}

// ============================================================
// Streaming Endpoint Helper (for the API route)
// ============================================================
// This builds the same pipeline but returns a ReadableStream
// for the /api/ask-wattle route to use with streaming responses.

export async function buildAskWattleStream(
  input: AskWattleRequest,
  userId: string,
  tenantId: string | null,
  permissions: string[],
): Promise<{
  stream: ReadableStream<Uint8Array>;
  conversationId: string;
  sources: MessageSource[];
}> {
  // 1. Get or create conversation
  const conversationId = await getOrCreateConversation(
    input.conversation_id,
    userId,
    tenantId,
    input.message,
  );

  // 2. Load history
  const history = input.conversation_id
    ? await loadConversationHistory(conversationId)
    : [];

  // 3. Search docs
  const searchResult = await searchDocs({
    query: input.message,
    boost_category: inferCategoryFromRoute(input.current_route),
    max_results: 6,
  });

  const chunks = searchResult.data?.results ?? [];
  const sources = searchResult.data?.sources ?? [];

  // 4. Build context with dynamic system prompt
  const contextBlock = buildContextBlock(
    chunks.map((c) => ({
      content: c.content,
      heading: c.heading,
      source_title: c.source_title,
      source_slug: c.source_slug,
    })),
    sources,
  );

  const systemPrompt = buildWattleSystemPrompt({
    userName: input.user_name,
    userRole: input.user_role,
    tenantName: input.tenant_name,
    currentRoute: input.current_route,
    permissions,
    uiManifest: input.ui_manifest,
  });

  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...history.map(
      (m): ChatCompletionMessageParam => ({
        role: m.role,
        content: m.content,
      }),
    ),
    {
      role: "user",
      content: `${contextBlock}\n\n---\n\nUser question: ${input.message}`,
    },
  ];

  // 5. Persist user message immediately
  await persistMessage(conversationId, "user", input.message);

  // 6. Create streaming response with multi-turn tool execution
  // Architecture: GPT-4o may call executable tools (check_attendance,
  // mark_attendance, etc.) which require executing the tool and
  // feeding the result back in a follow-up API call. The loop
  // handles up to MAX_TOOL_ROUNDS of tool execution before the
  // final text response streams to the client.
  const openai = getOpenAIClient();
  const encoder = new TextEncoder();
  const tools = buildToolsForOpenAI(permissions, input.user_role);

  // Create Supabase client NOW, before the stream starts.
  // WHY: createSupabaseServerClient() calls cookies() which uses
  // AsyncLocalStorage. Inside ReadableStream.start() the async
  // context is lost → cookies() returns empty → RLS blocks all
  // queries. Creating the client here captures the JWT while the
  // request context is still alive.
  const toolSupabase = await createSupabaseServerClient();

  // Tool execution context for database queries
  const toolCtx = { supabase: toolSupabase, userId, tenantId, permissions };

  let fullResponse = "";

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      // Helper to emit an SSE event
      const emit = (data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        // Send sources and conversation_id first
        emit({ type: "sources", sources });
        emit({ type: "conversation_id", conversation_id: conversationId });

        // The messages array grows across tool execution rounds.
        // GPT sees tool results in follow-up calls.
        const liveMessages: ChatCompletionMessageParam[] = [...messages];

        // Buffered suggest_actions calls - processed after the final round
        let bufferedSuggestActionsArgs = "";

        let round = 0;
        while (round < MAX_TOOL_ROUNDS) {
          round++;

          // Reset per-round accumulators
          let roundText = "";
          // Map of tool_call index → accumulated fragments
          // GPT-4o interleaves deltas for parallel tool calls by index
          const toolCallAccumulator = new Map<
            number,
            { id: string; name: string; arguments: string }
          >();

          // Stream this round from GPT-4o
          const openaiStream = await openai.chat.completions.create({
            model: OPENAI_MODEL,
            max_tokens: MAX_RESPONSE_TOKENS,
            messages: liveMessages,
            tools,
            tool_choice: "auto",
            stream: true,
          });

          for await (const chunk of openaiStream) {
            const choice = chunk.choices[0];
            if (!choice) continue;

            // Stream text content to client in real-time
            const contentDelta = choice.delta?.content;
            if (contentDelta) {
              roundText += contentDelta;
              fullResponse += contentDelta;
              emit({ type: "text", content: contentDelta });
            }

            // Accumulate tool call fragments (indexed for parallel calls)
            const toolCallDeltas = choice.delta?.tool_calls;
            if (toolCallDeltas) {
              for (const tc of toolCallDeltas) {
                if (!toolCallAccumulator.has(tc.index)) {
                  toolCallAccumulator.set(tc.index, {
                    id: tc.id ?? "",
                    name: tc.function?.name ?? "",
                    arguments: "",
                  });
                }
                const entry = toolCallAccumulator.get(tc.index)!;
                if (tc.id) entry.id = tc.id;
                if (tc.function?.name) entry.name = tc.function.name;
                if (tc.function?.arguments)
                  entry.arguments += tc.function.arguments;
              }
            }
          }

          // Classify accumulated tool calls
          const allToolCalls = Array.from(toolCallAccumulator.values());
          const executableCalls = allToolCalls.filter((tc) =>
            isExecutableTool(tc.name),
          );
          const suggestionCalls = allToolCalls.filter(
            (tc) => tc.name === "suggest_actions",
          );

          // Buffer suggest_actions for later (don't send back to GPT)
          if (suggestionCalls.length > 0) {
            bufferedSuggestActionsArgs = suggestionCalls[0].arguments;
          }

          // If no executable tools → this is the final round
          if (executableCalls.length === 0) {
            break;
          }

          // ── Execute tools ─────────────────────────────────
          // Show status to the user for each tool
          for (const tc of executableCalls) {
            emit({
              type: "status",
              status_message: getToolStatusMessage(tc.name),
            });
          }

          // Execute all tools (parallel)
          const toolResults = await Promise.all(
            executableCalls.map((tc) =>
              executeWattleTool(tc.id, tc.name, tc.arguments, toolCtx),
            ),
          );

          // Emit structured tool results to the frontend (parallel channel)
          // GPT gets the string `content`; the client gets typed `structured` data
          for (const result of toolResults) {
            if (result.structured) {
              // Highlight tool results go on a dedicated "highlight" channel
              // so the frontend can activate the glow overlay directly
              if (
                isHighlightTool(result.tool_name) &&
                result.structured.type === "highlight_directive"
              ) {
                emit({
                  type: "highlight",
                  highlights: result.structured.data.highlights,
                  workflow_title: result.structured.data.workflow_title,
                  highlight_total_steps: result.structured.data.total_steps,
                });
              } else {
                emit({
                  type: "tool_result",
                  tool_result: {
                    tool_call_id: result.tool_call_id,
                    tool_name: result.tool_name,
                    success: result.success,
                    structured: result.structured,
                    revert: result.revert,
                  },
                });
              }
            }
          }

          // Build the assistant message with tool_calls for the next round
          const assistantToolCalls = allToolCalls.map((tc) => ({
            id: tc.id,
            type: "function" as const,
            function: { name: tc.name, arguments: tc.arguments },
          }));

          liveMessages.push({
            role: "assistant",
            content: roundText || null,
            tool_calls: assistantToolCalls,
          });

          // Add tool result messages
          for (const result of toolResults) {
            liveMessages.push({
              role: "tool",
              tool_call_id: result.tool_call_id,
              content: result.content,
            });
          }

          // Also add dummy results for suggestion tool calls (OpenAI requires
          // a tool result message for every tool_call in the assistant message)
          for (const sc of suggestionCalls) {
            liveMessages.push({
              role: "tool",
              tool_call_id: sc.id,
              content: "Actions suggested to user.",
            });
          }

          // Clear status - GPT will now generate the final response
          emit({ type: "status", status_message: "" });

          // Continue loop → next OpenAI call with tool results
        }

        // ── Process buffered suggest_actions ─────────────────
        if (bufferedSuggestActionsArgs) {
          try {
            const parsed = JSON.parse(bufferedSuggestActionsArgs) as {
              actions: WattleActionSuggestion[];
            };
            const validatedActions = validateActionSuggestions(
              parsed.actions,
              permissions,
              input.user_role,
            );
            if (validatedActions.length > 0) {
              emit({ type: "actions", actions: validatedActions });
            }
          } catch {
            // Malformed suggest_actions JSON - skip silently
          }
        }

        // Persist the final assistant message
        await persistMessage(
          conversationId,
          "assistant",
          fullResponse,
          sources,
        );

        // Signal completion
        emit({ type: "done" });
        controller.close();
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Stream error";
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "error", error: errorMessage })}\n\n`,
          ),
        );
        controller.close();
      }
    },
  });

  return { stream, conversationId, sources };
}

// ============================================================
// Route → Category Mapping
// ============================================================

function inferCategoryFromRoute(route: string | undefined): string | undefined {
  if (!route) return undefined;

  const routeCategoryMap: Record<string, string> = {
    "/attendance": "attendance",
    "/pedagogy/observations": "observations",
    "/pedagogy/curriculum": "curriculum",
    "/pedagogy/portfolios": "mastery",
    "/students": "admin",
    "/reports": "reports",
    "/comms": "communications",
    "/admin/billing": "billing",
    "/admin/integrations": "billing",
    "/admin/programs": "programs",
    "/admin/enrollment": "enrollment",
    "/parent": "parent-portal",
  };

  for (const [path, category] of Object.entries(routeCategoryMap)) {
    if (route.startsWith(path)) return category;
  }

  return undefined;
}

// ============================================================
// Feedback Action
// ============================================================

export async function submitWattleFeedback(
  messageId: string,
  feedback: "helpful" | "not_helpful",
): Promise<{ data: boolean | null; error: string | null }> {
  try {
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase
      .from("ask_wattle_messages")
      .update({ feedback })
      .eq("id", messageId);

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: true, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Feedback failed";
    return { data: null, error: message };
  }
}
