import { redirect } from "next/navigation";
import Link from "next/link";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { listActiveStudents } from "@/lib/actions/students";
import { WellbeingFlagForm } from "@/components/domain/wellbeing/wellbeing-flag-form";

export const metadata = { title: "Raise Wellbeing Flag - WattleOS" };

export default async function NewWellbeingFlagPage() {
  const context = await getTenantContext();
  if (!hasPermission(context, Permissions.MANAGE_WELLBEING)) redirect("/dashboard");

  const studentsResult = await listActiveStudents();

  if (studentsResult.error || !studentsResult.data) {
    return (
      <div className="p-4 sm:p-6">
        <p style={{ color: "var(--destructive)" }}>
          {studentsResult.error?.message ?? "Failed to load students."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/wellbeing/flags" className="text-sm font-medium" style={{ color: "var(--primary)" }}>
          ← Back
        </Link>
        <div>
          <h1 className="text-xl font-bold sm:text-2xl" style={{ color: "var(--foreground)" }}>
            Raise Wellbeing Flag
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--muted-foreground)" }}>
            Record a concern about a student
          </p>
        </div>
      </div>
      <div className="max-w-2xl">
        <WellbeingFlagForm students={studentsResult.data} canManage={true} />
      </div>
    </div>
  );
}
