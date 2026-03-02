// src/app/(app)/comms/announcements/new/page.tsx
//
// WHY server wrapper: We need to load the list of classes for
// the scope targeting dropdown. The actual form is a client
// component because it has interactive state.

import { AnnouncementComposer } from "@/components/domain/comms/AnnouncementComposer";
import { listClasses } from "@/lib/actions/classes";

export const metadata = { title: "New Announcement - WattleOS" };

export default async function NewAnnouncementPage() {
  // Load classes for scope targeting
  const classResult = await listClasses();
  const classes = classResult.data ?? [];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">
          New Announcement
        </h2>
        <p className="text-sm text-muted-foreground">
          Create an announcement for your school community.
        </p>
      </div>

      <AnnouncementComposer
        classes={classes.map((c) => ({ id: c.id, name: c.name }))}
      />
    </div>
  );
}
