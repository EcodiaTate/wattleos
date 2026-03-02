// src/app/(app)/comms/messages/[channelId]/page.tsx
//
// WHY hybrid: Server loads initial messages + channel details.
// ChatWindow client component handles real-time subscriptions
// via Supabase Realtime and new message sending.

import { ChatWindow } from "@/components/domain/comms/ChatWindow";
import {
  getChannelMembers,
  listMessages,
  markChannelRead,
} from "@/lib/actions/comms/chat-channels";
import Link from "next/link";
import { notFound } from "next/navigation";

export const metadata = { title: "Chat - WattleOS" };

interface ChatThreadPageProps {
  params: Promise<{ channelId: string }>;
}

export default async function ChatThreadPage({ params }: ChatThreadPageProps) {
  const { channelId } = await params;

  // Load initial messages (most recent 50)
  const messagesResult = await listMessages({
    channel_id: channelId,
    limit: 50,
  });

  if (messagesResult.error) {
    notFound();
  }

  const messages = messagesResult.data ?? [];

  // Load channel members for display
  const membersResult = await getChannelMembers(channelId);
  const members = membersResult.data ?? [];

  // Mark channel as read on load
  await markChannelRead(channelId);

  return (
    <div className="flex h-[calc(100vh-16rem)] flex-col">
      {/* ── Channel Header ────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <Link
            href={`/comms/messages`}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-muted-foreground lg:hidden"
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
                d="M15.75 19.5 8.25 12l7.5-7.5"
              />
            </svg>
          </Link>
          <div>
            <h2 className="text-base font-semibold text-foreground">Channel</h2>
            <p className="text-xs text-muted-foreground">
              {members.length} member{members.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      </div>

      {/* ── Chat Window ───────────────────────────────── */}
      <ChatWindow
        channelId={channelId}
        initialMessages={messages}
      />
    </div>
  );
}
