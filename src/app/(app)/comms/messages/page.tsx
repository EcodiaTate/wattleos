// src/app/(app)/comms/messages/page.tsx
//
// WHY server component: Channel list loads from server action.
// Each channel row shows unread count and last message preview.

import type { ChatChannelWithPreview } from "@/lib/actions/comms/chat-channels";
import { listMyChannels } from "@/lib/actions/comms/chat-channels";
import Link from "next/link";

export const metadata = { title: "Messages - WattleOS" };

const CHANNEL_TYPE_LABELS: Record<string, string> = {
  class_group: "Class Group",
  program_group: "Program",
  direct: "Direct Message",
  staff: "Staff",
};

const CHANNEL_TYPE_COLORS: Record<string, string> = {
  class_group: "bg-[var(--badge-success-bg)] text-[var(--badge-success-fg)]",
  program_group: "bg-info/15 text-info",
  direct: "bg-info/15 text-info",
  staff: "bg-muted text-foreground",
};

export default async function MessagesPage() {
  const result = await listMyChannels();
  const channels = result.data ?? [];

  // Group channels by type
  const grouped: Record<string, ChatChannelWithPreview[]> = {};
  for (const ch of channels) {
    const key = ch.channel_type;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(ch);
  }

  // Order: class_group, program_group, direct, staff
  const typeOrder = ["class_group", "program_group", "direct", "staff"];

  return (
    <div className="space-y-6">
      {/* ── Header ────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Messages</h2>
          <p className="text-sm text-muted-foreground">
            {channels.length} conversation{channels.length !== 1 ? "s" : ""}
          </p>
        </div>
        <NewMessageButton />
      </div>

      {/* ── Channel List ──────────────────────────────── */}
      {channels.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-border p-12 text-center">
          <svg
            className="mx-auto h-12 w-12 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z"
            />
          </svg>
          <h3 className="mt-4 text-sm font-semibold text-foreground">
            No conversations yet
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Channels will appear here when class groups are set up or you start
            a direct message.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {typeOrder.map((type) => {
            const channelsInGroup = grouped[type];
            if (!channelsInGroup || channelsInGroup.length === 0) return null;

            return (
              <div key={type}>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {CHANNEL_TYPE_LABELS[type] ?? type} ({channelsInGroup.length})
                </h3>
                <div className="divide-y divide-gray-100 rounded-lg border border-border bg-card">
                  {channelsInGroup.map((channel) => (
                    <ChannelRow
                      key={channel.id}
                      channel={channel}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Channel Row ─────────────────────────────────────────
function ChannelRow({
  channel,
}: {
  channel: ChatChannelWithPreview;
}) {
  const hasUnread = channel.unread_count > 0;

  return (
    <Link
      href={`/comms/messages/${channel.id}`}
      className={`flex items-center gap-4 px-4 py-3 transition-colors hover:bg-muted ${
        hasUnread ? "bg-primary/10/50" : ""
      }`}
    >
      {/* Channel avatar */}
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium ${
          CHANNEL_TYPE_COLORS[channel.channel_type] ??
          "bg-muted text-foreground"
        }`}
      >
        {channel.channel_type === "direct"
          ? "DM"
          : channel.channel_type === "class_group"
            ? "CG"
            : channel.channel_type === "staff"
              ? "ST"
              : "PG"}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <h4
            className={`truncate text-sm ${
              hasUnread
                ? "font-semibold text-foreground"
                : "font-medium text-foreground"
            }`}
          >
            {channel.name ?? "Direct Message"}
          </h4>
          {channel.last_message && (
            <time className="text-xs text-muted-foreground flex-shrink-0 ml-2">
              {new Date(channel.last_message.created_at).toLocaleDateString(
                "en-AU",
                { day: "numeric", month: "short" },
              )}
            </time>
          )}
        </div>

        {channel.last_message ? (
          <p
            className={`mt-0.5 truncate text-xs ${
              hasUnread ? "text-foreground" : "text-muted-foreground"
            }`}
          >
            <span className="font-medium">
              {channel.last_message.sender_name}:
            </span>{" "}
            {channel.last_message.content}
          </p>
        ) : (
          <p className="mt-0.5 text-xs text-muted-foreground italic">No messages yet</p>
        )}
      </div>

      {/* Unread badge + member count */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {hasUnread && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-bold text-background">
            {channel.unread_count > 99 ? "99+" : channel.unread_count}
          </span>
        )}
        <span className="text-xs text-muted-foreground">
          {channel.member_count} members
        </span>
      </div>
    </Link>
  );
}

// ── New Message Button ──────────────────────────────────
function NewMessageButton() {
  return (
    <Link
      href={`/comms/messages/new`}
      className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-background shadow-sm hover:bg-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
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
      New Message
    </Link>
  );
}
