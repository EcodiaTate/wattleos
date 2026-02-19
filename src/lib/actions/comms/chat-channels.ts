// src/lib/actions/comms/chat-channels.ts
//
// ============================================================
// WattleOS V2 - Module 12: Chat Channel Server Actions
// ============================================================
// Manages the new chat_channels / chat_channel_members /
// chat_messages tables from the mega migration. Supports:
//   • class_group - auto-populated from enrollment + guardians
//   • program_group - auto-populated from program bookings
//   • direct - 1:1 between any two tenant members
//   • staff - staff-only channels
//
// WHY channels not threads: Threads (Module 7) were ephemeral
// broadcast-and-reply. Channels are persistent group spaces
// with real-time subscriptions, read cursors, and moderation.
// ============================================================

"use server";

import { getTenantContext, requirePermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ActionResponse, ErrorCodes, failure, success } from "@/types/api";
import type { User } from "@/types/domain";

// ============================================================
// Types
// ============================================================

export type ChannelType = "class_group" | "program_group" | "direct" | "staff";
export type ChannelMemberRole = "owner" | "admin" | "member" | "read_only";
export type ChatMessageType = "text" | "image" | "file" | "system";

export interface ChatChannel {
  id: string;
  tenant_id: string;
  channel_type: ChannelType;
  name: string | null;
  class_id: string | null;
  program_id: string | null;
  created_by: string;
  is_active: boolean;
  allow_parent_posts: boolean;
  is_moderated: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface ChatChannelWithPreview extends ChatChannel {
  member_count: number;
  unread_count: number;
  last_message: {
    id: string;
    content: string;
    sender_name: string;
    created_at: string;
  } | null;
}

export interface ChatChannelMember {
  id: string;
  tenant_id: string;
  channel_id: string;
  user_id: string;
  role: ChannelMemberRole;
  muted: boolean;
  last_read_at: string | null;
  joined_at: string;
}

export interface ChatMessage {
  id: string;
  tenant_id: string;
  channel_id: string;
  sender_id: string;
  content: string;
  message_type: ChatMessageType;
  attachment_url: string | null;
  attachment_name: string | null;
  reply_to_id: string | null;
  is_hidden: boolean;
  hidden_by: string | null;
  hidden_reason: string | null;
  edited_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface ChatMessageWithSender extends ChatMessage {
  sender: Pick<User, "id" | "first_name" | "last_name" | "avatar_url">;
}

// ============================================================
// Input Types
// ============================================================

export interface CreateChannelInput {
  channel_type: ChannelType;
  name?: string | null;
  class_id?: string | null;
  program_id?: string | null;
  allow_parent_posts?: boolean;
  is_moderated?: boolean;
}

export interface SendMessageInput {
  channel_id: string;
  content: string;
  message_type?: ChatMessageType;
  attachment_url?: string | null;
  attachment_name?: string | null;
  reply_to_id?: string | null;
}

export interface ListMessagesParams {
  channel_id: string;
  before?: string; // cursor: created_at of oldest loaded message
  limit?: number;
}

// ============================================================
// CREATE CHANNEL
// ============================================================
// Permission: SEND_CLASS_MESSAGES (for class_group/program_group)
//             MODERATE_CHAT (for staff channels)
//             Any authenticated user (for direct messages)
//
// WHY auto-populate class groups: When a class_group channel is
// created, we pull all guides assigned to the class + all
// guardians of actively enrolled students. This ensures the
// channel roster stays current with enrollments.
// ============================================================

export async function createChannel(
  input: CreateChannelInput,
): Promise<ActionResponse<ChatChannel>> {
  try {
    const context = await getTenantContext();
    const supabase = await createSupabaseServerClient();

    // Permission checks based on channel type
    if (
      input.channel_type === "class_group" ||
      input.channel_type === "program_group"
    ) {
      await requirePermission(Permissions.SEND_CLASS_MESSAGES);
    }
    if (input.channel_type === "staff") {
      await requirePermission(Permissions.MODERATE_CHAT);
    }

    // Validation
    if (input.channel_type === "class_group" && !input.class_id) {
      return failure(
        "class_id is required for class group channels",
        ErrorCodes.VALIDATION_ERROR,
      );
    }
    if (input.channel_type === "program_group" && !input.program_id) {
      return failure(
        "program_id is required for program group channels",
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    // Check for existing class_group channel to prevent duplicates
    if (input.channel_type === "class_group" && input.class_id) {
      const { data: existing } = await supabase
        .from("chat_channels")
        .select("id")
        .eq("channel_type", "class_group")
        .eq("class_id", input.class_id)
        .is("deleted_at", null)
        .limit(1);

      if (existing && existing.length > 0) {
        return failure(
          "A class group channel already exists for this class",
          ErrorCodes.ALREADY_EXISTS,
        );
      }
    }

    const { data, error } = await supabase
      .from("chat_channels")
      .insert({
        tenant_id: context.tenant.id,
        channel_type: input.channel_type,
        name: input.name?.trim() ?? null,
        class_id: input.channel_type === "class_group" ? input.class_id : null,
        program_id:
          input.channel_type === "program_group" ? input.program_id : null,
        created_by: context.user.id,
        is_active: true,
        allow_parent_posts: input.allow_parent_posts ?? true,
        is_moderated: input.is_moderated ?? false,
      })
      .select()
      .single();

    if (error) {
      return failure(error.message, ErrorCodes.CREATE_FAILED);
    }

    const channel = data as ChatChannel;

    // Add creator as owner
    await supabase.from("chat_channel_members").insert({
      tenant_id: context.tenant.id,
      channel_id: channel.id,
      user_id: context.user.id,
      role: "owner" as ChannelMemberRole,
    });

    // Auto-populate class group members
    if (input.channel_type === "class_group" && input.class_id) {
      await populateClassGroupMembers(
        supabase,
        context.tenant.id,
        channel.id,
        input.class_id,
      );
    }

    return success(channel);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to create channel";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// POPULATE CLASS GROUP MEMBERS (internal helper)
// ============================================================
// Adds all guardians of actively-enrolled students to the
// channel. Skips users who are already members.
// ============================================================

async function populateClassGroupMembers(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  tenantId: string,
  channelId: string,
  classId: string,
): Promise<void> {
  // Get all actively-enrolled student IDs in this class
  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("student_id")
    .eq("class_id", classId)
    .eq("status", "active")
    .is("deleted_at", null);

  const studentIds = (enrollments ?? []).map(
    (e) => (e as { student_id: string }).student_id,
  );

  if (studentIds.length === 0) return;

  // Get all guardian user IDs for those students
  const { data: guardians } = await supabase
    .from("guardians")
    .select("user_id")
    .in("student_id", studentIds)
    .is("deleted_at", null);

  const guardianUserIds = [
    ...new Set(
      (guardians ?? [])
        .map((g) => (g as { user_id: string | null }).user_id)
        .filter((uid): uid is string => uid !== null),
    ),
  ];

  if (guardianUserIds.length === 0) return;

  // Get existing members to avoid duplicates
  const { data: existingMembers } = await supabase
    .from("chat_channel_members")
    .select("user_id")
    .eq("channel_id", channelId);

  const existingSet = new Set(
    (existingMembers ?? []).map((m) => (m as { user_id: string }).user_id),
  );

  // Insert new members
  const newMembers = guardianUserIds
    .filter((uid) => !existingSet.has(uid))
    .map((uid) => ({
      tenant_id: tenantId,
      channel_id: channelId,
      user_id: uid,
      role: "member" as ChannelMemberRole,
    }));

  if (newMembers.length > 0) {
    await supabase.from("chat_channel_members").insert(newMembers);
  }
}

// ============================================================
// CREATE DIRECT MESSAGE CHANNEL
// ============================================================
// Creates or retrieves an existing DM channel between the
// current user and the target user. Idempotent: if a DM
// channel already exists between the pair, returns it.
// ============================================================

export async function getOrCreateDirectChannel(
  targetUserId: string,
): Promise<ActionResponse<ChatChannel>> {
  try {
    const context = await getTenantContext();
    const supabase = await createSupabaseServerClient();

    if (targetUserId === context.user.id) {
      return failure(
        "Cannot create a DM channel with yourself",
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    // Check for existing DM channel between these two users
    const { data: existingChannels } = await supabase
      .from("chat_channels")
      .select(
        `
        id,
        chat_channel_members!inner(user_id)
      `,
      )
      .eq("channel_type", "direct")
      .is("deleted_at", null);

    // Find a channel where both users are members
    if (existingChannels) {
      for (const ch of existingChannels as Array<Record<string, unknown>>) {
        const members = ch.chat_channel_members as Array<{ user_id: string }>;
        const memberIds = new Set(members.map((m) => m.user_id));
        if (
          memberIds.has(context.user.id) &&
          memberIds.has(targetUserId) &&
          memberIds.size === 2
        ) {
          // Return existing DM channel
          const { data: fullChannel, error: fetchError } = await supabase
            .from("chat_channels")
            .select()
            .eq("id", ch.id as string)
            .single();

          if (!fetchError && fullChannel) {
            return success(fullChannel as ChatChannel);
          }
        }
      }
    }

    // Create new DM channel
    const { data: newChannel, error: createError } = await supabase
      .from("chat_channels")
      .insert({
        tenant_id: context.tenant.id,
        channel_type: "direct" as ChannelType,
        name: null,
        created_by: context.user.id,
        is_active: true,
        allow_parent_posts: true,
        is_moderated: false,
      })
      .select()
      .single();

    if (createError || !newChannel) {
      return failure(
        createError?.message ?? "Failed to create DM channel",
        ErrorCodes.CREATE_FAILED,
      );
    }

    const channel = newChannel as ChatChannel;

    // Add both users as members
    await supabase.from("chat_channel_members").insert([
      {
        tenant_id: context.tenant.id,
        channel_id: channel.id,
        user_id: context.user.id,
        role: "member" as ChannelMemberRole,
      },
      {
        tenant_id: context.tenant.id,
        channel_id: channel.id,
        user_id: targetUserId,
        role: "member" as ChannelMemberRole,
      },
    ]);

    return success(channel);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to get or create DM channel";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// UPDATE CHANNEL SETTINGS
// ============================================================
// Permission: MODERATE_CHAT or channel owner
// ============================================================

export async function updateChannel(
  channelId: string,
  input: {
    name?: string | null;
    allow_parent_posts?: boolean;
    is_moderated?: boolean;
    is_active?: boolean;
  },
): Promise<ActionResponse<ChatChannel>> {
  try {
    await requirePermission(Permissions.MODERATE_CHAT);
    const supabase = await createSupabaseServerClient();

    const updateData: Record<string, unknown> = {};
    if (input.name !== undefined) updateData.name = input.name?.trim() ?? null;
    if (input.allow_parent_posts !== undefined)
      updateData.allow_parent_posts = input.allow_parent_posts;
    if (input.is_moderated !== undefined)
      updateData.is_moderated = input.is_moderated;
    if (input.is_active !== undefined) updateData.is_active = input.is_active;

    if (Object.keys(updateData).length === 0) {
      return failure("No fields to update", ErrorCodes.VALIDATION_ERROR);
    }

    const { data, error } = await supabase
      .from("chat_channels")
      .update(updateData)
      .eq("id", channelId)
      .is("deleted_at", null)
      .select()
      .single();

    if (error) {
      return failure(error.message, ErrorCodes.UPDATE_FAILED);
    }

    return success(data as ChatChannel);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to update channel";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// LIST USER'S CHANNELS
// ============================================================
// Returns all channels the current user is a member of,
// with unread counts and last message preview.
// ============================================================

export async function listMyChannels(): Promise<
  ActionResponse<ChatChannelWithPreview[]>
> {
  try {
    const context = await getTenantContext();
    const supabase = await createSupabaseServerClient();

    // Get all channel IDs the user is a member of
    const { data: memberships, error: memberError } = await supabase
      .from("chat_channel_members")
      .select("channel_id, last_read_at")
      .eq("user_id", context.user.id);

    if (memberError) {
      return failure(memberError.message, ErrorCodes.DATABASE_ERROR);
    }

    if (!memberships || memberships.length === 0) {
      return success([]);
    }

    const membershipMap = new Map(
      (
        memberships as Array<{
          channel_id: string;
          last_read_at: string | null;
        }>
      ).map((m) => [m.channel_id, m.last_read_at]),
    );
    const channelIds = [...membershipMap.keys()];

    // Fetch channels with member counts
    const { data: channels, error: channelError } = await supabase
      .from("chat_channels")
      .select(
        `
        *,
        chat_channel_members(id)
      `,
      )
      .in("id", channelIds)
      .eq("is_active", true)
      .is("deleted_at", null)
      .order("updated_at", { ascending: false });

    if (channelError) {
      return failure(channelError.message, ErrorCodes.DATABASE_ERROR);
    }

    // Fetch last message for each channel
    const channelPreviews: ChatChannelWithPreview[] = [];

    for (const ch of (channels ?? []) as Array<Record<string, unknown>>) {
      const chId = ch.id as string;
      const lastReadAt = membershipMap.get(chId) ?? null;

      // Last message
      const { data: lastMsgData } = await supabase
        .from("chat_messages")
        .select(
          `
          id, content, created_at,
          sender:users!chat_messages_sender_id_fkey(first_name, last_name)
        `,
        )
        .eq("channel_id", chId)
        .is("deleted_at", null)
        .eq("is_hidden", false)
        .order("created_at", { ascending: false })
        .limit(1);

      let lastMessage: ChatChannelWithPreview["last_message"] = null;
      if (lastMsgData && lastMsgData.length > 0) {
        const msg = lastMsgData[0] as Record<string, unknown>;
        const sender = msg.sender as {
          first_name: string | null;
          last_name: string | null;
        } | null;
        lastMessage = {
          id: msg.id as string,
          content: msg.content as string,
          sender_name: sender
            ? `${sender.first_name ?? ""} ${sender.last_name ?? ""}`.trim()
            : "Unknown",
          created_at: msg.created_at as string,
        };
      }

      // Unread count
      let unreadCount = 0;
      if (lastReadAt) {
        const { count } = await supabase
          .from("chat_messages")
          .select("id", { count: "exact", head: true })
          .eq("channel_id", chId)
          .is("deleted_at", null)
          .eq("is_hidden", false)
          .gt("created_at", lastReadAt)
          .neq("sender_id", context.user.id);

        unreadCount = count ?? 0;
      } else {
        // Never read - all messages are unread
        const { count } = await supabase
          .from("chat_messages")
          .select("id", { count: "exact", head: true })
          .eq("channel_id", chId)
          .is("deleted_at", null)
          .eq("is_hidden", false)
          .neq("sender_id", context.user.id);

        unreadCount = count ?? 0;
      }

      channelPreviews.push({
        id: chId,
        tenant_id: ch.tenant_id as string,
        channel_type: ch.channel_type as ChannelType,
        name: ch.name as string | null,
        class_id: ch.class_id as string | null,
        program_id: ch.program_id as string | null,
        created_by: ch.created_by as string,
        is_active: ch.is_active as boolean,
        allow_parent_posts: ch.allow_parent_posts as boolean,
        is_moderated: ch.is_moderated as boolean,
        created_at: ch.created_at as string,
        updated_at: ch.updated_at as string,
        deleted_at: ch.deleted_at as string | null,
        member_count: Array.isArray(ch.chat_channel_members)
          ? (ch.chat_channel_members as Array<unknown>).length
          : 0,
        unread_count: unreadCount,
        last_message: lastMessage,
      });
    }

    // Sort: channels with unread messages first, then by last message time
    channelPreviews.sort((a, b) => {
      if (a.unread_count > 0 && b.unread_count === 0) return -1;
      if (a.unread_count === 0 && b.unread_count > 0) return 1;
      const aTime = a.last_message?.created_at ?? a.created_at;
      const bTime = b.last_message?.created_at ?? b.created_at;
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    });

    return success(channelPreviews);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to list channels";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// GET CHANNEL MEMBERS
// ============================================================

export interface ChannelMemberWithUser extends ChatChannelMember {
  user: Pick<User, "id" | "first_name" | "last_name" | "avatar_url">;
}

export async function getChannelMembers(
  channelId: string,
): Promise<ActionResponse<ChannelMemberWithUser[]>> {
  try {
    await getTenantContext();
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("chat_channel_members")
      .select(
        `
        *,
        user:users!chat_channel_members_user_id_fkey(id, first_name, last_name, avatar_url)
      `,
      )
      .eq("channel_id", channelId)
      .order("joined_at", { ascending: true });

    if (error) {
      return failure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    return success((data ?? []) as ChannelMemberWithUser[]);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to get channel members";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// ADD MEMBER TO CHANNEL
// ============================================================
// Permission: MODERATE_CHAT or channel owner/admin
// ============================================================

export async function addChannelMember(
  channelId: string,
  userId: string,
  role: ChannelMemberRole = "member",
): Promise<ActionResponse<ChatChannelMember>> {
  try {
    const context = await requirePermission(Permissions.MODERATE_CHAT);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("chat_channel_members")
      .upsert(
        {
          tenant_id: context.tenant.id,
          channel_id: channelId,
          user_id: userId,
          role,
        },
        { onConflict: "tenant_id,channel_id,user_id" },
      )
      .select()
      .single();

    if (error) {
      return failure(error.message, ErrorCodes.CREATE_FAILED);
    }

    return success(data as ChatChannelMember);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to add member";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// REMOVE MEMBER FROM CHANNEL
// ============================================================

export async function removeChannelMember(
  channelId: string,
  userId: string,
): Promise<ActionResponse<{ removed: boolean }>> {
  try {
    await requirePermission(Permissions.MODERATE_CHAT);
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase
      .from("chat_channel_members")
      .delete()
      .eq("channel_id", channelId)
      .eq("user_id", userId);

    if (error) {
      return failure(error.message, ErrorCodes.DELETE_FAILED);
    }

    return success({ removed: true });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to remove member";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// SEND MESSAGE
// ============================================================
// Membership is enforced by RLS. The sender must be a channel
// member. The channel must be active and (if allow_parent_posts
// is false) the sender must have an admin/owner role.
// ============================================================

export async function sendMessage(
  input: SendMessageInput,
): Promise<ActionResponse<ChatMessage>> {
  try {
    const context = await getTenantContext();
    const supabase = await createSupabaseServerClient();

    if (!input.content.trim() && !input.attachment_url) {
      return failure(
        "Message content or attachment is required",
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    // Verify channel exists and user is a member
    const { data: channel, error: chError } = await supabase
      .from("chat_channels")
      .select("id, is_active, allow_parent_posts")
      .eq("id", input.channel_id)
      .is("deleted_at", null)
      .single();

    if (chError || !channel) {
      return failure("Channel not found", ErrorCodes.NOT_FOUND);
    }

    const ch = channel as {
      id: string;
      is_active: boolean;
      allow_parent_posts: boolean;
    };

    if (!ch.is_active) {
      return failure(
        "This channel is no longer active",
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    // Check membership
    const { data: membership } = await supabase
      .from("chat_channel_members")
      .select("role")
      .eq("channel_id", input.channel_id)
      .eq("user_id", context.user.id)
      .limit(1);

    if (!membership || membership.length === 0) {
      return failure(
        "You are not a member of this channel",
        ErrorCodes.FORBIDDEN,
      );
    }

    const memberRole = (membership[0] as { role: string }).role;

    // If posting is restricted, check role
    if (!ch.allow_parent_posts && memberRole === "member") {
      return failure(
        "Only channel admins can post in this channel",
        ErrorCodes.FORBIDDEN,
      );
    }

    const { data, error } = await supabase
      .from("chat_messages")
      .insert({
        tenant_id: context.tenant.id,
        channel_id: input.channel_id,
        sender_id: context.user.id,
        content: input.content.trim(),
        message_type: input.message_type ?? "text",
        attachment_url: input.attachment_url ?? null,
        attachment_name: input.attachment_name ?? null,
        reply_to_id: input.reply_to_id ?? null,
      })
      .select()
      .single();

    if (error) {
      return failure(error.message, ErrorCodes.CREATE_FAILED);
    }

    // Update the channel's updated_at to bubble it up in lists
    await supabase
      .from("chat_channels")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", input.channel_id);

    return success(data as ChatMessage);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to send message";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// LIST MESSAGES (paginated, cursor-based)
// ============================================================
// Returns messages in reverse chronological order. Uses
// cursor-based pagination (before = oldest loaded message's
// created_at) for infinite scroll.
// ============================================================

export async function listMessages(
  params: ListMessagesParams,
): Promise<ActionResponse<ChatMessageWithSender[]>> {
  try {
    await getTenantContext();
    const supabase = await createSupabaseServerClient();

    const limit = params.limit ?? 50;

    let query = supabase
      .from("chat_messages")
      .select(
        `
        *,
        sender:users!chat_messages_sender_id_fkey(id, first_name, last_name, avatar_url)
      `,
      )
      .eq("channel_id", params.channel_id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (params.before) {
      query = query.lt("created_at", params.before);
    }

    const { data, error } = await query;

    if (error) {
      return failure(error.message, ErrorCodes.DATABASE_ERROR);
    }

    // Reverse so oldest is first (for chat display order)
    const messages = ((data ?? []) as ChatMessageWithSender[]).reverse();

    return success(messages);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to list messages";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// MARK CHANNEL AS READ
// ============================================================
// Updates the user's last_read_at cursor. Called when the
// user opens a channel or scrolls to the bottom.
// ============================================================

export async function markChannelRead(
  channelId: string,
): Promise<ActionResponse<{ marked: boolean }>> {
  try {
    const context = await getTenantContext();
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase
      .from("chat_channel_members")
      .update({ last_read_at: new Date().toISOString() })
      .eq("channel_id", channelId)
      .eq("user_id", context.user.id);

    if (error) {
      return failure(error.message, ErrorCodes.UPDATE_FAILED);
    }

    return success({ marked: true });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to mark as read";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// MUTE / UNMUTE CHANNEL
// ============================================================
// Toggles the muted flag on the user's membership. Muted
// channels don't send push notifications.
// ============================================================

export async function toggleChannelMute(
  channelId: string,
  muted: boolean,
): Promise<ActionResponse<{ muted: boolean }>> {
  try {
    const context = await getTenantContext();
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase
      .from("chat_channel_members")
      .update({ muted })
      .eq("channel_id", channelId)
      .eq("user_id", context.user.id);

    if (error) {
      return failure(error.message, ErrorCodes.UPDATE_FAILED);
    }

    return success({ muted });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to toggle mute";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// HIDE MESSAGE (Moderation)
// ============================================================
// Permission: MODERATE_CHAT
// Hides a message from view without deleting it. Records
// who hid it and why for audit purposes.
// ============================================================

export async function hideMessage(
  messageId: string,
  reason: string,
): Promise<ActionResponse<ChatMessage>> {
  try {
    const context = await requirePermission(Permissions.MODERATE_CHAT);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("chat_messages")
      .update({
        is_hidden: true,
        hidden_by: context.user.id,
        hidden_reason: reason.trim(),
      })
      .eq("id", messageId)
      .is("deleted_at", null)
      .select()
      .single();

    if (error) {
      return failure(error.message, ErrorCodes.UPDATE_FAILED);
    }

    return success(data as ChatMessage);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to hide message";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// UNHIDE MESSAGE (Moderation)
// ============================================================

export async function unhideMessage(
  messageId: string,
): Promise<ActionResponse<ChatMessage>> {
  try {
    await requirePermission(Permissions.MODERATE_CHAT);
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("chat_messages")
      .update({
        is_hidden: false,
        hidden_by: null,
        hidden_reason: null,
      })
      .eq("id", messageId)
      .is("deleted_at", null)
      .select()
      .single();

    if (error) {
      return failure(error.message, ErrorCodes.UPDATE_FAILED);
    }

    return success(data as ChatMessage);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to unhide message";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// GET TOTAL UNREAD COUNT (across all channels)
// ============================================================
// Used for the global notification bell badge.
// ============================================================

export async function getTotalUnreadCount(): Promise<ActionResponse<number>> {
  try {
    const context = await getTenantContext();
    const supabase = await createSupabaseServerClient();

    const { data: memberships } = await supabase
      .from("chat_channel_members")
      .select("channel_id, last_read_at")
      .eq("user_id", context.user.id);

    if (!memberships || memberships.length === 0) {
      return success(0);
    }

    let totalUnread = 0;

    for (const m of memberships as Array<{
      channel_id: string;
      last_read_at: string | null;
    }>) {
      let query = supabase
        .from("chat_messages")
        .select("id", { count: "exact", head: true })
        .eq("channel_id", m.channel_id)
        .is("deleted_at", null)
        .eq("is_hidden", false)
        .neq("sender_id", context.user.id);

      if (m.last_read_at) {
        query = query.gt("created_at", m.last_read_at);
      }

      const { count } = await query;
      totalUnread += count ?? 0;
    }

    return success(totalUnread);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to get unread count";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// DELETE MESSAGE (soft delete, sender only)
// ============================================================
// Only the sender can soft-delete their own message.
// Moderators use hideMessage instead.
// ============================================================

export async function deleteMessage(
  messageId: string,
): Promise<ActionResponse<{ deleted: boolean }>> {
  try {
    const context = await getTenantContext();
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase
      .from("chat_messages")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", messageId)
      .eq("sender_id", context.user.id)
      .is("deleted_at", null);

    if (error) {
      return failure(error.message, ErrorCodes.DELETE_FAILED);
    }

    return success({ deleted: true });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to delete message";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}
