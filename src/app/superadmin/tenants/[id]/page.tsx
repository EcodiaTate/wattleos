// src/app/(superadmin)/tenants/[id]/page.tsx
//
// ============================================================
// WattleOS V2 - Super Admin: Tenant Detail
// ============================================================
// Shows tenant info, setup token history, and quick actions:
// generate new setup link, suspend, reactivate.
// ============================================================

import {
  getTenantDetail,
  generateSetupToken,
  suspendTenant,
  reactivateTenant,
  ensureTenantRolesSeeded,
} from "@/lib/actions/superadmin/tenants";
import type { TenantSetupToken, SubscriptionStatus } from "@/types/domain";
import Link from "next/link";
import { GenerateTokenForm } from "./generate-token-form";

export const metadata = { title: "Tenant Detail - WattleOS Platform Admin" };

interface PageProps {
  params: Promise<{ id: string }>;
}

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

function TokenRow({ token }: { token: TenantSetupToken }) {
  const isUsed = token.used_at !== null;
  const isExpired = !isUsed && new Date(token.expires_at) < new Date();
  const isActive = !isUsed && !isExpired;

  let statusLabel = "Active";
  let statusColor = "#166534";
  if (isUsed) {
    statusLabel = "Used";
    statusColor = "#6b7280";
  }
  if (isExpired) {
    statusLabel = "Expired";
    statusColor = "#991b1b";
  }

  return (
    <tr
      className="border-b text-sm"
      style={{ borderColor: "var(--border)", opacity: isActive ? 1 : 0.6 }}
    >
      <td className="px-4 py-3" style={{ color: "var(--muted-foreground)" }}>
        {token.email}
      </td>
      <td className="px-4 py-3">
        <span style={{ color: statusColor, fontWeight: 500 }}>
          {statusLabel}
        </span>
      </td>
      <td className="px-4 py-3" style={{ color: "var(--muted-foreground)" }}>
        {isUsed
          ? `Used ${new Date(token.used_at!).toLocaleDateString("en-AU")}`
          : `Expires ${new Date(token.expires_at).toLocaleDateString("en-AU")}`}
      </td>
      <td className="px-4 py-3">
        {isActive && (
          <code
            className="rounded px-2 py-0.5 text-xs"
            style={{ background: "var(--muted)", color: "var(--foreground)" }}
          >
            {token.token.slice(0, 16)}…
          </code>
        )}
      </td>
    </tr>
  );
}

// ── Page ─────────────────────────────────────────────────────

export default async function TenantDetailPage({ params }: PageProps) {
  const { id } = await params;
  const result = await getTenantDetail(id);

  if (result.error || !result.data) {
    return (
      <div>
        <Link
          href="/superadmin/tenants"
          className="text-sm hover:underline"
          style={{ color: "var(--muted-foreground)" }}
        >
          ← Tenants
        </Link>
        <p className="mt-4 text-sm" style={{ color: "var(--destructive)" }}>
          {result.error?.message ?? "Tenant not found"}
        </p>
      </div>
    );
  }

  const tenant = result.data;
  const isSuspended = !tenant.is_active;

  return (
    <div className="space-y-6">
      {/* Back nav */}
      <Link
        href="/superadmin/tenants"
        className="inline-block text-sm hover:underline"
        style={{ color: "var(--muted-foreground)" }}
      >
        ← Tenants
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1
              className="text-2xl font-bold"
              style={{ color: "var(--foreground)" }}
            >
              {tenant.name}
            </h1>
            <StatusBadge status={tenant.subscription_status} />
            {isSuspended && (
              <span
                className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                style={{
                  background: "var(--destructive)",
                  color: "var(--destructive-foreground)",
                }}
              >
                Inactive
              </span>
            )}
          </div>
          <p
            className="mt-1 text-sm"
            style={{ color: "var(--muted-foreground)" }}
          >
            {tenant.slug} · {tenant.plan_tier} plan · {tenant.user_count} user
            {tenant.user_count !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Repair Roles - idempotent, safe on any tenant */}
          <form
            action={async () => {
              "use server";
              await ensureTenantRolesSeeded(id);
            }}
          >
            <button
              type="submit"
              className="rounded-lg border px-4 py-2 text-sm font-medium transition-opacity hover:opacity-80"
              style={{
                borderColor: "var(--border)",
                color: "var(--muted-foreground)",
              }}
              title="Seed or repair system roles for this tenant"
            >
              Repair Roles
            </button>
          </form>

          {/* Suspend / Reactivate */}
          <form
            action={async () => {
              "use server";
              if (isSuspended) {
                await reactivateTenant(id);
              } else {
                await suspendTenant(id);
              }
            }}
          >
            <button
              type="submit"
              className="rounded-lg border px-4 py-2 text-sm font-medium transition-opacity hover:opacity-80"
              style={{
                borderColor: isSuspended
                  ? "var(--primary)"
                  : "var(--destructive)",
                color: isSuspended ? "var(--primary)" : "var(--destructive)",
              }}
            >
              {isSuspended ? "Reactivate" : "Suspend"}
            </button>
          </form>
        </div>
      </div>

      {/* Tenant Info */}
      <div
        className="rounded-xl border p-5"
        style={{ borderColor: "var(--border)", background: "var(--card)" }}
      >
        <h2
          className="mb-4 text-sm font-semibold"
          style={{ color: "var(--foreground)" }}
        >
          Details
        </h2>
        <dl className="grid grid-cols-3 gap-4 text-sm">
          {[
            { label: "ID", value: tenant.id },
            { label: "Timezone", value: tenant.timezone },
            { label: "Country", value: tenant.country },
            { label: "Currency", value: tenant.currency },
            {
              label: "Activated",
              value: tenant.activated_at
                ? new Date(tenant.activated_at).toLocaleDateString("en-AU")
                : "-",
            },
            {
              label: "Trial ends",
              value: tenant.trial_ends_at
                ? new Date(tenant.trial_ends_at).toLocaleDateString("en-AU")
                : "-",
            },
            {
              label: "Stripe sub",
              value: tenant.stripe_platform_subscription_id ?? "-",
            },
            {
              label: "Created",
              value: new Date(tenant.created_at).toLocaleDateString("en-AU"),
            },
          ].map(({ label, value }) => (
            <div key={label}>
              <dt
                className="text-xs font-medium"
                style={{ color: "var(--muted-foreground)" }}
              >
                {label}
              </dt>
              <dd
                className="mt-0.5 font-mono text-xs"
                style={{ color: "var(--foreground)" }}
              >
                {value}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Setup Tokens */}
      <div
        className="rounded-xl border"
        style={{ borderColor: "var(--border)", background: "var(--card)" }}
      >
        <div
          className="flex items-center justify-between border-b px-5 py-4"
          style={{ borderColor: "var(--border)" }}
        >
          <h2
            className="text-sm font-semibold"
            style={{ color: "var(--foreground)" }}
          >
            Owner Setup Links
          </h2>
        </div>

        {tenant.setup_tokens.length === 0 ? (
          <p
            className="px-5 py-4 text-sm"
            style={{ color: "var(--muted-foreground)" }}
          >
            No setup links generated yet.
          </p>
        ) : (
          <table className="w-full">
            <thead>
              <tr
                className="border-b text-left text-xs font-medium uppercase tracking-wide"
                style={{
                  borderColor: "var(--border)",
                  color: "var(--muted-foreground)",
                }}
              >
                <th className="px-4 py-2">Email</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2">Token</th>
              </tr>
            </thead>
            <tbody>
              {tenant.setup_tokens.map((t) => (
                <TokenRow key={t.id} token={t} />
              ))}
            </tbody>
          </table>
        )}

        {/* Generate new token */}
        <div
          className="border-t px-5 py-4"
          style={{ borderColor: "var(--border)" }}
        >
          <h3
            className="mb-3 text-xs font-semibold uppercase tracking-wide"
            style={{ color: "var(--muted-foreground)" }}
          >
            Generate New Setup Link
          </h3>
          <GenerateTokenForm tenantId={id} action={generateSetupToken} />
        </div>
      </div>
    </div>
  );
}
