import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { getReferral } from "@/lib/actions/wellbeing";
import { listActiveStudents } from "@/lib/actions/students";
import { ReferralForm } from "@/components/domain/wellbeing/referral-form";

export const metadata = { title: "Referral Detail - WattleOS" };

export default async function ReferralDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const context = await getTenantContext();

  const canView =
    hasPermission(context, Permissions.VIEW_WELLBEING) ||
    hasPermission(context, Permissions.MANAGE_REFERRALS);
  if (!canView) redirect("/dashboard");

  const canManage = hasPermission(context, Permissions.MANAGE_REFERRALS);

  const [referralResult, studentsResult] = await Promise.all([
    getReferral(id),
    listActiveStudents(),
  ]);

  if (referralResult.error || !referralResult.data) notFound();

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/wellbeing/referrals" className="text-sm font-medium" style={{ color: "var(--primary)" }}>
          ← Back
        </Link>
        <div>
          <h1 className="text-xl font-bold sm:text-2xl" style={{ color: "var(--foreground)" }}>
            Referral Detail
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--muted-foreground)" }}>
            {referralResult.data.students.preferred_name || `${referralResult.data.students.first_name} ${referralResult.data.students.last_name}`}
          </p>
        </div>
      </div>
      <div className="max-w-2xl">
        <ReferralForm
          students={studentsResult.data ?? []}
          referral={referralResult.data}
          canManage={canManage}
        />
      </div>
    </div>
  );
}