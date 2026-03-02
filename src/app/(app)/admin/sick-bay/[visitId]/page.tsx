import { redirect } from "next/navigation";
import Link from "next/link";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { getSickBayVisit } from "@/lib/actions/sick-bay";
import { listActiveStudents } from "@/lib/actions/students";
import { VisitForm } from "@/components/domain/sick-bay/visit-form";
import { SickBayStatusBadge } from "@/components/domain/sick-bay/sick-bay-status-badge";

interface VisitPageProps {
  params: Promise<{ visitId: string }>;
}

export const metadata = { title: "View Visit - Sick Bay - WattleOS" };

export default async function VisitPage({ params }: VisitPageProps) {
  const { visitId } = await params;
  const context = await getTenantContext();

  const canView =
    hasPermission(context, Permissions.VIEW_SICK_BAY) ||
    hasPermission(context, Permissions.MANAGE_SICK_BAY);
  if (!canView) redirect("/dashboard");

  const canManage = hasPermission(context, Permissions.MANAGE_SICK_BAY);

  const visitResult = await getSickBayVisit(visitId);

  if (visitResult.error || !visitResult.data) {
    return (
      <div className="space-y-6 p-4 sm:p-6">
        <Link href="/admin/sick-bay" className="text-sm" style={{ color: "var(--primary)" }}>
          ← Back to Sick Bay
        </Link>
        <p style={{ color: "var(--destructive)" }}>
          {visitResult.error?.message ?? "Visit not found."}
        </p>
      </div>
    );
  }

  const studentsResult = canManage ? await listActiveStudents() : null;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <Link href="/admin/sick-bay" className="text-sm" style={{ color: "var(--primary)" }}>
          ← Back to Sick Bay
        </Link>
        <div className="mt-2 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold sm:text-2xl" style={{ color: "var(--foreground)" }}>
              {visitResult.data.student.first_name} {visitResult.data.student.last_name}
            </h1>
            <p className="mt-1 text-sm" style={{ color: "var(--muted-foreground)" }}>
              Visit on {new Date(visitResult.data.visit_date).toLocaleDateString()}
            </p>
          </div>
          <SickBayStatusBadge status={visitResult.data.status} size="md" />
        </div>
      </div>

      {/* Visit Summary */}
      <div className="grid gap-4 sm:grid-cols-2">
        {visitResult.data.presenting_complaint && (
          <div
            className="rounded-lg border border-border p-4"
            style={{ backgroundColor: "var(--card)" }}
          >
            <h3 className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: "var(--muted-foreground)" }}>
              Presenting Complaint
            </h3>
            <p className="mt-2" style={{ color: "var(--foreground)" }}>
              {visitResult.data.presenting_complaint}
            </p>
          </div>
        )}

        {visitResult.data.treatment_given && (
          <div
            className="rounded-lg border border-border p-4"
            style={{ backgroundColor: "var(--card)" }}
          >
            <h3 className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: "var(--muted-foreground)" }}>
              Treatment Given
            </h3>
            <p className="mt-2" style={{ color: "var(--foreground)" }}>
              {visitResult.data.treatment_given}
            </p>
          </div>
        )}

        {visitResult.data.arrived_at && (
          <div
            className="rounded-lg border border-border p-4"
            style={{ backgroundColor: "var(--card)" }}
          >
            <h3 className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: "var(--muted-foreground)" }}>
              Arrived At
            </h3>
            <p className="mt-2" style={{ color: "var(--foreground)" }}>
              {new Date(visitResult.data.arrived_at).toLocaleString()}
            </p>
          </div>
        )}

        {visitResult.data.departed_at && (
          <div
            className="rounded-lg border border-border p-4"
            style={{ backgroundColor: "var(--card)" }}
          >
            <h3 className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: "var(--muted-foreground)" }}>
              Departed At
            </h3>
            <p className="mt-2" style={{ color: "var(--foreground)" }}>
              {new Date(visitResult.data.departed_at).toLocaleString()}
            </p>
          </div>
        )}

        {visitResult.data.parent_notified && (
          <div
            className="rounded-lg border border-border p-4"
            style={{ backgroundColor: "var(--card)" }}
          >
            <h3 className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: "var(--muted-foreground)" }}>
              Parent Notified
            </h3>
            <p className="mt-2" style={{ color: "var(--foreground)" }}>
              {visitResult.data.parent_notified_at
                ? new Date(visitResult.data.parent_notified_at).toLocaleString()
                : "Yes"}
            </p>
          </div>
        )}

        {visitResult.data.ambulance_called && (
          <div
            className="rounded-lg border border-border p-4"
            style={{
              backgroundColor: "var(--card)",
              borderColor: "var(--destructive)",
            }}
          >
            <h3 className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: "var(--destructive)" }}>
              Ambulance Called
            </h3>
            <p className="mt-2" style={{ color: "var(--foreground)" }}>
              Yes
            </p>
          </div>
        )}
      </div>

      {/* Edit Form */}
      {canManage && studentsResult?.data && (
        <div
          className="rounded-lg border border-border p-6"
          style={{ backgroundColor: "var(--card)" }}
        >
          <h2 className="mb-4 text-lg font-semibold" style={{ color: "var(--foreground)" }}>
            Edit Visit
          </h2>
          <VisitForm
            students={studentsResult.data}
            visit={visitResult.data}
            canManage={canManage}
          />
        </div>
      )}
    </div>
  );
}
