// src/app/(app)/parent/announcements/page.tsx
//
// ============================================================
// WattleOS V2 - Parent Announcements Page
// ============================================================
// Server Component. Shows announcements visible to the current
// parent: school-wide + class-targeted for their children's
// classes. Read status tracked for unread badge accuracy.
// ============================================================

import { ParentAnnouncementFeed } from "@/components/domain/comms/parent-announcement-feed";
import { getAnnouncementsForParent } from "@/lib/actions/comms/announcements";
import { getTenantContext } from "@/lib/auth/tenant-context";

export default async function ParentAnnouncementsPage() {
  const context = await getTenantContext();

  const result = await getAnnouncementsForParent({ limit: 30 });
  const announcements = result.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          Announcements
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          News and updates from your school
        </p>
      </div>

      <ParentAnnouncementFeed initialAnnouncements={announcements} />
    </div>
  );
}
