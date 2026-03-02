// src/components/domain/grant-tracking/grant-dashboard-client.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import type { Grant, GrantDashboardData } from "@/types/domain";
import { GrantStatusBadge, GrantCategoryBadge } from "./grant-status-badge";
import { useHaptics } from "@/lib/hooks/use-haptics";

function formatCents(c: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(c / 100);
}

function formatDate(s: string) {
  return new Date(s).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

interface Props {
  dashboard: GrantDashboardData;
  grants: Grant[];
}

export function GrantDashboardClient({ dashboard, grants }: Props) {
  const haptics = useHaptics();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filtered = grants.filter((g) => {
    if (statusFilter !== "all" && g.status !== statusFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      g.name.toLowerCase().includes(q) ||
      g.funding_body.toLowerCase().includes(q) ||
      (g.reference_number?.toLowerCase().includes(q) ?? false)
    );
  });

  const spendPct =
    dashboard.total_awarded_cents > 0
      ? Math.round(
          (dashboard.total_spent_cents / dashboard.total_awarded_cents) * 100,
        )
      : 0;

  return (
    <div className="flex flex-col gap-6 pb-tab-bar">
      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1
            style={{
              fontSize: "1.25rem",
              fontWeight: 700,
              color: "var(--foreground)",
            }}
          >
            Grant Tracking
          </h1>
          <p style={{ fontSize: "0.85rem", color: "var(--muted-foreground)" }}>
            Manage grants, milestones, expenditures, and acquittals
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/grant-tracking/export"
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
            Export CSV
          </Link>
          <Link
            href="/admin/grant-tracking/new"
            onClick={() => haptics.impact("medium")}
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
            + New Grant
          </Link>
        </div>
      </div>

      {/* ── KPI Row ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard
          label="Active Grants"
          value={String(dashboard.active_grants)}
          sub={`${dashboard.total_grants} total`}
          token="grant-active"
        />
        <KpiCard
          label="Total Awarded"
          value={formatCents(dashboard.total_awarded_cents)}
          sub="Approved + Active + Acquitted"
          token="grant-approved"
        />
        <KpiCard
          label="Total Spent"
          value={formatCents(dashboard.total_spent_cents)}
          sub={`${spendPct}% utilised`}
          token="grant-submitted"
          warn={spendPct > 90}
        />
        <KpiCard
          label="Acquittals Due"
          value={String(dashboard.upcoming_acquittals.length)}
          sub="Next 90 days"
          token="grant-acquitted"
          warn={dashboard.upcoming_acquittals.length > 0}
        />
      </div>

      {/* ── Overdue Milestones Alert ── */}
      {dashboard.overdue_milestones.length > 0 && (
        <div
          style={{
            background: "var(--grant-milestone-overdue-bg)",
            border: "1px solid var(--grant-milestone-overdue)",
            borderRadius: "var(--radius-lg)",
            padding: "0.85rem 1.25rem",
          }}
        >
          <p
            style={{
              fontSize: "0.82rem",
              fontWeight: 700,
              color: "var(--grant-milestone-overdue-fg)",
              marginBottom: "0.5rem",
            }}
          >
            {dashboard.overdue_milestones.length} Overdue Milestone
            {dashboard.overdue_milestones.length > 1 ? "s" : ""}
          </p>
          <div className="flex flex-col gap-1">
            {dashboard.overdue_milestones.slice(0, 5).map((m) => (
              <p
                key={m.id}
                style={{
                  fontSize: "0.78rem",
                  color: "var(--grant-milestone-overdue-fg)",
                }}
              >
                <strong>{m.grant_name}</strong>: {m.title} (due{" "}
                {formatDate(m.due_date)})
              </p>
            ))}
          </div>
        </div>
      )}

      {/* ── Upcoming Acquittals ── */}
      {dashboard.upcoming_acquittals.length > 0 && (
        <div
          style={{
            background: "var(--grant-acquitted-bg)",
            borderRadius: "var(--radius-lg)",
            padding: "0.85rem 1.25rem",
            border: "1px solid var(--border)",
          }}
        >
          <p
            style={{
              fontSize: "0.8rem",
              fontWeight: 700,
              color: "var(--grant-acquitted-fg)",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              marginBottom: "0.5rem",
            }}
          >
            Upcoming Acquittals
          </p>
          <div className="flex flex-col gap-1">
            {dashboard.upcoming_acquittals.map((g) => (
              <Link
                key={g.id}
                href={`/admin/grant-tracking/${g.id}`}
                style={{
                  fontSize: "0.82rem",
                  color: "var(--foreground)",
                  textDecoration: "none",
                }}
              >
                <strong>{g.name}</strong> - due{" "}
                {formatDate(g.acquittal_due_date!)} (
                {formatCents(g.amount_cents)})
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── Grants Table ── */}
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
          <p
            style={{
              fontWeight: 700,
              fontSize: "0.95rem",
              color: "var(--foreground)",
              flex: 1,
            }}
          >
            All Grants ({filtered.length})
          </p>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: "0.35rem 0.5rem",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              background: "var(--background)",
              color: "var(--foreground)",
              fontSize: "0.83rem",
            }}
          >
            <option value="all">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="submitted">Submitted</option>
            <option value="approved">Approved</option>
            <option value="active">Active</option>
            <option value="acquitted">Acquitted</option>
            <option value="closed">Closed</option>
          </select>
          <input
            type="search"
            placeholder="Search grants…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              padding: "0.35rem 0.75rem",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              background: "var(--background)",
              color: "var(--foreground)",
              fontSize: "0.83rem",
              width: "200px",
              outline: "none",
            }}
          />
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding: "2.5rem 1.25rem", textAlign: "center" }}>
            <p style={{ color: "var(--muted-foreground)", fontSize: "0.9rem" }}>
              {grants.length === 0
                ? "No grants yet. Create your first grant to get started."
                : `No grants match your ${search ? "search" : "filter"}`}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto scroll-native">
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "0.85rem",
              }}
            >
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {[
                    "Grant Name",
                    "Funding Body",
                    "Status",
                    "Category",
                    "Amount",
                    "Spent",
                    "Period",
                    "",
                  ].map((h) => (
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
                {filtered.map((g) => (
                  <GrantRow key={g.id} grant={g} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  token,
  warn = false,
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
      <p
        style={{
          fontSize: "0.72rem",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.04em",
          color: "var(--muted-foreground)",
          marginBottom: "0.35rem",
        }}
      >
        {label}
      </p>
      <p
        style={{
          fontSize: "1.3rem",
          fontWeight: 800,
          color: "var(--foreground)",
          lineHeight: 1.1,
        }}
      >
        {value}
      </p>
      <p
        style={{
          fontSize: "0.72rem",
          color: warn ? `var(--${token})` : "var(--muted-foreground)",
          marginTop: "0.25rem",
          fontWeight: warn ? 600 : 400,
        }}
      >
        {sub}
      </p>
    </div>
  );
}

function GrantRow({ grant }: { grant: Grant }) {
  const haptics = useHaptics();
  const remaining = Math.max(0, grant.amount_cents - grant.spent_cents);
  const spendPct =
    grant.amount_cents > 0
      ? Math.round((grant.spent_cents / grant.amount_cents) * 100)
      : 0;

  return (
    <tr
      style={{ borderBottom: "1px solid var(--border)", cursor: "pointer" }}
      onClick={() => haptics.impact("light")}
    >
      <td
        style={{
          padding: "0.65rem 1rem",
          fontWeight: 500,
          color: "var(--foreground)",
        }}
      >
        <Link
          href={`/admin/grant-tracking/${grant.id}`}
          style={{ color: "inherit", textDecoration: "none" }}
          onClick={(e) => e.stopPropagation()}
        >
          {grant.name}
        </Link>
        {grant.reference_number && (
          <span
            style={{
              fontSize: "0.72rem",
              color: "var(--muted-foreground)",
              marginLeft: "0.5rem",
            }}
          >
            #{grant.reference_number}
          </span>
        )}
      </td>
      <td
        style={{
          padding: "0.65rem 1rem",
          color: "var(--muted-foreground)",
          fontSize: "0.82rem",
        }}
      >
        {grant.funding_body}
      </td>
      <td style={{ padding: "0.65rem 1rem" }}>
        <GrantStatusBadge status={grant.status} />
      </td>
      <td style={{ padding: "0.65rem 1rem" }}>
        <GrantCategoryBadge category={grant.category} />
      </td>
      <td
        style={{
          padding: "0.65rem 1rem",
          fontWeight: 600,
          whiteSpace: "nowrap",
        }}
      >
        {formatCents(grant.amount_cents)}
      </td>
      <td style={{ padding: "0.65rem 1rem", whiteSpace: "nowrap" }}>
        <span style={{ fontWeight: 500 }}>
          {formatCents(grant.spent_cents)}
        </span>
        <span
          style={{
            fontSize: "0.72rem",
            color:
              spendPct > 90
                ? "var(--grant-milestone-overdue)"
                : "var(--muted-foreground)",
            marginLeft: "0.35rem",
            fontWeight: spendPct > 90 ? 600 : 400,
          }}
        >
          ({spendPct}%)
        </span>
      </td>
      <td
        style={{
          padding: "0.65rem 1rem",
          color: "var(--muted-foreground)",
          fontSize: "0.82rem",
          whiteSpace: "nowrap",
        }}
      >
        {new Date(grant.start_date).toLocaleDateString("en-AU", {
          day: "numeric",
          month: "short",
          year: "2-digit",
        })}
        {" - "}
        {new Date(grant.end_date).toLocaleDateString("en-AU", {
          day: "numeric",
          month: "short",
          year: "2-digit",
        })}
      </td>
      <td style={{ padding: "0.65rem 1rem" }}>
        <Link
          href={`/admin/grant-tracking/${grant.id}`}
          style={{
            fontSize: "0.78rem",
            fontWeight: 600,
            color: "var(--primary)",
            textDecoration: "none",
          }}
        >
          View →
        </Link>
      </td>
    </tr>
  );
}
