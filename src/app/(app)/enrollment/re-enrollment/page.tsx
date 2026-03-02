// src/app/(app)/admin/enrollment/re-enrollment/page.tsx
//
// ============================================================
// WattleOS V2 - Re-enrollment Dashboard (Admin, Module 10)
// ============================================================
// Route: /admin/enrollment/re-enrollment
// Server component that shows a class-by-class grid of
// re-enrollment status: confirmed, pending, leaving, new.
//
// WHY this view: During re-enrollment season, admins need to
// see at a glance which students are confirmed for next year,
// who hasn't responded yet, and which families are leaving.
// This drives follow-up actions and staffing decisions.
// ============================================================

import { getTenantContext } from "@/lib/auth/tenant-context";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Re-enrollment Dashboard - WattleOS",
};

interface ReEnrollmentApp {
  id: string;
  status: string;
  child_first_name: string;
  child_last_name: string;
  submitted_by_email: string;
  requested_program: string | null;
  existing_student_id: string | null;
  submitted_at: string | null;
}

interface EnrollmentPeriodOption {
  id: string;
  name: string;
  year: number;
}

interface ReEnrollPageProps {
  searchParams: Promise<{ period?: string }>;
}

export default async function ReEnrollmentDashboard({
  searchParams,
}: ReEnrollPageProps) {
  const ctx = await getTenantContext();
  if (!ctx) redirect("/login");

  const supabase = await createSupabaseServerClient();
  const params = await searchParams;

  // Fetch re-enrollment periods
  const { data: periods } = await supabase
    .from("enrollment_periods")
    .select("id, name, year")
    .eq("tenant_id", ctx.tenant.id)
    .eq("period_type", "re_enrollment")
    .is("deleted_at", null)
    .order("year", { ascending: false })
    .order("created_at", { ascending: false });

  const periodOptions = (periods ?? []) as EnrollmentPeriodOption[];
  const selectedPeriodId = params.period ?? periodOptions[0]?.id ?? null;

  if (!selectedPeriodId || periodOptions.length === 0) {
    return (
      <div>
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Re-enrollment Dashboard
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Track re-enrollment status by class.
            </p>
          </div>
          <Link
            href="/admin/enrollment/new"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-background hover:bg-primary"
          >
            Create Re-enrollment Period
          </Link>
        </div>
        <div className="rounded-lg border border-border bg-card px-6 py-12 text-center">
          <p className="text-sm text-muted-foreground">
            No re-enrollment periods found. Create one to get started.
          </p>
        </div>
      </div>
    );
  }

  // Fetch all applications for this re-enrollment period
  const { data: applications } = await supabase
    .from("enrollment_applications")
    .select(
      "id, status, child_first_name, child_last_name, submitted_by_email, requested_program, existing_student_id, submitted_at",
    )
    .eq("tenant_id", ctx.tenant.id)
    .eq("enrollment_period_id", selectedPeriodId)
    .is("deleted_at", null)
    .order("child_last_name", { ascending: true });

  const apps = (applications ?? []) as ReEnrollmentApp[];

  // Group by status
  const confirmed = apps.filter((a) => a.status === "approved");
  const pending = apps.filter((a) =>
    ["submitted", "under_review"].includes(a.status),
  );
  const changesRequested = apps.filter((a) => a.status === "changes_requested");
  const notResponded = apps.filter((a) => a.status === "draft");
  const withdrawn = apps.filter(
    (a) => a.status === "withdrawn" || a.status === "rejected",
  );

  const totalApps = apps.length;
  const confirmedPct =
    totalApps > 0 ? Math.round((confirmed.length / totalApps) * 100) : 0;

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Re-enrollment Dashboard
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track re-enrollment status for returning families.
          </p>
        </div>
        <Link
          href="/admin/enrollment"
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
        >
          ← All Periods
        </Link>
      </div>

      {/* Period selector */}
      {periodOptions.length > 1 && (
        <div className="mb-6">
          <div className="flex gap-2">
            {periodOptions.map((p) => (
              <Link
                key={p.id}
                href={`/admin/enrollment/re-enrollment?period=${p.id}`}
                className={`rounded-lg px-4 py-2 text-sm font-medium ${
                  p.id === selectedPeriodId
                    ? "bg-primary text-background"
                    : "border border-border text-foreground hover:bg-muted"
                }`}
              >
                {p.name} ({p.year})
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-5">
        <StatCard label="Confirmed" count={confirmed.length} color="green" />
        <StatCard label="Pending Review" count={pending.length} color="blue" />
        <StatCard
          label="Changes Req."
          count={changesRequested.length}
          color="orange"
        />
        <StatCard
          label="Not Responded"
          count={notResponded.length}
          color="gray"
        />
        <StatCard label="Leaving" count={withdrawn.length} color="red" />
      </div>

      {/* Progress bar */}
      <div className="mb-6">
        <div className="mb-1 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Overall confirmation: {confirmed.length} / {totalApps}
          </span>
          <span className="font-medium text-foreground">{confirmedPct}%</span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-success transition-all"
            style={{ width: `${confirmedPct}%` }}
          />
        </div>
      </div>

      {/* Status groups */}
      {notResponded.length > 0 && (
        <StatusGroup
          title="Not Yet Responded"
          description="Invitations sent but no submission received."
          apps={notResponded}
          badgeColor="bg-muted text-muted-foreground"
        />
      )}

      {pending.length > 0 && (
        <StatusGroup
          title="Pending Review"
          description="Parents have submitted - awaiting admin review."
          apps={pending}
          badgeColor="bg-info/10 text-info"
        />
      )}

      {changesRequested.length > 0 && (
        <StatusGroup
          title="Changes Requested"
          description="Sent back to parents for updates."
          apps={changesRequested}
          badgeColor="bg-primary/10 text-primary"
        />
      )}

      {confirmed.length > 0 && (
        <StatusGroup
          title="Confirmed"
          description="Approved for next year."
          apps={confirmed}
          badgeColor="bg-success/10 text-success"
        />
      )}

      {withdrawn.length > 0 && (
        <StatusGroup
          title="Leaving / Declined"
          description="Withdrawn or not accepted."
          apps={withdrawn}
          badgeColor="bg-destructive/10 text-destructive"
        />
      )}
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────

function StatCard({
  label,
  count,
  color,
}: {
  label: string;
  count: number;
  color: string;
}) {
  const colorMap: Record<string, string> = {
    green: "border-success/30 bg-success/10 text-success",
    blue: "border-info/30 bg-info/10 text-info",
    orange: "border-primary/30 bg-primary/10 text-primary",
    gray: "border-border bg-muted text-muted-foreground",
    red: "border-destructive/30 bg-destructive/10 text-destructive",
  };

  return (
    <div
      className={`rounded-lg border px-4 py-3 ${colorMap[color] ?? colorMap.gray}`}
    >
      <div className="text-2xl font-bold">{count}</div>
      <div className="text-xs font-medium">{label}</div>
    </div>
  );
}

function StatusGroup({
  title,
  description,
  apps,
  badgeColor,
}: {
  title: string;
  description: string;
  apps: ReEnrollmentApp[];
  badgeColor: string;
}) {
  return (
    <div className="mb-6">
      <div className="mb-3">
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                Student
              </th>
              <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                Parent Email
              </th>
              <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                Program
              </th>
              <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                Status
              </th>
              <th className="px-4 py-2 text-right font-medium text-muted-foreground">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {apps.map((app) => (
              <tr key={app.id} className="hover:bg-muted">
                <td className="px-4 py-2.5 font-medium text-foreground">
                  {app.child_first_name} {app.child_last_name}
                </td>
                <td className="px-4 py-2.5 text-muted-foreground">
                  {app.submitted_by_email}
                </td>
                <td className="px-4 py-2.5 text-muted-foreground">
                  {app.requested_program
                    ? app.requested_program.replace(/_/g, " ")
                    : " - "}
                </td>
                <td className="px-4 py-2.5">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${badgeColor}`}
                  >
                    {app.status.replace(/_/g, " ")}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right">
                  {app.status !== "draft" ? (
                    <Link
                      href={`/admin/enrollment/applications/${app.id}`}
                      className="text-xs font-medium text-primary hover:text-primary"
                    >
                      Review →
                    </Link>
                  ) : (
                    <span className="text-xs text-muted-foreground">Awaiting</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
