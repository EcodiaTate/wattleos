// src/app/(app)/comms/announcements/page.tsx
//
// ============================================================
// WattleOS V2 - Staff Announcements Page
// ============================================================
// Server Component. Permission-gated to SEND_ANNOUNCEMENTS.
// Loads existing announcements and class list (for targeting),
// renders the interactive feed + create form.
// ============================================================

import { getTenantContext, hasPermission } from '@/lib/auth/tenant-context';
import { Permissions } from '@/lib/constants/permissions';
import { listAnnouncements } from '@/lib/actions/announcements';
import { listClasses } from '@/lib/actions/classes';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { AnnouncementFeedClient } from '@/components/domain/comms/announcement-feed-client';

export default async function AnnouncementsPage() {
  const context = await getTenantContext();

  if (!hasPermission(context, Permissions.SEND_ANNOUNCEMENTS)) {
    redirect('/dashboard');
  }

  const [announcementsResult, classesResult] = await Promise.all([
    listAnnouncements({ limit: 50 }),
    listClasses(),
  ]);

  const announcements = announcementsResult.data ?? [];
  const classes = (classesResult.data ?? []).filter((c) => c.is_active);

  return (
    <div className="space-y-6">
      {/* Header + nav */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Communications</h1>
          <p className="mt-1 text-sm text-gray-500">
            Announcements and messaging for your school community
          </p>
        </div>
      </div>

      {/* Tab nav */}
      <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
        <Link
          href="/comms/announcements"
          className="flex-1 rounded-md bg-white px-4 py-2 text-center text-sm font-medium text-gray-900 shadow-sm"
        >
          Announcements
        </Link>
        <Link
          href="/comms/messages"
          className="flex-1 rounded-md px-4 py-2 text-center text-sm font-medium text-gray-500 hover:text-gray-700"
        >
          Messages
        </Link>
      </div>

      <AnnouncementFeedClient
        initialAnnouncements={announcements}
        classes={classes}
      />
    </div>
  );
}