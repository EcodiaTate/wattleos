// src/components/domain/comms/parent-inbox-client.tsx
//
// ============================================================
// WattleOS V2 - Parent Message Inbox (Client Component)
// ============================================================
// Read-only thread list - parents can view and reply but
// cannot initiate new threads (that's a guide action).
// ============================================================

'use client';

import Link from 'next/link';
import type { MessageThreadWithPreview } from '@/types/domain';
import { THREAD_TYPE_CONFIG } from '@/lib/constants/communications';
import type { MessageThreadType } from '@/lib/constants/communications';

interface ParentInboxClientProps {
  initialThreads: MessageThreadWithPreview[];
  currentUserId: string;
}

export function ParentInboxClient({
  initialThreads,
  currentUserId,
}: ParentInboxClientProps) {
  if (initialThreads.length === 0) {
    return (
      <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
        <p className="text-sm text-gray-500">
          No messages yet. Your child&apos;s guides will reach out when they have updates to share.
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white shadow-sm">
      {initialThreads.map((thread) => {
        const typeConfig = THREAD_TYPE_CONFIG[thread.thread_type as MessageThreadType];
        const hasUnread = thread.unread_count > 0;
        const lastMsg = thread.last_message;
        const lastSender = thread.last_message_sender;

        const preview = lastMsg
          ? lastMsg.content.length > 100
            ? lastMsg.content.slice(0, 100) + '...'
            : lastMsg.content
          : 'No messages yet';

        const senderName = lastSender
          ? lastSender.id === currentUserId
            ? 'You'
            : `${lastSender.first_name} ${lastSender.last_name}`
          : '';

        return (
          <Link
            key={thread.id}
            href={`/parent/messages/${thread.id}`}
            className={`block px-5 py-4 transition-colors hover:bg-gray-50 ${
              hasUnread ? 'bg-amber-50/50' : ''
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  {hasUnread && (
                    <span className="inline-flex h-2 w-2 rounded-full bg-amber-500" />
                  )}
                  <span className={`text-sm ${hasUnread ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                    {thread.subject || 'Message'}
                  </span>
                  {thread.target_class && (
                    <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${typeConfig.bgColor} ${typeConfig.color}`}>
                      {thread.target_class.name}
                    </span>
                  )}
                </div>
                <p className="mt-1 truncate text-sm text-gray-500">
                  {senderName && <span className="font-medium text-gray-600">{senderName}: </span>}
                  {preview}
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  From {thread.creator.first_name} {thread.creator.last_name}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="whitespace-nowrap text-xs text-gray-400">
                  {lastMsg ? formatRelativeTime(lastMsg.sent_at) : ''}
                </span>
                {hasUnread && (
                  <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-amber-500 px-1.5 text-[10px] font-bold text-white">
                    {thread.unread_count}
                  </span>
                )}
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
}