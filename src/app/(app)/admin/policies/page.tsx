import { redirect } from "next/navigation";
import Link from "next/link";
import {
  getTenantContext,
  hasPermission,
} from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { listPolicies } from "@/lib/actions/policies";
import { listComplaints } from "@/lib/actions/policies";
import { PolicyListClient } from "@/components/domain/policies/policy-list-client";
import { ComplaintRegisterClient } from "@/components/domain/policies/complaint-register-client";

export const metadata = { title: "Policies & Complaints - WattleOS" };

export default async function PoliciesPage() {
  const context = await getTenantContext();

  const canManagePolicies = hasPermission(context, Permissions.MANAGE_POLICIES);
  const canViewComplaints =
    hasPermission(context, Permissions.VIEW_COMPLAINTS) ||
    hasPermission(context, Permissions.MANAGE_COMPLAINTS);
  const canManageComplaints = hasPermission(context, Permissions.MANAGE_COMPLAINTS);

  if (!canManagePolicies && !canViewComplaints) redirect("/dashboard");

  const [policiesResult, complaintsResult] = await Promise.all([
    canManagePolicies ? listPolicies() : Promise.resolve({ data: [], error: null, success: true as const }),
    canViewComplaints ? listComplaints() : Promise.resolve({ data: [], error: null, success: true as const }),
  ]);

  return (
    <div className="space-y-8 p-4 sm:p-6">
      {/* Policies section */}
      {canManagePolicies && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1
                className="text-xl font-bold sm:text-2xl"
                style={{ color: "var(--foreground)" }}
              >
                Policies
              </h1>
              <p
                className="mt-1 text-sm"
                style={{ color: "var(--muted-foreground)" }}
              >
                Service policies, procedures, and regulatory requirements (Reg 168)
              </p>
            </div>
            <div className="flex gap-2">
              <Link
                href="/admin/policies/reg168"
                className="active-push touch-target rounded-[var(--radius-md)] border border-border px-4 py-2 text-sm font-semibold"
                style={{ color: "var(--foreground)" }}
              >
                Reg 168 Checklist
              </Link>
              <Link
                href="/admin/policies/new"
                className="active-push touch-target rounded-[var(--radius-md)] px-4 py-2 text-sm font-semibold"
                style={{
                  background: "var(--primary)",
                  color: "var(--primary-foreground)",
                }}
              >
                New Policy
              </Link>
            </div>
          </div>

          {policiesResult.error ? (
            <p style={{ color: "var(--destructive)" }}>
              {policiesResult.error.message ?? "Failed to load policies."}
            </p>
          ) : (
            <PolicyListClient policies={policiesResult.data ?? []} />
          )}
        </section>
      )}

      {/* Complaints section */}
      {canViewComplaints && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2
                className="text-xl font-bold sm:text-2xl"
                style={{ color: "var(--foreground)" }}
              >
                Complaints Register
              </h2>
              <p
                className="mt-1 text-sm"
                style={{ color: "var(--muted-foreground)" }}
              >
                Track and resolve complaints, grievances, and regulatory concerns (Reg 170)
              </p>
            </div>
            {canManageComplaints && (
              <Link
                href="/admin/policies/complaints/new"
                className="active-push touch-target rounded-[var(--radius-md)] border border-border px-4 py-2 text-sm font-semibold"
                style={{ color: "var(--foreground)" }}
              >
                Register Complaint
              </Link>
            )}
          </div>

          {complaintsResult.error ? (
            <p style={{ color: "var(--destructive)" }}>
              {complaintsResult.error.message ?? "Failed to load complaints."}
            </p>
          ) : (
            <ComplaintRegisterClient complaints={complaintsResult.data ?? []} />
          )}
        </section>
      )}
    </div>
  );
}
