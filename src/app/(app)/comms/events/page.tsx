// src/app/(app)/comms/events/page.tsx
//
// WHY server component: Events list fetches from the server
// action. Filters via URL search params for shareability.

import { EventCard } from "@/components/domain/comms/EventCard";
import type { EventScope } from "@/lib/actions/comms/school-events";
import { listEvents } from "@/lib/actions/comms/school-events";
import Link from "next/link";

interface EventsPageProps {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<{
    scope?: EventScope;
    past?: string;
    page?: string;
  }>;
}

export default async function EventsPage({
  params,
  searchParams,
}: EventsPageProps) {
  const { tenant } = await params;
  const search = await searchParams;

  const page = parseInt(search.page ?? "1", 10);
  const includePast = search.past === "true";

  const result = await listEvents({
    scope: search.scope,
    include_past: includePast,
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
          <h2 className="text-lg font-semibold text-gray-900">Events</h2>
          <p className="text-sm text-gray-500">
            {result.pagination?.total ?? 0} events
          </p>
        </div>
        <Link
          href={`/comms/events/new`}
          className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
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
        <div className="flex gap-1 rounded-lg border border-gray-200 bg-white p-1">
          {scopeOptions.map((opt) => {
            const isActive =
              (opt.value === "" && !search.scope) || search.scope === opt.value;
            return (
              <Link
                key={opt.value}
                href={buildFilterUrl("scope", opt.value)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-amber-100 text-amber-800"
                    : "text-gray-600 hover:bg-gray-100"
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
              ? "bg-gray-800 text-white"
              : "border border-gray-300 text-gray-600 hover:bg-gray-100"
          }`}
        >
          Include Past Events
        </Link>
      </div>

      {/* ── Events Grid ───────────────────────────────── */}
      {events.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-200 p-12 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
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
          <h3 className="mt-4 text-sm font-semibold text-gray-900">
            No events found
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Create your first event for the school community.
          </p>
          <Link
            href={`/comms/events/new`}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
          >
            Create Event
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <EventCard key={event.id} event={event} tenantSlug={tenant} />
          ))}
        </div>
      )}

      {/* ── Pagination ────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-200 pt-4">
          <p className="text-sm text-gray-500">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={buildFilterUrl("page", String(page - 1))}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Previous
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={buildFilterUrl("page", String(page + 1))}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
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
