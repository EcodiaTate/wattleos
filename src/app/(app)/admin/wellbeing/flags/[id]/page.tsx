import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { getWellbeingFlag } from "@/lib/actions/wellbeing";
import { listActiveStudents } from "@/lib/actions/students";
import { WellbeingFlagForm } from "@/components/domain/wellbeing/wellbeing-flag-form";

export const metadata = { title: "Wellbeing Flag - WattleOS" };

export default async function WellbeingFlagDetailPage({
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

  const [flagResult, studentsResult] = await Promise.all([
    getWellbeingFlag(id),
    listActiveStudents(),
  ]);

  if (flagResult.error || !flagResult.data) notFound();

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/wellbeing/flags" className="text-sm font-medium" style={{ color: "var(--primary)" }}>
          ← Back
        </Link>
        <div>
          <h1 className="text-xl font-bold sm:text-2xl" style={{ color: "var(--foreground)" }}>
            Wellbeing Flag
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--muted-foreground)" }}>
            {flagResult.data.students.preferred_name || `${flagResult.data.students.first_name} ${flagResult.data.students.last_name}`}
          </p>
        </div>
      </div>
      <div className="max-w-2xl">
        <WellbeingFlagForm
          students={studentsResult.data ?? []}
          flag={flagResult.data}
          canManage={canManage}
        />
      </div>
    </div>
  );
}
