// src/components/domain/debt/debt-dashboard-client.tsx
"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import type { DebtCollectionRecordWithDetails, DebtDashboardData } from "@/types/domain";
import { advanceDebtStage, syncOverdueInvoices } from "@/lib/actions/debt";
import { DebtStageBadge, DebtAgingBadge } from "./debt-stage-badge";
import { useHaptics } from "@/lib/hooks/use-haptics";

function formatCents(c: number) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(c / 100);
}

function formatDate(s: string) {
  return new Date(s).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

interface Props {
  dashboard: DebtDashboardData;
  stages: DebtCollectionRecordWithDetails[];
}

export function DebtDashboardClient({ dashboard, stages }: Props) {
  const haptics = useHaptics();
  const [isPending, startTransition] = useTransition();
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const filtered = stages.filter(s => {
    if (!search) return true;
    const q = search.toLowerCase();
    const inv = s.invoice?.invoice_number?.toLowerCase() ?? "";
    const student = s.student ? `${s.student.first_name} ${s.student.last_name}`.toLowerCase() : "";
    const guardian = s.guardian?.user ? `${s.guardian.user.first_name ?? ""} ${s.guardian.user.last_name ?? ""}`.toLowerCase() : "";
    return inv.includes(q) || student.includes(q) || guardian.includes(q);
  });

  function handleSync() {
    haptics.impact("medium");
    startTransition(async () => {
      const result = await syncOverdueInvoices();
      if (!result.error) {
        setSyncMsg(`Sync complete: ${result.data?.created ?? 0} new records added`);
        setTimeout(() => setSyncMsg(null), 4000);
      }
    });
  }

  const agingOrder = ["1_30", "31_60", "61_90", "91_plus"] as const;
  const agingLabels: Record<string, string> = { "1_30": "1–30 days", "31_60": "31–60 days", "61_90": "61–90 days", "91_plus": "90+ days" };
  const agingTokens: Record<string, string> = { "1_30": "debt-aging-low", "31_60": "debt-aging-medium", "61_90": "debt-aging-high", "91_plus": "debt-aging-high" };

  return (
    <div className="flex flex-col gap-6 pb-tab-bar">

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--foreground)" }}>
            Debt Management
          </h1>
          <p style={{ fontSize: "0.85rem", color: "var(--muted-foreground)" }}>
            Overdue accounts, reminders, payment plans, and write-offs
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSync}
            disabled={isPending}
            className="touch-target active-push"
            style={{
              padding: "0.45rem 0.9rem",
              borderRadius: "var(--radius)",
              border: "1px solid var(--border)",
              background: "var(--card)",
              color: "var(--foreground)",
              fontSize: "0.82rem",
              fontWeight: 600,
              cursor: isPending ? "wait" : "pointer",
              opacity: isPending ? 0.6 : 1,
            }}
          >
            {isPending ? "Syncing…" : "↺ Sync Overdue"}
          </button>
          <Link
            href="/admin/debt/reminders"
            style={{
              padding: "0.45rem 0.9rem",
              borderRadius: "var(--radius)",
              border: "1px solid var(--border)",
              background: "var(--card)",
              color: "var(--foreground)",
              fontSize: "0.82rem",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Reminder Templates
          </Link>
          <Link
            href="/admin/debt/export"
            style={{
              padding: "0.45rem 0.9rem",
              borderRadius: "var(--radius)",
              background: "var(--primary)",
              color: "var(--primary-foreground)",
              fontSize: "0.82rem",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Export CSV
          </Link>
        </div>
      </div>

      {syncMsg && (
        <div style={{
          padding: "0.65rem 1rem",
          borderRadius: "var(--radius)",
          background: "var(--debt-resolved-bg)",
          color: "var(--debt-resolved-fg)",
          fontSize: "0.83rem",
          fontWeight: 500,
        }}>
          {syncMsg}
        </div>
      )}

      {/* ── KPI Row ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard
          label="Total Outstanding"
          value={formatCents(dashboard.total_overdue_cents)}
          sub={`${dashboard.total_overdue_count} accounts`}
          token="debt-overdue"
        />
        <KpiCard
          label="Active Plans"
          value={String(dashboard.active_payment_plans)}
          sub={`${dashboard.payment_plans_at_risk} with missed instalment`}
          token="debt-payment-plan"
          warn={dashboard.payment_plans_at_risk > 0}
        />
        <KpiCard
          label="Written Off YTD"
          value={formatCents(dashboard.written_off_ytd_cents)}
          sub="Current financial year"
          token="debt-written-off"
        />
        <KpiCard
          label="Escalated"
          value={String(dashboard.by_stage.find(s => s.stage === "escalated")?.count ?? 0)}
          sub="Require management action"
          token="debt-escalated"
        />
      </div>

      {/* ── Aging Buckets ── */}
      <div
        style={{
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          padding: "1rem 1.25rem",
        }}
      >
        <p style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "0.75rem" }}>
          Aging Analysis
        </p>
        <div className="grid grid-cols-4 gap-3">
          {agingOrder.map(bucket => {
            const b = dashboard.aging_buckets.find(x => x.bucket === bucket);
            const token = agingTokens[bucket];
            return (
              <div
                key={bucket}
                style={{
                  borderRadius: "var(--radius)",
                  padding: "0.65rem 0.75rem",
                  background: `var(--${token}-bg)`,
                }}
              >
                <p style={{ fontSize: "0.72rem", color: `var(--${token}-fg)`, fontWeight: 600, marginBottom: "0.2rem" }}>
                  {agingLabels[bucket]}
                </p>
                <p style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--foreground)" }}>
                  {formatCents(b?.total_cents ?? 0)}
                </p>
                <p style={{ fontSize: "0.72rem", color: "var(--muted-foreground)" }}>
                  {b?.count ?? 0} accounts
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Overdue Table ── */}
      <div
        style={{
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "0.85rem 1.25rem",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            flexWrap: "wrap",
          }}
        >
          <p style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--foreground)", flex: 1 }}>
            Active Accounts ({filtered.length})
          </p>
          <input
            type="search"
            placeholder="Search by invoice, student, guardian…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              padding: "0.35rem 0.75rem",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              background: "var(--background)",
              color: "var(--foreground)",
              fontSize: "0.83rem",
              width: "220px",
              outline: "none",
            }}
          />
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding: "2.5rem 1.25rem", textAlign: "center" }}>
            <p style={{ color: "var(--muted-foreground)", fontSize: "0.9rem" }}>
              No overdue accounts{search ? " match your search" : ""}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto scroll-native">
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {["Invoice", "Student", "Guardian", "Due", "Outstanding", "Stage", "Age", ""].map(h => (
                    <th
                      key={h}
                      style={{
                        padding: "0.55rem 1rem",
                        textAlign: "left",
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                        color: "var(--muted-foreground)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => (
                  <DebtRow key={s.id} record={s} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Recently Resolved ── */}
      {dashboard.recently_resolved.length > 0 && (
        <div
          style={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-lg)",
            overflow: "hidden",
          }}
        >
          <div style={{ padding: "0.85rem 1.25rem", borderBottom: "1px solid var(--border)" }}>
            <p style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--foreground)" }}>
              Recently Resolved (last 30 days)
            </p>
          </div>
          <div className="overflow-x-auto scroll-native">
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {["Invoice", "Student", "Outstanding", "Resolved"].map(h => (
                    <th key={h} style={{ padding: "0.5rem 1rem", textAlign: "left", fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--muted-foreground)" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dashboard.recently_resolved.map(s => (
                  <tr key={s.id} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "0.65rem 1rem", color: "var(--muted-foreground)", fontSize: "0.82rem" }}>
                      {s.invoice?.invoice_number ?? "-"}
                    </td>
                    <td style={{ padding: "0.65rem 1rem", fontWeight: 500, color: "var(--foreground)" }}>
                      {s.student ? `${s.student.first_name} ${s.student.last_name}` : "-"}
                    </td>
                    <td style={{ padding: "0.65rem 1rem" }}>
                      {formatCents(s.outstanding_cents)}
                    </td>
                    <td style={{ padding: "0.65rem 1rem", color: "var(--muted-foreground)", fontSize: "0.82rem" }}>
                      {s.resolved_at ? formatDate(s.resolved_at) : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────

function KpiCard({
  label, value, sub, token, warn = false,
}: {
  label: string;
  value: string;
  sub: string;
  token: string;
  warn?: boolean;
}) {
  return (
    <div
      style={{
        background: "var(--card)",
        border: `1px solid ${warn ? `var(--${token})` : "var(--border)"}`,
        borderRadius: "var(--radius-lg)",
        padding: "0.9rem 1.1rem",
      }}
    >
      <p style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--muted-foreground)", marginBottom: "0.35rem" }}>
        {label}
      </p>
      <p style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--foreground)", lineHeight: 1.1 }}>
        {value}
      </p>
      <p style={{ fontSize: "0.72rem", color: warn ? `var(--${token})` : "var(--muted-foreground)", marginTop: "0.25rem", fontWeight: warn ? 600 : 400 }}>
        {sub}
      </p>
    </div>
  );
}

function DebtRow({ record }: { record: DebtCollectionRecordWithDetails }) {
  const haptics = useHaptics();
  const guardianUser = record.guardian?.user;
  const outstanding = record.invoice
    ? record.invoice.total_cents - record.invoice.amount_paid_cents
    : record.outstanding_cents;

  return (
    <tr
      style={{ borderBottom: "1px solid var(--border)", cursor: "pointer" }}
      onClick={() => haptics.impact("light")}
    >
      <td style={{ padding: "0.65rem 1rem", color: "var(--muted-foreground)", fontSize: "0.82rem" }}>
        {record.invoice?.invoice_number ?? "-"}
      </td>
      <td style={{ padding: "0.65rem 1rem", fontWeight: 500, color: "var(--foreground)" }}>
        <Link
          href={`/admin/debt/${record.id}`}
          style={{ color: "inherit", textDecoration: "none" }}
          onClick={e => e.stopPropagation()}
        >
          {record.student ? `${record.student.first_name} ${record.student.last_name}` : "-"}
        </Link>
      </td>
      <td style={{ padding: "0.65rem 1rem", color: "var(--muted-foreground)", fontSize: "0.82rem" }}>
        {guardianUser ? `${guardianUser.first_name ?? ""} ${guardianUser.last_name ?? ""}`.trim() : "-"}
      </td>
      <td style={{ padding: "0.65rem 1rem", color: "var(--muted-foreground)", fontSize: "0.82rem", whiteSpace: "nowrap" }}>
        {record.invoice ? new Date(record.invoice.due_date).toLocaleDateString("en-AU", { day: "numeric", month: "short" }) : "-"}
      </td>
      <td style={{ padding: "0.65rem 1rem", fontWeight: 600 }}>
        {formatCents(outstanding)}
      </td>
      <td style={{ padding: "0.65rem 1rem" }}>
        <DebtStageBadge stage={record.stage} size="sm" />
      </td>
      <td style={{ padding: "0.65rem 1rem" }}>
        <DebtAgingBadge daysOverdue={record.days_overdue} size="sm" />
      </td>
      <td style={{ padding: "0.65rem 1rem" }}>
        <Link
          href={`/admin/debt/${record.id}`}
          style={{
            fontSize: "0.78rem",
            fontWeight: 600,
            color: "var(--primary)",
            textDecoration: "none",
          }}
        >
          Manage →
        </Link>
      </td>
    </tr>
  );
}
