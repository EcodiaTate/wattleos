import { redirect } from "next/navigation";
import Link from "next/link";
import {
  getTenantContext,
  hasPermission,
} from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { ComplaintForm } from "@/components/domain/policies/complaint-form";

export const metadata = { title: "Register Complaint - WattleOS" };

export default async function NewComplaintPage() {
  const context = await getTenantContext();

  if (!hasPermission(context, Permissions.MANAGE_COMPLAINTS)) {
    redirect("/admin/policies");
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex items-center gap-2 text-sm">
        <Link
          href="/admin/policies"
          className="underline-offset-2 hover:underline"
          style={{ color: "var(--primary)" }}
        >
          Policies & Complaints
        </Link>
        <span style={{ color: "var(--muted-foreground)" }}>/</span>
        <span style={{ color: "var(--foreground)" }}>Register Complaint</span>
      </div>

      <div>
        <h1
          className="text-xl font-bold sm:text-2xl"
          style={{ color: "var(--foreground)" }}
        >
          Register Complaint
        </h1>
        <p
          className="mt-1 text-sm"
          style={{ color: "var(--muted-foreground)" }}
        >
          Record a complaint, grievance, or concern in the complaints register (Reg 170)
        </p>
      </div>

      <div
        className="rounded-xl border border-border p-5"
        style={{ backgroundColor: "var(--card)" }}
      >
        <ComplaintForm />
      </div>
    </div>
  );
}
