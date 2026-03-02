import { redirect } from "next/navigation";
import Link from "next/link";
import {
  getTenantContext,
  hasPermission,
} from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { getImmunisationRecord } from "@/lib/actions/immunisation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ImmunisationRecordForm } from "@/components/domain/immunisation/immunisation-record-form";
import { ImmunisationStatusPill } from "@/components/domain/immunisation/immunisation-status-pill";

export const metadata = { title: "Student Immunisation Record - WattleOS" };

interface Props {
  params: Promise<{ studentId: string }>;
}

export default async function ImmunisationStudentPage({ params }: Props) {
  const { studentId } = await params;
  const context = await getTenantContext();

  const canView =
    hasPermission(context, Permissions.VIEW_IMMUNISATION) ||
    hasPermission(context, Permissions.MANAGE_IMMUNISATION);
  if (!canView) redirect("/dashboard");

  const canManage = hasPermission(context, Permissions.MANAGE_IMMUNISATION);

  // Fetch student info
  const supabase = await createSupabaseServerClient();
  const { data: student } = await supabase
    .from("students")
    .select("id, first_name, last_name, dob, enrollment_status")
    .eq("id", studentId)
    .eq("tenant_id", context.tenant.id)
    .is("deleted_at", null)
    .single();

  if (!student) {
    return (
      <div className="p-6">
        <p style={{ color: "var(--destructive)" }}>Student not found.</p>
        <Link
          href="/admin/immunisation"
          className="mt-2 inline-block text-sm underline"
          style={{ color: "var(--primary)" }}
        >
          Back to immunisation dashboard
        </Link>
      </div>
    );
  }

  const result = await getImmunisationRecord(studentId);
  const record = result.data ?? null;
  const displayName =
    `${student.first_name ?? ""} ${student.last_name ?? ""}`.trim();

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <Link
          href="/admin/immunisation"
          className="underline-offset-2 hover:underline"
          style={{ color: "var(--primary)" }}
        >
          Immunisation
        </Link>
        <span style={{ color: "var(--muted-foreground)" }}>/</span>
        <span style={{ color: "var(--foreground)" }}>{displayName}</span>
      </div>

      {/* Student header */}
      <div
        className="rounded-xl border border-border p-5"
        style={{ backgroundColor: "var(--card)" }}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1
              className="text-xl font-bold"
              style={{ color: "var(--foreground)" }}
            >
              {displayName}
            </h1>
            <div
              className="mt-1 flex items-center gap-3 text-sm"
              style={{ color: "var(--muted-foreground)" }}
            >
              {student.dob && (
                <span>
                  DOB:{" "}
                  {new Date(student.dob).toLocaleDateString("en-AU", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              )}
              <span className="capitalize">
                {student.enrollment_status?.replace("_", " ") ?? "Unknown"}
              </span>
            </div>
          </div>

          {record && <ImmunisationStatusPill status={record.status} size="md" />}
        </div>
      </div>

      {/* Record form */}
      <div
        className="rounded-xl border border-border p-5"
        style={{ backgroundColor: "var(--card)" }}
      >
        <h2
          className="mb-4 text-lg font-semibold"
          style={{ color: "var(--foreground)" }}
        >
          {record ? "IHS Record" : "Create IHS Record"}
        </h2>
        <ImmunisationRecordForm
          studentId={studentId}
          record={record}
          canManage={canManage}
        />
      </div>
    </div>
  );
}
