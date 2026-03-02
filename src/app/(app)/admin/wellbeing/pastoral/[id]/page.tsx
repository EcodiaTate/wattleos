import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { getPastoralRecord } from "@/lib/actions/wellbeing";
import { listActiveStudents } from "@/lib/actions/students";
import { PastoralRecordForm } from "@/components/domain/wellbeing/pastoral-record-form";

export const metadata = { title: "Pastoral Record - WattleOS" };

export default async function PastoralRecordDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const context = await getTenantContext();

  const canView =
    hasPermission(context, Permissions.VIEW_WELLBEING) ||
    hasPermission(context, Permissions.MANAGE_WELLBEING);
  if (!canView) redirect("/dashboard");

  const canManage = hasPermission(context, Permissions.MANAGE_WELLBEING);

  const [recordResult, studentsResult] = await Promise.all([
    getPastoralRecord(id),
    listActiveStudents(),
  ]);

  if (recordResult.error || !recordResult.data) notFound();

  const record = recordResult.data;
  const studentName =
    record.students.preferred_name ||
    `${record.students.first_name} ${record.students.last_name}`;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/wellbeing/pastoral"
          className="text-sm font-medium"
          style={{ color: "var(--primary)" }}
        >
          ← Back
        </Link>
        <div>
          <h1
            className="text-xl font-bold sm:text-2xl"
            style={{ color: "var(--foreground)" }}
          >
            Pastoral Record - {studentName}
          </h1>
          <p
            className="mt-1 text-sm"
            style={{ color: "var(--muted-foreground)" }}
          >
            {record.title} ·{" "}
            {new Date(record.date_of_concern).toLocaleDateString("en-AU")}
          </p>
        </div>
      </div>
      <div className="max-w-2xl">
        <PastoralRecordForm
          students={studentsResult.data ?? []}
          record={record}
          canManage={canManage}
        />
      </div>
    </div>
  );
}
