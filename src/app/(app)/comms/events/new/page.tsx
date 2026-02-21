// src/app/(app)/comms/events/new/page.tsx

import { EventForm } from "@/components/domain/comms/EventForm";
import { listClasses } from "@/lib/actions/students";

interface NewEventPageProps {
  params: Promise<{ tenant: string }>;
}

export default async function NewEventPage({ params }: NewEventPageProps) {
  const { tenant } = await params;

  const classResult = await listClasses();
  const classes = classResult.data ?? [];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">New Event</h2>
        <p className="text-sm text-gray-500">
          Create an event for your school community.
        </p>
      </div>

      <EventForm
        tenantSlug={tenant}
        classes={classes.map((c) => ({ id: c.id, name: c.name }))}
      />
    </div>
  );
}
