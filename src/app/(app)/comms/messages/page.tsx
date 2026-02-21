// src/app/(app)/comms/messages/page.tsx
//
// WHY server component: Channel list loads from server action.
// Each channel row shows unread count and last message preview.

import type { ChatChannelWithPreview } from "@/lib/actions/comms/chat-channels";
import { listMyChannels } from "@/lib/actions/comms/chat-channels";
import Link from "next/link";

interface MessagesPageProps {
  params: Promise<{ tenant: string }>;
}

const CHANNEL_TYPE_LABELS: Record<string, string> = {
  class_group: "Class Group",
  program_group: "Program",
  direct: "Direct Message",
  staff: "Staff",
};

const CHANNEL_TYPE_COLORS: Record<string, string> = {
  class_group: "bg-emerald-100 text-emerald-700",
  program_group: "bg-purple-100 text-purple-700",
  direct: "bg-blue-100 text-blue-700",
  staff: "bg-gray-100 text-gray-700",
};

export default async function MessagesPage({ params }: MessagesPageProps) {
  const { tenant } = await params;

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
          <h2 className="text-lg font-semibold text-gray-900">Messages</h2>
          <p className="text-sm text-gray-500">
            {channels.length} conversation{channels.length !== 1 ? "s" : ""}
          </p>
        </div>
        <NewMessageButton tenantSlug={tenant} />
      </div>

      {/* ── Channel List ──────────────────────────────── */}
      {channels.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-200 p-12 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
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
          <h3 className="mt-4 text-sm font-semibold text-gray-900">
            No conversations yet
          </h3>
          <p className="mt-1 text-sm text-gray-500">
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
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  {CHANNEL_TYPE_LABELS[type] ?? type} ({channelsInGroup.length})
                </h3>
                <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
                  {channelsInGroup.map((channel) => (
                    <ChannelRow
                      key={channel.id}
                      channel={channel}
                      tenantSlug={tenant}
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
  tenantSlug,
}: {
  channel: ChatChannelWithPreview;
  tenantSlug: string;
}) {
  const hasUnread = channel.unread_count > 0;

  return (
    <Link
      href={`/comms/messages/${channel.id}`}
      className={`flex items-center gap-4 px-4 py-3 transition-colors hover:bg-gray-50 ${
        hasUnread ? "bg-amber-50/50" : ""
      }`}
    >
      {/* Channel avatar */}
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium ${
          CHANNEL_TYPE_COLORS[channel.channel_type] ??
          "bg-gray-100 text-gray-700"
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
                ? "font-semibold text-gray-900"
                : "font-medium text-gray-700"
            }`}
          >
            {channel.name ?? "Direct Message"}
          </h4>
          {channel.last_message && (
            <time className="text-xs text-gray-400 flex-shrink-0 ml-2">
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
              hasUnread ? "text-gray-700" : "text-gray-500"
            }`}
          >
            <span className="font-medium">
              {channel.last_message.sender_name}:
            </span>{" "}
            {channel.last_message.content}
          </p>
        ) : (
          <p className="mt-0.5 text-xs text-gray-400 italic">No messages yet</p>
        )}
      </div>

      {/* Unread badge + member count */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {hasUnread && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-xs font-bold text-white">
            {channel.unread_count > 99 ? "99+" : channel.unread_count}
          </span>
        )}
        <span className="text-xs text-gray-400">
          {channel.member_count} members
        </span>
      </div>
    </Link>
  );
}

// ── New Message Button ──────────────────────────────────
function NewMessageButton({ tenantSlug }: { tenantSlug: string }) {
  return (
    <Link
      href={`/comms/messages/new`}
      className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
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
