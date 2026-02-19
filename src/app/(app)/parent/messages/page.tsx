// src/app/(app)/parent/messages/page.tsx
//
// ============================================================
// WattleOS V2 - Parent Messages Inbox
// ============================================================
// Server Component. Shows all threads the parent participates
// in - class broadcasts and direct messages from guides.
// No permission check - all authenticated parents can see
// threads they're recipients of (enforced by RLS).
// ============================================================

import { ParentInboxClient } from "@/components/domain/comms/parent-inbox-client";
import { getInbox } from "@/lib/actions/comms/messaging";
import { getTenantContext } from "@/lib/auth/tenant-context";

export default async function ParentMessagesPage() {
  const context = await getTenantContext();

  const result = await getInbox({ limit: 30 });
  const threads = result.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Messages</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Conversations with your child&apos;s guides
        </p>
      </div>

      <ParentInboxClient
        initialThreads={threads}
        currentUserId={context.user.id}
      />
    </div>
  );
}
