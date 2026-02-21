'use server';

// src/lib/actions/comms/messaging.ts
//
// ============================================================
// WattleOS V2 - Messaging Server Actions
// ============================================================
// Thread-based messaging between staff and parents.
// Two thread types:
// • class_broadcast - guide sends to all parents of a class
// • direct - 1:1 between staff and parent
//
// WHY thread model: Groups replies into conversations. A class
// broadcast creates one thread; parents reply within it.
// Direct messages keep 1:1 history clean.
// ============================================================

"use server";

import { getTenantContext, requirePermission } from "@/lib/auth/tenant-context";
import type { MessageThreadType } from "@/lib/constants/communications";
import { Permissions } from "@/lib/constants/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ActionResponse, ErrorCodes, failure, success } from "@/types/api";
import type {
  Class,
  Message,
  MessageRecipient,
  MessageThread,
  MessageThreadWithPreview,
  MessageWithSender,
  User,
} from "@/types/domain";

// ============================================================
// Input Types
// ============================================================

export interface CreateClassBroadcastInput {
  class_id: string;
  subject: string;
  initial_message: string;
}

export interface CreateDirectMessageInput {
  recipient_user_id: string;
  subject?: string;
  initial_message: string;
}

export interface SendMessageInput {
  thread_id: string;
  content: string;
}

// ============================================================
// CREATE CLASS BROADCAST THREAD
// ============================================================
// Permission: SEND_CLASS_MESSAGES
// Creates a thread, sends the first message, and populates
// recipients from all guardians of students enrolled in the
// class, plus the sender.
// ============================================================

export async function createClassBroadcast(
  input: CreateClassBroadcastInput,
): Promise<ActionResponse<MessageThread>> {
  try {
    const context = await requirePermission(Permissions.SEND_CLASS_MESSAGES);
    const supabase = await createSupabaseServerClient();

    if (!input.subject?.trim()) {
      return failure("Subject is required", ErrorCodes.VALIDATION_ERROR);
    }
    if (!input.initial_message.trim()) {
      return failure(
        "Message content is required",
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    // 1. Create the thread
    const { data: thread, error: threadError } = await supabase
      .from("message_threads")
      .insert({
        tenant_id: context.tenant.id,
        subject: input.subject.trim(),
        thread_type: "class_broadcast" as MessageThreadType,
        class_id: input.class_id,
        created_by: context.user.id,
      })
      .select()
      .single();

    if (threadError || !thread) {
      return failure(
        threadError?.message ?? "Failed to create thread",
        ErrorCodes.CREATE_FAILED,
      );
    }

    const threadData = thread as MessageThread;

    // 2. Send the initial message
    const { error: msgError } = await supabase.from("messages").insert({
      tenant_id: context.tenant.id,
      thread_id: threadData.id,
      sender_id: context.user.id,
      content: input.initial_message.trim(),
      sent_at: new Date().toISOString(),
    });

    if (msgError) {
      // Rollback thread creation
      await supabase.from("message_threads").delete().eq("id", threadData.id);
      return failure(msgError.message, ErrorCodes.CREATE_FAILED);
    }

    // 3. Populate recipients: all guardians of enrolled students + sender
    const { data: enrollments } = await supabase
      .from("enrollments")
      .select("student_id")
      .eq("class_id", input.class_id)
      .eq("status", "active")
      .is("deleted_at", null);

    const studentIds = (enrollments ?? []).map(
      (e) => (e as { student_id: string }).student_id,
    );

    let guardianUserIds: string[] = [];
    if (studentIds.length > 0) {
      const { data: guardians } = await supabase
        .from("guardians")
        .select("user_id")
        .in("student_id", studentIds)
        .is("deleted_at", null);

      guardianUserIds = [
        ...new Set(
          (guardians ?? []).map((g) => (g as { user_id: string }).user_id),
        ),
      ];
    }

    // Add the sender (guide) as a recipient too so they see it in their inbox
    const allRecipientIds = [...new Set([context.user.id, ...guardianUserIds])];

    if (allRecipientIds.length > 0) {
      const recipientRows = allRecipientIds.map((userId) => ({
        tenant_id: context.tenant.id,
        thread_id: threadData.id,
        user_id: userId,
        // Sender's own receipt is pre-read
        read_at: userId === context.user.id ? new Date().toISOString() : null,
      }));

      await supabase.from("message_recipients").insert(recipientRows);
    }

    return success(threadData);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to create broadcast";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// CREATE DIRECT MESSAGE THREAD
// ============================================================
// Permission: SEND_CLASS_MESSAGES (staff) or any authenticated
// user replying to an existing thread. For new threads, only
// staff can initiate.
// ============================================================

export async function createDirectMessage(
  input: CreateDirectMessageInput,
): Promise<ActionResponse<MessageThread>> {
  try {
    const context = await requirePermission(Permissions.SEND_CLASS_MESSAGES);
    const supabase = await createSupabaseServerClient();

    if (!input.initial_message.trim()) {
      return failure(
        "Message content is required",
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    // Check if a direct thread already exists between these two users
    const { data: existingThreads } = await supabase
      .from("message_threads")
      .select(
        `
        id,
        message_recipients!inner(user_id)
      `,
      )
      .eq("thread_type", "direct")
      .eq("created_by", context.user.id)
      .is("deleted_at", null);

    const existingThread = (
      (existingThreads ?? []) as Array<Record<string, unknown>>
    ).find((t) => {
      const recipients = t.message_recipients as Array<{ user_id: string }>;
      return recipients.some((r) => r.user_id === input.recipient_user_id);
    });

    if (existingThread) {
      // Thread already exists - just send a message to it
      const sendResult = await sendMessage({
        thread_id: existingThread.id as string,
        content: input.initial_message,
      });

      if (sendResult.error) {
        return failure(sendResult.error.message, sendResult.error.code);
      }

      // Return the existing thread
      const { data: threadData } = await supabase
        .from("message_threads")
        .select()
        .eq("id", existingThread.id as string)
        .single();

      return success(threadData as MessageThread);
    }

    // 1. Create new thread
    const { data: thread, error: threadError } = await supabase
      .from("message_threads")
      .insert({
        tenant_id: context.tenant.id,
        subject: input.subject?.trim() || null,
        thread_type: "direct" as MessageThreadType,
        class_id: null,
        created_by: context.user.id,
      })
      .select()
      .single();

    if (threadError || !thread) {
      return failure(
        threadError?.message ?? "Failed to create thread",
        ErrorCodes.CREATE_FAILED,
      );
    }

    const threadData = thread as MessageThread;

    // 2. Send the initial message
    const { error: msgError } = await supabase.from("messages").insert({
      tenant_id: context.tenant.id,
      thread_id: threadData.id,
      sender_id: context.user.id,
      content: input.initial_message.trim(),
      sent_at: new Date().toISOString(),
    });

    if (msgError) {
      await supabase.from("message_threads").delete().eq("id", threadData.id);
      return failure(msgError.message, ErrorCodes.CREATE_FAILED);
    }

    // 3. Add both participants as recipients
    const recipientRows = [
      {
        tenant_id: context.tenant.id,
        thread_id: threadData.id,
        user_id: context.user.id,
        read_at: new Date().toISOString(), // Sender has read their own message
      },
      {
        tenant_id: context.tenant.id,
        thread_id: threadData.id,
        user_id: input.recipient_user_id,
        read_at: null,
      },
    ];

    await supabase.from("message_recipients").insert(recipientRows);

    return success(threadData);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to create direct message";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// SEND MESSAGE (reply to existing thread)
// ============================================================
// Any thread participant can reply. Bumps the thread's
// updated_at. Resets read_at for all OTHER recipients
// so they see the thread as unread again.
// ============================================================

export async function sendMessage(
  input: SendMessageInput,
): Promise<ActionResponse<Message>> {
  try {
    const context = await getTenantContext();
    const supabase = await createSupabaseServerClient();

    if (!input.content.trim()) {
      return failure(
        "Message content is required",
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    // Verify the sender is a recipient of this thread
    const { data: recipientCheck } = await supabase
      .from("message_recipients")
      .select("id")
      .eq("thread_id", input.thread_id)
      .eq("user_id", context.user.id)
      .single();

    if (!recipientCheck) {
      // Check if they have messaging permission (staff can message any thread)
      if (!context.permissions.includes(Permissions.SEND_CLASS_MESSAGES)) {
        return failure(
          "You are not a participant in this thread",
          ErrorCodes.FORBIDDEN,
        );
      }
    }

    // 1. Insert the message
    const { data: message, error: msgError } = await supabase
      .from("messages")
      .insert({
        tenant_id: context.tenant.id,
        thread_id: input.thread_id,
        sender_id: context.user.id,
        content: input.content.trim(),
        sent_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (msgError) {
      return failure(msgError.message, ErrorCodes.CREATE_FAILED);
    }

    // 2. Bump thread's updated_at (for inbox sorting)
    await supabase
      .from("message_threads")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", input.thread_id);

    // 3. Reset read_at for all OTHER recipients (so they see unread)
    await supabase
      .from("message_recipients")
      .update({ read_at: null })
      .eq("thread_id", input.thread_id)
      .neq("user_id", context.user.id);

    // 4. Mark sender's own receipt as read
    await supabase
      .from("message_recipients")
      .update({ read_at: new Date().toISOString() })
      .eq("thread_id", input.thread_id)
      .eq("user_id", context.user.id);

    return success(message as Message);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to send message";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// GET INBOX (thread list)
// ============================================================
// Returns all threads the current user participates in,
// ordered by most recently updated. Includes preview of
// the latest message and unread count.
// ============================================================

export async function getInbox(
  params: { limit?: number; offset?: number } = {},
): Promise<ActionResponse<MessageThreadWithPreview[]>> {
  try {
    const context = await getTenantContext();
    const supabase = await createSupabaseServerClient();

    const limit = params.limit ?? 30;
    const offset = params.offset ?? 0;

    // Get thread IDs the user is a recipient of
    const { data: recipientData, error: recipientError } = await supabase
      .from("message_recipients")
      .select("thread_id, read_at")
      .eq("user_id", context.user.id);

    if (recipientError) {
      return failure(recipientError.message, ErrorCodes.DATABASE_ERROR);
    }

    const threadReadMap = new Map<string, string | null>();
    for (const r of (recipientData ?? []) as Array<{
      thread_id: string;
      read_at: string | null;
    }>) {
      threadReadMap.set(r.thread_id, r.read_at);
    }

    const threadIds = [...threadReadMap.keys()];

    if (threadIds.length === 0) {
      return success([]);
    }

    // Fetch threads with creator info
    const { data: threads, error: threadError } = await supabase
      .from("message_threads")
      .select(
        `
        *,
        creator:users!message_threads_created_by_fkey(id, first_name, last_name, avatar_url),
        target_class:classes!message_threads_class_id_fkey(id, name)
      `,
      )
      .in("id", threadIds)
      .is("deleted_at", null)
      .order("updated_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (threadError) {
      return failure(threadError.message, ErrorCodes.DATABASE_ERROR);
    }

    // For each thread, get the latest message and unread count
    const enrichedThreads: MessageThreadWithPreview[] = [];

    for (const thread of (threads ?? []) as Array<Record<string, unknown>>) {
      const threadId = thread.id as string;

      // Latest message
      const { data: lastMessages } = await supabase
        .from("messages")
        .select(
          `
          id, content, sent_at, sender_id,
          sender:users!messages_sender_id_fkey(id, first_name, last_name)
        `,
        )
        .eq("thread_id", threadId)
        .is("deleted_at", null)
        .order("sent_at", { ascending: false })
        .limit(1);

      const lastMsg = (lastMessages ?? [])[0] as
        | Record<string, unknown>
        | undefined;

      // Recipient count
      const { count: recipientCount } = await supabase
        .from("message_recipients")
        .select("id", { count: "exact", head: true })
        .eq("thread_id", threadId);

      // Unread count for current user: count messages sent AFTER their read_at
      const userReadAt = threadReadMap.get(threadId);
      let unreadCount = 0;

      if (!userReadAt) {
        // Never read - all messages are unread (minus own messages)
        const { count } = await supabase
          .from("messages")
          .select("id", { count: "exact", head: true })
          .eq("thread_id", threadId)
          .neq("sender_id", context.user.id)
          .is("deleted_at", null);
        unreadCount = count ?? 0;
      } else {
        // Count messages after last read
        const { count } = await supabase
          .from("messages")
          .select("id", { count: "exact", head: true })
          .eq("thread_id", threadId)
          .neq("sender_id", context.user.id)
          .gt("sent_at", userReadAt)
          .is("deleted_at", null);
        unreadCount = count ?? 0;
      }

      enrichedThreads.push({
        id: threadId,
        tenant_id: thread.tenant_id as string,
        subject: thread.subject as string | null,
        thread_type: thread.thread_type as MessageThreadType,
        class_id: thread.class_id as string | null,
        created_by: thread.created_by as string,
        created_at: thread.created_at as string,
        updated_at: thread.updated_at as string,
        creator: thread.creator as Pick<
          User,
          "id" | "first_name" | "last_name" | "avatar_url"
        >,
        target_class: thread.target_class as Pick<Class, "id" | "name"> | null,
        last_message: lastMsg
          ? {
              id: lastMsg.id as string,
              content: lastMsg.content as string,
              sent_at: lastMsg.sent_at as string,
              sender_id: lastMsg.sender_id as string,
            }
          : null,
        last_message_sender: lastMsg?.sender
          ? (lastMsg.sender as Pick<User, "id" | "first_name" | "last_name">)
          : null,
        unread_count: unreadCount,
        recipient_count: recipientCount ?? 0,
      });
    }

    return success(enrichedThreads);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to get inbox";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// GET THREAD MESSAGES
// ============================================================
// Returns all messages in a thread, ordered chronologically.
// Marks the thread as read for the current user.
// ============================================================

export async function getThreadMessages(
  threadId: string,
): Promise<
  ActionResponse<{
    thread: MessageThread;
    messages: MessageWithSender[];
    recipients: Array<
      Pick<User, "id" | "first_name" | "last_name" | "avatar_url">
    >;
  }>
> {
  try {
    const context = await getTenantContext();
    const supabase = await createSupabaseServerClient();

    // Verify user is a participant (or has staff permission)
    const { data: recipientCheck } = await supabase
      .from("message_recipients")
      .select("id")
      .eq("thread_id", threadId)
      .eq("user_id", context.user.id)
      .single();

    if (
      !recipientCheck &&
      !context.permissions.includes(Permissions.SEND_CLASS_MESSAGES)
    ) {
      return failure(
        "You are not a participant in this thread",
        ErrorCodes.FORBIDDEN,
      );
    }

    // Fetch thread
    const { data: thread, error: threadError } = await supabase
      .from("message_threads")
      .select()
      .eq("id", threadId)
      .is("deleted_at", null)
      .single();

    if (threadError || !thread) {
      return failure("Thread not found", ErrorCodes.NOT_FOUND);
    }

    // Fetch messages
    const { data: messages, error: msgError } = await supabase
      .from("messages")
      .select(
        `
        *,
        sender:users!messages_sender_id_fkey(id, first_name, last_name, avatar_url)
      `,
      )
      .eq("thread_id", threadId)
      .is("deleted_at", null)
      .order("sent_at", { ascending: true });

    if (msgError) {
      return failure(msgError.message, ErrorCodes.DATABASE_ERROR);
    }

    // Fetch recipients with user info
    const { data: recipientRows } = await supabase
      .from("message_recipients")
      .select(
        `
        user:users!message_recipients_user_id_fkey(id, first_name, last_name, avatar_url)
      `,
      )
      .eq("thread_id", threadId);

    const recipients = (
      (recipientRows ?? []) as Array<Record<string, unknown>>
    ).map(
      (r) =>
        r.user as Pick<User, "id" | "first_name" | "last_name" | "avatar_url">,
    );

    // Mark as read for the current user
    await supabase
      .from("message_recipients")
      .update({ read_at: new Date().toISOString() })
      .eq("thread_id", threadId)
      .eq("user_id", context.user.id);

    const typedMessages: MessageWithSender[] = (
      (messages ?? []) as Array<Record<string, unknown>>
    ).map((msg) => ({
      id: msg.id as string,
      tenant_id: msg.tenant_id as string,
      thread_id: msg.thread_id as string,
      sender_id: msg.sender_id as string,
      content: msg.content as string,
      sent_at: msg.sent_at as string,
      created_at: msg.created_at as string,
      sender: msg.sender as Pick<
        User,
        "id" | "first_name" | "last_name" | "avatar_url"
      >,
    }));

    return success({
      thread: thread as MessageThread,
      messages: typedMessages,
      recipients,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to get thread";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// MARK THREAD AS READ
// ============================================================
// Updates the current user's read_at on the message_recipients
// row for this thread.
// ============================================================

export async function markThreadRead(
  threadId: string,
): Promise<ActionResponse<MessageRecipient>> {
  try {
    const context = await getTenantContext();
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("message_recipients")
      .update({ read_at: new Date().toISOString() })
      .eq("thread_id", threadId)
      .eq("user_id", context.user.id)
      .select()
      .single();

    if (error) {
      return failure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    return success(data as MessageRecipient);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to mark as read";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// GET UNREAD MESSAGE COUNT
// ============================================================
// Counts threads with unread messages for the current user.
// Used for sidebar notification badge.
// ============================================================

export async function getUnreadMessageCount(): Promise<ActionResponse<number>> {
  try {
    const context = await getTenantContext();
    const supabase = await createSupabaseServerClient();

    // Get all threads user participates in where read_at is null
    // (meaning they have never read the thread or new messages arrived)
    const { data: unreadRecipients, error } = await supabase
      .from("message_recipients")
      .select("thread_id")
      .eq("user_id", context.user.id)
      .is("read_at", null);

    if (error) {
      return failure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    // For each "unread" thread, verify there are actually messages not from this user
    let unreadCount = 0;
    const threadIds = (unreadRecipients ?? []).map(
      (r) => (r as { thread_id: string }).thread_id,
    );

    if (threadIds.length > 0) {
      // Count threads that have at least one message not from the current user
      for (const threadId of threadIds) {
        const { count } = await supabase
          .from("messages")
          .select("id", { count: "exact", head: true })
          .eq("thread_id", threadId)
          .neq("sender_id", context.user.id)
          .is("deleted_at", null);

        if ((count ?? 0) > 0) {
          unreadCount++;
        }
      }
    }

    return success(unreadCount);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to get unread count";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// DELETE THREAD (soft delete, staff only)
// ============================================================

export async function deleteThread(
  threadId: string,
): Promise<ActionResponse<{ deleted: boolean }>> {
  try {
    await requirePermission(Permissions.SEND_CLASS_MESSAGES);
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase
      .from("message_threads")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", threadId)
      .is("deleted_at", null);

    if (error) {
      return failure(error.message, ErrorCodes.DELETE_FAILED);
    }

    return success({ deleted: true });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to delete thread";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}
