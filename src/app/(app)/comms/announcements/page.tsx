// src/app/(app)/comms/announcements/page.tsx
//
// WHY server component: The announcement list fetches data at
// the page level. Filters are controlled via URL search params
// so the page is shareable and back-button friendly.

import { AnnouncementCard } from "@/components/domain/comms/AnnouncementCard";
import type {
  AnnouncementPriority,
  AnnouncementScope,
} from "@/lib/actions/comms/announcements";
import { listAnnouncements } from "@/lib/actions/comms/announcements";
import Link from "next/link";

interface AnnouncementsPageProps {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<{
    scope?: AnnouncementScope;
    priority?: AnnouncementPriority;
    pinned?: string;
    drafts?: string;
    expired?: string;
    page?: string;
  }>;
}

export default async function AnnouncementsPage({
  params,
  searchParams,
}: AnnouncementsPageProps) {
  const { tenant } = await params;
  const search = await searchParams;

  const page = parseInt(search.page ?? "1", 10);
  const result = await listAnnouncements({
    scope: search.scope,
    priority: search.priority,
    pinned_only: search.pinned === "true",
    include_drafts: search.drafts === "true",
    include_expired: search.expired === "true",
    page,
    per_page: 20,
  });

  const announcements = result.data ?? [];
  const totalPages = result.pagination
    ? Math.ceil(result.pagination.total / result.pagination.per_page)
    : 1;

  // ── Filter options ───────────────────────────────────
  const scopeOptions: { value: AnnouncementScope | ""; label: string }[] = [
    { value: "", label: "All Scopes" },
    { value: "school", label: "School-wide" },
    { value: "class", label: "Class" },
    { value: "program", label: "Program" },
  ];

  const priorityOptions: {
    value: AnnouncementPriority | "";
    label: string;
  }[] = [
    { value: "", label: "All Priorities" },
    { value: "urgent", label: "Urgent" },
    { value: "high", label: "High" },
    { value: "normal", label: "Normal" },
    { value: "low", label: "Low" },
  ];

  function buildFilterUrl(key: string, value: string): string {
    const p = new URLSearchParams();
    if (search.scope && key !== "scope") p.set("scope", search.scope);
    if (search.priority && key !== "priority")
      p.set("priority", search.priority);
    if (search.pinned === "true" && key !== "pinned") p.set("pinned", "true");
    if (search.drafts === "true" && key !== "drafts") p.set("drafts", "true");
    if (search.expired === "true" && key !== "expired")
      p.set("expired", "true");
    if (value) p.set(key, value);
    const qs = p.toString();
    return `/comms/announcements${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="space-y-6">
      {/* ── Header + Actions ──────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Announcements</h2>
          <p className="text-sm text-gray-500">
            {result.pagination?.total ?? 0} total announcements
          </p>
        </div>
        <Link
          href={`/comms/announcements/new`}
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
          New Announcement
        </Link>
      </div>

      {/* ── Filters ───────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Scope filter */}
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

        {/* Priority filter */}
        <div className="flex gap-1 rounded-lg border border-gray-200 bg-white p-1">
          {priorityOptions.map((opt) => {
            const isActive =
              (opt.value === "" && !search.priority) ||
              search.priority === opt.value;
            return (
              <Link
                key={opt.value}
                href={buildFilterUrl("priority", opt.value)}
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

        {/* Toggle filters */}
        <div className="flex gap-2">
          <Link
            href={buildFilterUrl(
              "drafts",
              search.drafts === "true" ? "" : "true",
            )}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              search.drafts === "true"
                ? "bg-gray-800 text-white"
                : "border border-gray-300 text-gray-600 hover:bg-gray-100"
            }`}
          >
            Include Drafts
          </Link>
          <Link
            href={buildFilterUrl(
              "expired",
              search.expired === "true" ? "" : "true",
            )}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              search.expired === "true"
                ? "bg-gray-800 text-white"
                : "border border-gray-300 text-gray-600 hover:bg-gray-100"
            }`}
          >
            Include Expired
          </Link>
          <Link
            href={buildFilterUrl(
              "pinned",
              search.pinned === "true" ? "" : "true",
            )}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              search.pinned === "true"
                ? "bg-gray-800 text-white"
                : "border border-gray-300 text-gray-600 hover:bg-gray-100"
            }`}
          >
            Pinned Only
          </Link>
        </div>
      </div>

      {/* ── Announcement List ─────────────────────────── */}
      {announcements.length === 0 ? (
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
              d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 1 1 0-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 0 1-1.44-4.282m3.102.069a18.03 18.03 0 0 1-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 0 1 8.835 2.535M10.34 6.66a23.847 23.847 0 0 0 8.835-2.535m0 0A23.74 23.74 0 0 0 18.795 3m.38 1.125a23.91 23.91 0 0 1 1.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 0 0 1.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 0 1 0 3.46"
            />
          </svg>
          <h3 className="mt-4 text-sm font-semibold text-gray-900">
            No announcements found
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Create your first announcement to share news with your school
            community.
          </p>
          <Link
            href={`/comms/announcements/new`}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
          >
            Create Announcement
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map((announcement) => (
            <AnnouncementCard
              key={announcement.id}
              announcement={announcement}
              tenantSlug={tenant}
            />
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
