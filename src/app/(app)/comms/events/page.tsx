// src/app/(app)/comms/events/page.tsx
//
// WHY server component: Events list fetches from the server
// action. Filters via URL search params for shareability.

import { EventCard } from "@/components/domain/comms/EventCard";
import type { EventScope } from "@/lib/actions/comms/school-events";
import { listEvents } from "@/lib/actions/comms/school-events";
import Link from "next/link";

export const metadata = { title: "Events - WattleOS" };

interface EventsPageProps {
  searchParams: Promise<{
    scope?: EventScope;
    past?: string;
    page?: string;
  }>;
}

export default async function EventsPage({
  searchParams,
}: EventsPageProps) {
  const search = await searchParams;

  const page = parseInt(search.page ?? "1", 10);
  const includePast = search.past === "true";

  const result = await listEvents({
    scope: search.scope,
    from_date: includePast ? undefined : new Date().toISOString().split("T")[0],
    page,
    per_page: 20,
  });

  const events = result.data ?? [];
  const totalPages = result.pagination
    ? Math.ceil(result.pagination.total / result.pagination.per_page)
    : 1;

  const scopeOptions: { value: EventScope | ""; label: string }[] = [
    { value: "", label: "All Events" },
    { value: "school", label: "School-wide" },
    { value: "class", label: "Class" },
    { value: "staff", label: "Staff Only" },
  ];

  function buildFilterUrl(key: string, value: string): string {
    const p = new URLSearchParams();
    if (search.scope && key !== "scope") p.set("scope", search.scope);
    if (search.past === "true" && key !== "past") p.set("past", "true");
    if (value) p.set(key, value);
    const qs = p.toString();
    return `/comms/events${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="space-y-6">
      {/* ── Header + Actions ──────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Events</h2>
          <p className="text-sm text-muted-foreground">
            {result.pagination?.total ?? 0} events
          </p>
        </div>
        <Link
          href={`/comms/events/new`}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-background shadow-sm hover:bg-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 4.5v15m7.5-7.5h-15"
            />
          </svg>
          New Event
        </Link>
      </div>

      {/* ── Filters ───────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-lg border border-border bg-card p-1">
          {scopeOptions.map((opt) => {
            const isActive =
              (opt.value === "" && !search.scope) || search.scope === opt.value;
            return (
              <Link
                key={opt.value}
                href={buildFilterUrl("scope", opt.value)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {opt.label}
              </Link>
            );
          })}
        </div>

        <Link
          href={buildFilterUrl("past", includePast ? "" : "true")}
          className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
            includePast
              ? "bg-foreground text-background"
              : "border border-border text-muted-foreground hover:bg-muted"
          }`}
        >
          Include Past Events
        </Link>
      </div>

      {/* ── Events Grid ───────────────────────────────── */}
      {events.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-border p-12 text-center">
          <svg
            className="mx-auto h-12 w-12 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 9v9.75"
            />
          </svg>
          <h3 className="mt-4 text-sm font-semibold text-foreground">
            No events found
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Create your first event for the school community.
          </p>
          <Link
            href={`/comms/events/new`}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-background hover:bg-primary"
          >
            Create Event
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}

      {/* ── Pagination ────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-border pt-4">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={buildFilterUrl("page", String(page - 1))}
                className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
              >
                Previous
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={buildFilterUrl("page", String(page + 1))}
                className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
              >
                Next
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
