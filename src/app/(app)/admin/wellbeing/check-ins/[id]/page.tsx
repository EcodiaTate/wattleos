import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { getCheckIn } from "@/lib/actions/wellbeing";
import { listActiveStudents } from "@/lib/actions/students";
import { CheckInForm } from "@/components/domain/wellbeing/check-in-form";

export const metadata = { title: "Check-in Detail - WattleOS" };

export default async function CheckInDetailPage({
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

  const [checkInResult, studentsResult] = await Promise.all([
    getCheckIn(id),
    listActiveStudents(),
  ]);

  if (checkInResult.error || !checkInResult.data) notFound();

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/wellbeing/check-ins" className="text-sm font-medium" style={{ color: "var(--primary)" }}>
          ← Back
        </Link>
        <div>
          <h1 className="text-xl font-bold sm:text-2xl" style={{ color: "var(--foreground)" }}>
            Check-in
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--muted-foreground)" }}>
            {checkInResult.data.students.preferred_name || `${checkInResult.data.students.first_name} ${checkInResult.data.students.last_name}`}
          </p>
        </div>
      </div>
      <div className="max-w-2xl">
        <CheckInForm
          students={studentsResult.data ?? []}
          checkIn={checkInResult.data}
          canManage={canManage}
        />
      </div>
    </div>
  );
}
