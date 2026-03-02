import { redirect } from "next/navigation";
import Link from "next/link";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { listActiveStudents } from "@/lib/actions/students";
import { VisitForm } from "@/components/domain/sick-bay/visit-form";

export const metadata = { title: "Record Visit - Sick Bay - WattleOS" };

export default async function NewVisitPage() {
  const context = await getTenantContext();

  const canManage = hasPermission(context, Permissions.MANAGE_SICK_BAY);
  if (!canManage) redirect("/admin/sick-bay");

  const studentsResult = await listActiveStudents();

  if (studentsResult.error || !studentsResult.data) {
    return (
      <div className="space-y-6 p-4 sm:p-6">
        <div>
          <Link href="/admin/sick-bay" className="text-sm" style={{ color: "var(--primary)" }}>
            ← Back to Sick Bay
          </Link>
          <h1 className="mt-2 text-xl font-bold sm:text-2xl" style={{ color: "var(--foreground)" }}>
            Record Visit
          </h1>
        </div>
        <p style={{ color: "var(--destructive)" }}>
          {studentsResult.error?.message ?? "Failed to load students."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <Link href="/admin/sick-bay" className="text-sm" style={{ color: "var(--primary)" }}>
          ← Back to Sick Bay
        </Link>
        <h1 className="mt-2 text-xl font-bold sm:text-2xl" style={{ color: "var(--foreground)" }}>
          Record Visit
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--muted-foreground)" }}>
          Create a new sick bay visit record
        </p>
      </div>

      <div
        className="rounded-lg border border-border p-6"
        style={{ backgroundColor: "var(--card)" }}
      >
        <VisitForm students={studentsResult.data} canManage={true} />
      </div>
    </div>
  );
}
