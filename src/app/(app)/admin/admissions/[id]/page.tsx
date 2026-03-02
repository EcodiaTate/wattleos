// src/app/(app)/admin/admissions/[id]/page.tsx
//
// ============================================================
// WattleOS V2 - Admissions Entry Detail (Module 13)
// ============================================================
// Server Component. Fetches the full waitlist entry with stage
// history and renders all sections: child info, parent contact,
// program preferences, tour details, offer details, admin notes,
// and a chronological stage history timeline.
//
// WHY a dedicated page (not a modal): Each entry has a lot of
// context - history, notes, tour info, offer details. Modals
// can't hold this much without becoming unwieldy, especially
// on iPad where admins will use this daily.
//
// The interactive actions (make offer, accept, transition) are
// handled by the EntryActions client component at the top.
// ============================================================

import type { StageHistoryRecord } from "@/lib/actions/admissions/waitlist-pipeline";
import { getWaitlistEntry } from "@/lib/actions/admissions/waitlist-pipeline";
import { getTenantContext } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { EntryActions } from "./entry-actions";

export const metadata = { title: "Admissions Entry - WattleOS" };

// ── Stage display config ─────────────────────────────────────

const STAGE_LABELS: Record<string, string> = {
  inquiry: "Inquiry",
  waitlisted: "Waitlisted",
  tour_scheduled: "Tour Scheduled",
  tour_completed: "Tour Completed",
  offered: "Offered",
  accepted: "Accepted",
  enrolled: "Enrolled",
  declined: "Declined",
  withdrawn: "Withdrawn",
};

const STAGE_COLORS: Record<string, string> = {
  inquiry: "bg-info/15 text-info",
  waitlisted: "bg-info/15 text-info",
  tour_scheduled: "bg-primary/15 text-primary",
  tour_completed: "bg-success/15 text-success",
  offered: "bg-primary/15 text-primary",
  accepted: "bg-success/15 text-success",
  enrolled: "bg-success/20 text-success",
  declined: "bg-destructive/15 text-destructive",
  withdrawn: "bg-muted text-muted-foreground",
};

// ── Helpers ──────────────────────────────────────────────────

function formatDate(
  dateStr: string | null,
  options?: Intl.DateTimeFormatOptions,
): string {
  if (!dateStr) return " - ";
  return new Date(dateStr).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...options,
  });
}

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return " - ";
  return new Date(dateStr).toLocaleString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// ── Page props ───────────────────────────────────────────────

interface EntryDetailPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ action?: string }>;
}

export default async function EntryDetailPage({
  params,
  searchParams,
}: EntryDetailPageProps) {
  const { id } = await params;
  const { action } = await searchParams;

  const context = await getTenantContext();

  if (
    !context.permissions.includes(Permissions.VIEW_WAITLIST) &&
    !context.permissions.includes(Permissions.MANAGE_WAITLIST)
  ) {
    redirect("/dashboard");
  }

  const canManage = context.permissions.includes(Permissions.MANAGE_WAITLIST);

  const result = await getWaitlistEntry(id);

  if (result.error || !result.data) {
    notFound();
  }

  const entry = result.data;
  const childName = `${entry.child_first_name} ${entry.child_last_name}`;
  const parentName = `${entry.parent_first_name} ${entry.parent_last_name}`;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/dashboard" className="hover:text-foreground">
          Dashboard
        </Link>
        <span>/</span>
        <Link href="/admin/admissions" className="hover:text-foreground">
          Admissions
        </Link>
        <span>/</span>
        <span className="text-foreground">{childName}</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-foreground">
              {childName}
            </h1>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${STAGE_COLORS[entry.stage] ?? "bg-muted text-foreground"}`}
            >
              {STAGE_LABELS[entry.stage] ?? entry.stage}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {entry.days_in_pipeline} days in pipeline · Inquiry submitted{" "}
            {formatDate(entry.inquiry_date)}
          </p>
        </div>

        <div className="flex gap-2">
          <Link
            href={`mailto:${entry.parent_email}`}
            className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-sm hover:bg-muted"
          >
            Email Parent
          </Link>
          <Link
            href="/admin/admissions"
            className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-sm hover:bg-muted"
          >
            Back to Pipeline
          </Link>
        </div>
      </div>

      {/* Actions panel (client component) */}
      {canManage && (
        <EntryActions entry={entry} initialAction={action ?? null} />
      )}

      {/* Content grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column - 2/3 width */}
        <div className="space-y-6 lg:col-span-2">
          {/* Child Information */}
          <section className="rounded-lg border border-border bg-card p-5">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Child Information
            </h2>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div>
                <dt className="text-muted-foreground">Full Name</dt>
                <dd className="font-medium text-foreground">{childName}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Date of Birth</dt>
                <dd className="font-medium text-foreground">
                  {formatDate(entry.child_date_of_birth)}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Gender</dt>
                <dd className="font-medium text-foreground">
                  {entry.child_gender ?? " - "}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Current School</dt>
                <dd className="font-medium text-foreground">
                  {entry.child_current_school ?? " - "}
                </dd>
              </div>
            </dl>
          </section>

          {/* Parent / Contact */}
          <section className="rounded-lg border border-border bg-card p-5">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Parent / Contact
            </h2>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div>
                <dt className="text-muted-foreground">Name</dt>
                <dd className="font-medium text-foreground">{parentName}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Email</dt>
                <dd className="font-medium text-foreground">
                  <a
                    href={`mailto:${entry.parent_email}`}
                    className="text-primary hover:underline"
                  >
                    {entry.parent_email}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Phone</dt>
                <dd className="font-medium text-foreground">
                  {entry.parent_phone ?? " - "}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Siblings at School</dt>
                <dd className="font-medium text-foreground">
                  {entry.siblings_at_school
                    ? (entry.sibling_names ?? "Yes")
                    : "No"}
                </dd>
              </div>
            </dl>
          </section>

          {/* Program Preferences */}
          <section className="rounded-lg border border-border bg-card p-5">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Program Preferences
            </h2>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div>
                <dt className="text-muted-foreground">Requested Program</dt>
                <dd className="font-medium text-foreground">
                  {entry.requested_program ?? " - "}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Requested Start</dt>
                <dd className="font-medium text-foreground">
                  {entry.requested_start ??
                    formatDate(entry.requested_start_date) ??
                    " - "}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">How They Heard About Us</dt>
                <dd className="font-medium text-foreground">
                  {entry.how_heard_about_us ?? " - "}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Priority</dt>
                <dd className="font-medium text-foreground">
                  {entry.priority === 0
                    ? "Standard"
                    : `Priority ${entry.priority}`}
                </dd>
              </div>
            </dl>
          </section>

          {/* Tour Details (if applicable) */}
          {(entry.tour_date || entry.tour_notes) && (
            <section className="rounded-lg border border-border bg-card p-5">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Tour Details
              </h2>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <div>
                  <dt className="text-muted-foreground">Tour Date</dt>
                  <dd className="font-medium text-foreground">
                    {formatDateTime(entry.tour_date)}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Attended</dt>
                  <dd className="font-medium text-foreground">
                    {entry.tour_attended === null
                      ? "Pending"
                      : entry.tour_attended
                        ? "Yes"
                        : "No"}
                  </dd>
                </div>
                {entry.tour_notes && (
                  <div className="col-span-2">
                    <dt className="text-muted-foreground">Tour Notes</dt>
                    <dd className="font-medium text-foreground">
                      {entry.tour_notes}
                    </dd>
                  </div>
                )}
              </dl>
            </section>
          )}

          {/* Offer Details (if applicable) */}
          {entry.offered_at && (
            <section className="rounded-lg border border-border bg-card p-5">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Offer Details
              </h2>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <div>
                  <dt className="text-muted-foreground">Offered Program</dt>
                  <dd className="font-medium text-foreground">
                    {entry.offered_program ?? " - "}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Start Date</dt>
                  <dd className="font-medium text-foreground">
                    {formatDate(entry.offered_start_date)}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Offered On</dt>
                  <dd className="font-medium text-foreground">
                    {formatDateTime(entry.offered_at)}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Expires</dt>
                  <dd className="font-medium text-foreground">
                    {formatDateTime(entry.offer_expires_at)}
                  </dd>
                </div>
                {entry.offer_response && (
                  <>
                    <div>
                      <dt className="text-muted-foreground">Response</dt>
                      <dd className="font-medium text-foreground capitalize">
                        {entry.offer_response}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Responded On</dt>
                      <dd className="font-medium text-foreground">
                        {formatDateTime(entry.offer_response_at)}
                      </dd>
                    </div>
                  </>
                )}
              </dl>
            </section>
          )}

          {/* Notes */}
          {(entry.notes || entry.admin_notes) && (
            <section className="rounded-lg border border-border bg-card p-5">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Notes
              </h2>
              {entry.notes && (
                <div className="mb-3">
                  <p className="text-xs font-medium text-muted-foreground">
                    Parent Notes
                  </p>
                  <p className="mt-1 text-sm text-foreground whitespace-pre-wrap">
                    {entry.notes}
                  </p>
                </div>
              )}
              {entry.admin_notes && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Admin Notes
                  </p>
                  <p className="mt-1 text-sm text-foreground whitespace-pre-wrap">
                    {entry.admin_notes}
                  </p>
                </div>
              )}
            </section>
          )}
        </div>

        {/* Right column - stage history timeline */}
        <div className="lg:col-span-1">
          <section className="rounded-lg border border-border bg-card p-5">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Pipeline History
            </h2>
            <StageHistoryTimeline history={entry.stage_history} />
          </section>

          {/* Source tracking */}
          {(entry.source_url || entry.source_campaign) && (
            <section className="mt-6 rounded-lg border border-border bg-card p-5">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Source Tracking
              </h2>
              <dl className="space-y-2 text-sm">
                {entry.source_campaign && (
                  <div>
                    <dt className="text-muted-foreground">Campaign</dt>
                    <dd className="font-medium text-foreground">
                      {entry.source_campaign}
                    </dd>
                  </div>
                )}
                {entry.source_url && (
                  <div>
                    <dt className="text-muted-foreground">Referrer URL</dt>
                    <dd className="truncate font-medium text-foreground">
                      {entry.source_url}
                    </dd>
                  </div>
                )}
              </dl>
            </section>
          )}

          {/* Conversion link */}
          {entry.converted_application_id && (
            <div className="mt-6">
              <Link
                href={`/admin/enrollment/applications/${entry.converted_application_id}`}
                className="block rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-center text-sm font-medium text-success hover:bg-success/15"
              >
                View Enrollment Application →
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Stage History Timeline (server sub-component) ────────────

function StageHistoryTimeline({ history }: { history: StageHistoryRecord[] }) {
  if (history.length === 0) {
    return (
      <p className="py-4 text-center text-xs text-muted-foreground">
        No history recorded yet.
      </p>
    );
  }

  return (
    <div className="relative">
      {/* Vertical line */}
      <div className="absolute left-3 top-2 bottom-2 w-px bg-muted" />

      <ul className="space-y-4">
        {history.map((record) => (
          <li key={record.id} className="relative flex gap-3 pl-8">
            {/* Dot */}
            <div
              className={`absolute left-1.5 top-1.5 h-3 w-3 rounded-full border-2 border-card ${STAGE_COLORS[record.to_stage]?.split(" ")[0] ?? "bg-muted"}`}
            />

            <div className="min-w-0 flex-1">
              <p className="text-sm text-foreground">
                {record.from_stage ? (
                  <>
                    <span className="text-muted-foreground">
                      {STAGE_LABELS[record.from_stage] ?? record.from_stage}
                    </span>
                    {" → "}
                    <span className="font-medium">
                      {STAGE_LABELS[record.to_stage] ?? record.to_stage}
                    </span>
                  </>
                ) : (
                  <span className="font-medium">
                    {STAGE_LABELS[record.to_stage] ?? record.to_stage}
                  </span>
                )}
              </p>

              {record.notes && (
                <p className="mt-0.5 text-xs text-muted-foreground">{record.notes}</p>
              )}

              <p className="mt-0.5 text-[10px] text-muted-foreground">
                {formatDateTime(record.created_at)}
                {record.changed_by_name && ` · ${record.changed_by_name}`}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
