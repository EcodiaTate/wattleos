// src/app/(app)/comms/events/new/page.tsx

import { EventForm } from "@/components/domain/comms/EventForm";
import { listClasses } from "@/lib/actions/classes";

export const metadata = { title: "New Event - WattleOS" };

export default async function NewEventPage() {
  const classResult = await listClasses();
  const classes = classResult.data ?? [];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">New Event</h2>
        <p className="text-sm text-muted-foreground">
          Create an event for your school community.
        </p>
      </div>

      <EventForm
        classes={classes.map((c) => ({ id: c.id, name: c.name }))}
      />
    </div>
  );
}
