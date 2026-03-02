import { redirect } from "next/navigation";
import Link from "next/link";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { listActiveStudents } from "@/lib/actions/students";
import { ReferralForm } from "@/components/domain/wellbeing/referral-form";

export const metadata = { title: "New Referral - WattleOS" };

export default async function NewReferralPage() {
  const context = await getTenantContext();
  if (!hasPermission(context, Permissions.MANAGE_REFERRALS)) redirect("/dashboard");

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
        <Link href="/admin/wellbeing/referrals" className="text-sm font-medium" style={{ color: "var(--primary)" }}>
          ← Back
        </Link>
        <div>
          <h1 className="text-xl font-bold sm:text-2xl" style={{ color: "var(--foreground)" }}>
            New Referral
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--muted-foreground)" }}>
            Refer a student to an internal or external specialist
          </p>
        </div>
      </div>
      <div className="max-w-2xl">
        <ReferralForm students={studentsResult.data} canManage={true} />
      </div>
    </div>
  );
}