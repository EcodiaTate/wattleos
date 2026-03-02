import { redirect } from "next/navigation";
import Link from "next/link";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { getReg168Compliance } from "@/lib/actions/policies";
import { Reg168ChecklistClient } from "@/components/domain/policies/reg168-checklist-client";

export const metadata = { title: "Reg 168 Compliance Checklist - WattleOS" };

export default async function Reg168Page() {
  const context = await getTenantContext();

  if (!hasPermission(context, Permissions.MANAGE_POLICIES)) redirect("/dashboard");

  const result = await getReg168Compliance();

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-xl font-bold sm:text-2xl"
            style={{ color: "var(--foreground)" }}
          >
            Regulation 168 Compliance
          </h1>
          <p
            className="mt-1 text-sm"
            style={{ color: "var(--muted-foreground)" }}
          >
            Mandatory policies and procedures required for your service
          </p>
        </div>
        <Link
          href="/admin/policies"
          className="active-push touch-target rounded-[var(--radius-md)] border border-border px-4 py-2 text-sm font-semibold"
          style={{ color: "var(--foreground)" }}
        >
          Back to Policies
        </Link>
      </div>

      {result.error ? (
        <p style={{ color: "var(--destructive)" }}>
          {result.error.message ?? "Failed to load compliance data."}
        </p>
      ) : (
        <Reg168ChecklistClient data={result.data!} />
      )}
    </div>
  );
}
