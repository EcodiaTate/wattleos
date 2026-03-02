// src/app/(superadmin)/tenants/page.tsx
//
// ============================================================
// WattleOS V2 - Super Admin: Tenant List
// ============================================================
// Shows all provisioned tenants with billing status, user count,
// and a link to provision a new one.
// ============================================================

import { listAllTenants } from "@/lib/actions/superadmin/tenants";
import type { SubscriptionStatus } from "@/types/domain";
import Link from "next/link";

export const metadata = { title: "Tenants - WattleOS Platform Admin" };

// ── Status badge ──────────────────────────────────────────────

const STATUS_STYLES: Record<
  SubscriptionStatus,
  { label: string; bg: string; fg: string }
> = {
  setup_pending: { label: "Setup Pending", bg: "#fef3c7", fg: "#92400e" },
  trialing: { label: "Trialing", bg: "#dbeafe", fg: "#1e40af" },
  active: { label: "Active", bg: "#dcfce7", fg: "#166534" },
  past_due: { label: "Past Due", bg: "#fee2e2", fg: "#991b1b" },
  canceled: { label: "Canceled", bg: "#f3f4f6", fg: "#6b7280" },
  suspended: { label: "Suspended", bg: "#fde8d8", fg: "#9a3412" },
};

function StatusBadge({ status }: { status: SubscriptionStatus }) {
  const s = STATUS_STYLES[status] ?? STATUS_STYLES.setup_pending;
  return (
    <span
      className="rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{ background: s.bg, color: s.fg }}
    >
      {s.label}
    </span>
  );
}

// ── Page ─────────────────────────────────────────────────────

export default async function TenantsPage() {
  const result = await listAllTenants();

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1
            className="text-2xl font-bold"
            style={{ color: "var(--foreground)" }}
          >
            Tenants
          </h1>
          <p
            className="mt-1 text-sm"
            style={{ color: "var(--muted-foreground)" }}
          >
            {result.data?.length ?? 0} school
            {result.data?.length !== 1 ? "s" : ""} provisioned
          </p>
        </div>
        <Link
          href="/superadmin/tenants/new"
          className="rounded-lg px-4 py-2 text-sm font-medium transition-opacity hover:opacity-90"
          style={{
            background: "var(--primary)",
            color: "var(--primary-foreground)",
          }}
        >
          + Provision School
        </Link>
      </div>

      {/* Error */}
      {result.error && (
        <div
          className="rounded-lg border px-4 py-3 text-sm"
          style={{
            borderColor: "var(--destructive)",
            background:
              "color-mix(in srgb, var(--destructive) 10%, transparent)",
            color: "var(--destructive)",
          }}
        >
          {result.error.message}
        </div>
      )}

      {/* Table */}
      {result.data && result.data.length === 0 && (
        <div
          className="rounded-xl border py-16 text-center"
          style={{
            borderColor: "var(--border)",
            color: "var(--muted-foreground)",
          }}
        >
          <p className="text-sm">
            No tenants yet. Provision your first school to get started.
          </p>
        </div>
      )}

      {result.data && result.data.length > 0 && (
        <div
          className="overflow-hidden rounded-xl border"
          style={{ borderColor: "var(--border)", background: "var(--card)" }}
        >
          <table className="w-full text-sm">
            <thead>
              <tr
                className="border-b text-left text-xs font-medium uppercase tracking-wide"
                style={{
                  borderColor: "var(--border)",
                  color: "var(--muted-foreground)",
                  background: "var(--muted)",
                }}
              >
                <th className="px-4 py-3">School</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Users</th>
                <th className="px-4 py-3">Provisioned</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody
              className="divide-y"
              style={{ borderColor: "var(--border)" }}
            >
              {result.data.map((tenant) => (
                <tr
                  key={tenant.id}
                  className="transition-colors hover:bg-[var(--muted)]"
                  style={{ color: "var(--foreground)" }}
                >
                  <td className="px-4 py-3">
                    <div className="font-medium">{tenant.name}</div>
                    <div
                      className="text-xs"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      {tenant.slug}
                    </div>
                  </td>
                  <td className="px-4 py-3 capitalize">{tenant.plan_tier}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={tenant.subscription_status} />
                  </td>
                  <td className="px-4 py-3">
                    <span className="tabular-nums">{tenant.user_count}</span>
                  </td>
                  <td
                    className="px-4 py-3"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    {new Date(tenant.created_at).toLocaleDateString("en-AU", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/superadmin/tenants/${tenant.id}`}
                      className="font-medium hover:underline"
                      style={{ color: "var(--primary)" }}
                    >
                      Manage →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
