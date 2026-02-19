// src/app/(app)/parent/messages/[threadId]/page.tsx
//
// ============================================================
// WattleOS V2 - Parent Thread View Page
// ============================================================
// Server Component. Loads thread messages and renders the
// shared ThreadViewClient. Same conversation experience as
// staff - only the back link points to parent inbox.
// ============================================================

import { getTenantContext } from '@/lib/auth/tenant-context';
import { getThreadMessages } from '@/lib/actions/messaging';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ThreadViewClient } from '@/components/domain/comms/thread-view-client';

interface ParentThreadPageProps {
  params: Promise<{ threadId: string }>;
}

export default async function ParentThreadPage({ params }: ParentThreadPageProps) {
  const { threadId } = await params;
  const context = await getTenantContext();

  const result = await getThreadMessages(threadId);

  if (result.error) {
    redirect('/parent/messages');
  }

  const { thread, messages, recipients } = result.data!;

  return (
    <div className="space-y-4">
      {/* Back link */}
      <Link
        href="/parent/messages"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
        </svg>
        Back to Messages
      </Link>

      {/* Thread header */}
      <div className="rounded-lg border border-gray-200 bg-white px-6 py-4 shadow-sm">
        <h1 className="text-lg font-semibold text-gray-900">
          {thread.subject || 'Conversation'}
        </h1>
        <div className="mt-1 flex items-center gap-2 text-sm text-gray-500">
          <span>
            From {recipients.find((r) => r.id !== context.user.id)?.first_name ?? 'Guide'}{' '}
            {recipients.find((r) => r.id !== context.user.id)?.last_name ?? ''}
          </span>
        </div>
      </div>

      <ThreadViewClient
        threadId={thread.id}
        initialMessages={messages}
        recipients={recipients}
        currentUserId={context.user.id}
      />
    </div>
  );
}