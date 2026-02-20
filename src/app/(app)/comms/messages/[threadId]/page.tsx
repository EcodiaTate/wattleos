// src/app/(app)/comms/messages/[threadId]/page.tsx
//
// ============================================================
// WattleOS V2 - Thread View Page (Staff)
// ============================================================
// Server Component. Loads the full message thread with all
// messages and recipient list. Renders the conversation client.
// ============================================================

import { ThreadViewClient } from "@/components/domain/comms/thread-view-client";
import { getThreadMessages } from "@/lib/actions/comms/messaging";
import { getTenantContext } from "@/lib/auth/tenant-context";
import Link from "next/link";
import { redirect } from "next/navigation";

interface ThreadPageProps {
  params: Promise<{ threadId: string }>;
}

export default async function ThreadPage({ params }: ThreadPageProps) {
  const { threadId } = await params;
  const context = await getTenantContext();

  const result = await getThreadMessages(threadId);

  if (result.error) {
    redirect("/comms/messages");
  }

  const { thread, messages, recipients } = result.data!;

  return (
    <div className="space-y-4">
      {/* Back link */}
      <Link
        href="/comms/messages"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <svg
          className="h-4 w-4"
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
        Back to Messages
      </Link>

     {/* Thread header */}
<div className="rounded-lg border border-border bg-background px-6 py-4 shadow-sm">
  <h1 className="text-lg font-semibold text-foreground">
    {thread.subject || "Conversation"}
  </h1>

  {(() => {
    const threadType =
      // common shapes
      (thread as any).thread_type ??
      (thread as any).type ??
      (thread as any).message_thread_type;

    const isClass = threadType === "class_broadcast";

    return (
      <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
        <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700">
          {isClass ? "👥 Class Message" : "💬 Direct"}
        </span>
        <span>·</span>
        <span>{recipients.length} recipients</span>
      </div>
    );
  })()}
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
