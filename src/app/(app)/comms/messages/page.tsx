// src/app/(app)/comms/messages/page.tsx
//
// ============================================================
// WattleOS V2 - Staff Messages Inbox
// ============================================================
// Server Component. Permission-gated to SEND_CLASS_MESSAGES.
// Shows all message threads the user participates in.
// ============================================================

import { MessageInboxClient } from "@/components/domain/comms/message-inbox-client";
import { listClasses } from "@/lib/actions/classes";
import { getInbox } from "@/lib/actions/comms/messaging";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function MessagesPage() {
  const context = await getTenantContext();

  if (!hasPermission(context, Permissions.SEND_CLASS_MESSAGES)) {
    redirect("/dashboard");
  }

  const [inboxResult, classesResult] = await Promise.all([
    getInbox({ limit: 30 }),
    listClasses(),
  ]);

  const threads = inboxResult.data ?? [];
  const classes = (classesResult.data ?? []).filter((c) => c.is_active);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          Communications
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Announcements and messaging for your school community
        </p>
      </div>

      {/* Tab nav */}
      <div className="flex gap-1 rounded-lg bg-muted p-1">
        <Link
          href="/comms/announcements"
          className="flex-1 rounded-md px-4 py-2 text-center text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          Announcements
        </Link>
        <Link
          href="/comms/messages"
          className="flex-1 rounded-md bg-background px-4 py-2 text-center text-sm font-medium text-foreground shadow-sm"
        >
          Messages
        </Link>
      </div>

      <MessageInboxClient
        initialThreads={threads}
        classes={classes}
        currentUserId={context.user.id}
      />
    </div>
  );
}
