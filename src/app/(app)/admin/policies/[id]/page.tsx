import { redirect } from "next/navigation";
import Link from "next/link";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { getPolicy, getPolicyAcknowledgements } from "@/lib/actions/policies";
import { PolicyStatusBadge } from "@/components/domain/policies/policy-status-badge";
import { PolicyEditor } from "@/components/domain/policies/policy-editor";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Policy Detail - WattleOS" };

interface Props {
  params: Promise<{ id: string }>;
}

export default async function PolicyDetailPage({ params }: Props) {
  const { id } = await params;
  const context = await getTenantContext();

  if (!hasPermission(context, Permissions.MANAGE_POLICIES)) {
    redirect("/dashboard");
  }

  const result = await getPolicy(id);

  if (result.error || !result.data) {
    return (
      <div className="p-4 sm:p-6">
        <p style={{ color: "var(--destructive)" }}>
          {result.error?.message ?? "Policy not found."}
        </p>
        <Link
          href="/admin/policies"
          className="mt-2 inline-block text-sm underline"
          style={{ color: "var(--primary)" }}
        >
          Back to policies
        </Link>
      </div>
    );
  }

  const policy = result.data;

  // Get acknowledgements for current version
  const acksResult = await getPolicyAcknowledgements(id, policy.version);
  const acknowledgements = acksResult.data ?? [];

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <Link
          href="/admin/policies"
          className="underline-offset-2 hover:underline"
          style={{ color: "var(--primary)" }}
        >
          Policies
        </Link>
        <span style={{ color: "var(--muted-foreground)" }}>/</span>
        <span className="truncate" style={{ color: "var(--foreground)" }}>
          {policy.title}
        </span>
      </div>

      {/* Header */}
      <div
        className="rounded-xl border border-border p-5"
        style={{ backgroundColor: "var(--card)" }}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1
              className="text-xl font-bold"
              style={{ color: "var(--foreground)" }}
            >
              {policy.title}
            </h1>
            <div
              className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm"
              style={{ color: "var(--muted-foreground)" }}
            >
              <span className="capitalize">
                {policy.category.replace(/_/g, " ")}
              </span>
              <span>Version {policy.version}</span>
              {policy.regulation_reference && (
                <span>{policy.regulation_reference}</span>
              )}
              {policy.effective_date && (
                <span>Effective {formatDate(policy.effective_date)}</span>
              )}
              {policy.review_date && (
                <span>Review by {formatDate(policy.review_date)}</span>
              )}
            </div>
          </div>
          <PolicyStatusBadge status={policy.status} size="md" />
        </div>
      </div>

      {/* Editor */}
      <div
        className="rounded-xl border border-border p-5"
        style={{ backgroundColor: "var(--card)" }}
      >
        <h2
          className="mb-4 text-sm font-semibold"
          style={{ color: "var(--foreground)" }}
        >
          Policy Content
        </h2>
        <PolicyEditor policy={policy} />
      </div>

      {/* Version History */}
      {policy.versions.length > 0 && (
        <div
          className="rounded-xl border border-border p-5"
          style={{ backgroundColor: "var(--card)" }}
        >
          <h2
            className="mb-4 text-sm font-semibold"
            style={{ color: "var(--foreground)" }}
          >
            Version History
          </h2>
          <div className="space-y-2">
            {policy.versions.map((version) => (
              <div
                key={version.id}
                className="flex items-center justify-between rounded-[var(--radius-md)] border border-border px-3 py-2"
              >
                <div>
                  <span
                    className="text-sm font-medium"
                    style={{ color: "var(--foreground)" }}
                  >
                    v{version.version}
                  </span>
                  {version.change_summary && (
                    <p
                      className="text-xs"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      {version.change_summary}
                    </p>
                  )}
                </div>
                <span
                  className="text-xs"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  {formatDate(version.created_at)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Acknowledgements */}
      {policy.status === "active" && (
        <div
          className="rounded-xl border border-border p-5"
          style={{ backgroundColor: "var(--card)" }}
        >
          <h2
            className="mb-4 text-sm font-semibold"
            style={{ color: "var(--foreground)" }}
          >
            Staff Acknowledgements - v{policy.version} (
            {acknowledgements.length} received)
          </h2>
          {acknowledgements.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
              No staff members have acknowledged this version yet.
            </p>
          ) : (
            <div className="space-y-1.5">
              {acknowledgements.map((ack) => (
                <div
                  key={ack.id}
                  className="flex items-center justify-between rounded-[var(--radius-md)] border border-border px-3 py-2"
                >
                  <span
                    className="text-sm"
                    style={{ color: "var(--foreground)" }}
                  >
                    {ack.user_id}
                  </span>
                  <span
                    className="text-xs"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    {new Date(ack.acknowledged_at).toLocaleDateString("en-AU", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
