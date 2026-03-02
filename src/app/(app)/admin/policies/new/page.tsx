import { redirect } from "next/navigation";
import Link from "next/link";
import {
  getTenantContext,
  hasPermission,
} from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { PolicyEditor } from "@/components/domain/policies/policy-editor";

export const metadata = { title: "New Policy - WattleOS" };

export default async function NewPolicyPage() {
  const context = await getTenantContext();

  if (!hasPermission(context, Permissions.MANAGE_POLICIES)) {
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
          Policies
        </Link>
        <span style={{ color: "var(--muted-foreground)" }}>/</span>
        <span style={{ color: "var(--foreground)" }}>New Policy</span>
      </div>

      <div>
        <h1
          className="text-xl font-bold sm:text-2xl"
          style={{ color: "var(--foreground)" }}
        >
          Create New Policy
        </h1>
        <p
          className="mt-1 text-sm"
          style={{ color: "var(--muted-foreground)" }}
        >
          Draft a new service policy. You can publish it after review.
        </p>
      </div>

      <div
        className="rounded-xl border border-border p-5"
        style={{ backgroundColor: "var(--card)" }}
      >
        <PolicyEditor />
      </div>
    </div>
  );
}
