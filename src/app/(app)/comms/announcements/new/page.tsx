// src/app/(app)/comms/announcements/new/page.tsx
//
// WHY server wrapper: We need to load the list of classes for
// the scope targeting dropdown. The actual form is a client
// component because it has interactive state.

import { AnnouncementComposer } from "@/components/domain/comms/AnnouncementComposer";
import { listClasses } from "@/lib/actions/students";

interface NewAnnouncementPageProps {
  params: Promise<{ tenant: string }>;
}

export default async function NewAnnouncementPage({
  params,
}: NewAnnouncementPageProps) {
  const { tenant } = await params;

  // Load classes for scope targeting
  const classResult = await listClasses();
  const classes = classResult.data ?? [];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">
          New Announcement
        </h2>
        <p className="text-sm text-gray-500">
          Create an announcement for your school community.
        </p>
      </div>

      <AnnouncementComposer
        tenantSlug={tenant}
        classes={classes.map((c) => ({ id: c.id, name: c.name }))}
      />
    </div>
  );
}
