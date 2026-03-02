// src/components/domain/grant-tracking/grant-detail-client.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useHaptics } from "@/lib/hooks/use-haptics";
import type {
  GrantWithDetails,
  GrantMilestone,
  GrantExpenditure,
} from "@/types/domain";
import {
  GrantStatusBadge,
  MilestoneStatusBadge,
  GrantCategoryBadge,
} from "./grant-status-badge";
import {
  createMilestone,
  updateMilestone,
  deleteMilestone,
  createExpenditure,
  deleteExpenditure,
  deleteGrant,
} from "@/lib/actions/grant-tracking";

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
  grant: GrantWithDetails;
  milestones: GrantMilestone[];
  expenditures: GrantExpenditure[];
  canManage: boolean;
}

export function GrantDetailClient({
  grant,
  milestones,
  expenditures,
  canManage,
}: Props) {
  const router = useRouter();
  const haptics = useHaptics();
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<
    "overview" | "milestones" | "expenditures"
  >("overview");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteGrant(grant.id);
      if (result.error) {
        haptics.error();
        return;
      }
      haptics.success();
      router.push("/admin/grant-tracking");
    });
  }

  const remaining = Math.max(0, grant.amount_cents - grant.spent_cents);

  return (
    <div className="flex flex-col gap-6 pb-tab-bar">
      {/* Breadcrumb + Actions */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div
            className="flex items-center gap-2 text-sm"
            style={{ marginBottom: "0.5rem" }}
          >
            <Link
              href="/admin/grant-tracking"
              className="underline-offset-2 hover:underline"
              style={{ color: "var(--primary)" }}
            >
              Grant Tracking
            </Link>
            <span style={{ color: "var(--muted-foreground)" }}>/</span>
            <span style={{ color: "var(--foreground)" }}>{grant.name}</span>
          </div>
          <h1
            style={{
              fontSize: "1.25rem",
              fontWeight: 700,
              color: "var(--foreground)",
            }}
          >
            {grant.name}
          </h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <GrantStatusBadge status={grant.status} />
            <GrantCategoryBadge category={grant.category} />
            {grant.reference_number && (
              <span
                style={{
                  fontSize: "0.78rem",
                  color: "var(--muted-foreground)",
                }}
              >
                #{grant.reference_number}
              </span>
            )}
          </div>
        </div>

        {canManage && (
          <div className="flex items-center gap-2">
            <Link
              href={`/admin/grant-tracking/${grant.id}/edit`}
              onClick={() => haptics.impact("light")}
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
              Edit
            </Link>
            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                style={{
                  padding: "0.45rem 0.9rem",
                  borderRadius: "var(--radius)",
                  border: "1px solid var(--destructive)",
                  background: "transparent",
                  color: "var(--destructive)",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Delete
              </button>
            ) : (
              <div className="flex items-center gap-1">
                <button
                  onClick={handleDelete}
                  disabled={isPending}
                  style={{
                    padding: "0.45rem 0.9rem",
                    borderRadius: "var(--radius)",
                    background: "var(--destructive)",
                    color: "var(--destructive-foreground)",
                    fontSize: "0.82rem",
                    fontWeight: 600,
                    border: "none",
                    cursor: "pointer",
                    opacity: isPending ? 0.5 : 1,
                  }}
                >
                  {isPending ? "Deleting…" : "Confirm"}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  style={{
                    padding: "0.45rem 0.9rem",
                    borderRadius: "var(--radius)",
                    border: "1px solid var(--border)",
                    background: "var(--card)",
                    color: "var(--foreground)",
                    fontSize: "0.82rem",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* KPI summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryCard label="Awarded" value={formatCents(grant.amount_cents)} />
        <SummaryCard
          label="Spent"
          value={formatCents(grant.spent_cents)}
          sub={`${grant.spend_pct}% utilised`}
          warn={grant.spend_pct > 90}
        />
        <SummaryCard label="Remaining" value={formatCents(remaining)} />
        <SummaryCard
          label="Milestones"
          value={`${grant.milestones_completed}/${grant.milestones_total}`}
          sub={
            grant.milestones_overdue > 0
              ? `${grant.milestones_overdue} overdue`
              : "on track"
          }
          warn={grant.milestones_overdue > 0}
        />
      </div>

      {/* Tabs */}
      <div
        className="flex gap-0 border-b"
        style={{ borderColor: "var(--border)" }}
      >
        {(["overview", "milestones", "expenditures"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => {
              haptics.selection();
              setActiveTab(tab);
            }}
            style={{
              padding: "0.55rem 1rem",
              fontSize: "0.85rem",
              fontWeight: activeTab === tab ? 700 : 500,
              color:
                activeTab === tab
                  ? "var(--primary)"
                  : "var(--muted-foreground)",
              borderBottom:
                activeTab === tab
                  ? "2px solid var(--primary)"
                  : "2px solid transparent",
              background: "transparent",
              border: "none",
              borderBottomWidth: "2px",
              borderBottomStyle: "solid",
              borderBottomColor:
                activeTab === tab ? "var(--primary)" : "transparent",
              cursor: "pointer",
              textTransform: "capitalize",
            }}
          >
            {tab}{" "}
            {tab === "milestones"
              ? `(${milestones.length})`
              : tab === "expenditures"
                ? `(${expenditures.length})`
                : ""}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "overview" && <OverviewTab grant={grant} />}
      {activeTab === "milestones" && (
        <MilestonesTab
          grantId={grant.id}
          milestones={milestones}
          canManage={canManage}
        />
      )}
      {activeTab === "expenditures" && (
        <ExpendituresTab
          grantId={grant.id}
          expenditures={expenditures}
          canManage={canManage}
        />
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────

function SummaryCard({
  label,
  value,
  sub,
  warn = false,
}: {
  label: string;
  value: string;
  sub?: string;
  warn?: boolean;
}) {
  return (
    <div
      style={{
        background: "var(--card)",
        border: `1px solid ${warn ? "var(--grant-milestone-overdue)" : "var(--border)"}`,
        borderRadius: "var(--radius-lg)",
        padding: "0.8rem 1rem",
      }}
    >
      <p
        style={{
          fontSize: "0.72rem",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.04em",
          color: "var(--muted-foreground)",
          marginBottom: "0.25rem",
        }}
      >
        {label}
      </p>
      <p
        style={{
          fontSize: "1.15rem",
          fontWeight: 800,
          color: "var(--foreground)",
          lineHeight: 1.1,
        }}
      >
        {value}
      </p>
      {sub && (
        <p
          style={{
            fontSize: "0.72rem",
            color: warn
              ? "var(--grant-milestone-overdue)"
              : "var(--muted-foreground)",
            marginTop: "0.15rem",
            fontWeight: warn ? 600 : 400,
          }}
        >
          {sub}
        </p>
      )}
    </div>
  );
}

function OverviewTab({ grant }: { grant: GrantWithDetails }) {
  const rows: Array<{ label: string; value: string | null }> = [
    { label: "Funding Body", value: grant.funding_body },
    {
      label: "Period",
      value: `${formatDate(grant.start_date)} - ${formatDate(grant.end_date)}`,
    },
    {
      label: "Acquittal Due",
      value: grant.acquittal_due_date
        ? formatDate(grant.acquittal_due_date)
        : null,
    },
    {
      label: "Managed By",
      value: grant.managed_by_user
        ? `${grant.managed_by_user.first_name ?? ""} ${grant.managed_by_user.last_name ?? ""}`.trim()
        : null,
    },
    { label: "Description", value: grant.description },
    { label: "Conditions", value: grant.conditions },
    { label: "Internal Notes", value: grant.internal_notes },
  ];

  return (
    <div
      style={{
        background: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        overflow: "hidden",
      }}
    >
      {rows
        .filter((r) => r.value)
        .map((row) => (
          <div
            key={row.label}
            style={{
              padding: "0.75rem 1.25rem",
              borderBottom: "1px solid var(--border)",
              display: "flex",
              gap: "1rem",
            }}
          >
            <span
              style={{
                fontSize: "0.82rem",
                fontWeight: 600,
                color: "var(--muted-foreground)",
                minWidth: 120,
              }}
            >
              {row.label}
            </span>
            <span
              style={{
                fontSize: "0.85rem",
                color: "var(--foreground)",
                whiteSpace: "pre-wrap",
              }}
            >
              {row.value}
            </span>
          </div>
        ))}
    </div>
  );
}

function MilestonesTab({
  grantId,
  milestones,
  canManage,
}: {
  grantId: string;
  milestones: GrantMilestone[];
  canManage: boolean;
}) {
  const haptics = useHaptics();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createMilestone({
        grant_id: grantId,
        title,
        due_date: dueDate,
        description: description || null,
        notes: null,
      });
      if (result.error) {
        setError(result.error.message);
        haptics.error();
        return;
      }
      haptics.success();
      setTitle("");
      setDueDate("");
      setDescription("");
      setShowForm(false);
      router.refresh();
    });
  }

  function handleComplete(id: string) {
    startTransition(async () => {
      await updateMilestone({
        id,
        status: "completed",
        title: null,
        description: null,
        due_date: null,
        notes: null,
      });
      haptics.impact("medium");
      router.refresh();
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteMilestone(id);
      haptics.impact("light");
      router.refresh();
    });
  }

  const inputStyle = { background: "var(--input)", color: "var(--foreground)" };

  return (
    <div className="flex flex-col gap-3">
      {canManage && !showForm && (
        <button
          onClick={() => {
            haptics.impact("light");
            setShowForm(true);
          }}
          style={{
            padding: "0.45rem 0.9rem",
            borderRadius: "var(--radius)",
            background: "var(--primary)",
            color: "var(--primary-foreground)",
            fontSize: "0.82rem",
            fontWeight: 600,
            border: "none",
            cursor: "pointer",
            alignSelf: "flex-start",
          }}
        >
          + Add Milestone
        </button>
      )}

      {showForm && (
        <form
          onSubmit={handleAdd}
          className="rounded-xl border border-border p-4 space-y-3"
          style={{ background: "var(--card)" }}
        >
          {error && (
            <p className="text-sm" style={{ color: "var(--destructive)" }}>
              {error}
            </p>
          )}
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="Milestone title"
            className="w-full rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
            style={inputStyle}
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              required
              className="w-full rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
              style={inputStyle}
            />
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description (optional)"
              className="w-full rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
              style={inputStyle}
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isPending}
              className="active-push touch-target rounded-[var(--radius-md)] px-4 py-2 text-sm font-semibold disabled:opacity-50"
              style={{
                background: "var(--primary)",
                color: "var(--primary-foreground)",
              }}
            >
              {isPending ? "Saving…" : "Add"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="active-push rounded-[var(--radius-md)] px-4 py-2 text-sm font-medium"
              style={{ background: "var(--muted)", color: "var(--foreground)" }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {milestones.length === 0 && !showForm ? (
        <p
          style={{
            color: "var(--muted-foreground)",
            fontSize: "0.9rem",
            padding: "2rem",
            textAlign: "center",
          }}
        >
          No milestones yet.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {milestones.map((m) => (
            <div
              key={m.id}
              style={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-lg)",
                padding: "0.75rem 1rem",
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    style={{
                      fontSize: "0.88rem",
                      fontWeight: 600,
                      color: "var(--foreground)",
                    }}
                  >
                    {m.title}
                  </span>
                  <MilestoneStatusBadge status={m.status} />
                </div>
                <p
                  style={{
                    fontSize: "0.78rem",
                    color: "var(--muted-foreground)",
                    marginTop: "0.15rem",
                  }}
                >
                  Due {formatDate(m.due_date)}
                  {m.description && ` - ${m.description}`}
                </p>
              </div>
              {canManage && m.status !== "completed" && (
                <button
                  onClick={() => handleComplete(m.id)}
                  disabled={isPending}
                  className="active-push"
                  style={{
                    padding: "0.3rem 0.7rem",
                    borderRadius: "var(--radius)",
                    background: "var(--grant-milestone-completed-bg)",
                    color: "var(--grant-milestone-completed-fg)",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    border: "none",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  Complete
                </button>
              )}
              {canManage && (
                <button
                  onClick={() => handleDelete(m.id)}
                  disabled={isPending}
                  style={{
                    padding: "0.3rem 0.5rem",
                    borderRadius: "var(--radius)",
                    background: "transparent",
                    color: "var(--muted-foreground)",
                    fontSize: "0.75rem",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ExpendituresTab({
  grantId,
  expenditures,
  canManage,
}: {
  grantId: string;
  expenditures: GrantExpenditure[];
  canManage: boolean;
}) {
  const haptics = useHaptics();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [desc, setDesc] = useState("");
  const [amountDollars, setAmountDollars] = useState("");
  const [date, setDate] = useState("");
  const [category, setCategory] = useState("");
  const [receiptRef, setReceiptRef] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const amountCents = Math.round(parseFloat(amountDollars || "0") * 100);
    if (isNaN(amountCents) || amountCents <= 0) {
      setError("Amount must be a positive number");
      return;
    }
    startTransition(async () => {
      const result = await createExpenditure({
        grant_id: grantId,
        description: desc,
        amount_cents: amountCents,
        date,
        category: category || null,
        receipt_reference: receiptRef || null,
        notes: null,
      });
      if (result.error) {
        setError(result.error.message);
        haptics.error();
        return;
      }
      haptics.success();
      setDesc("");
      setAmountDollars("");
      setDate("");
      setCategory("");
      setReceiptRef("");
      setShowForm(false);
      router.refresh();
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteExpenditure(id);
      haptics.impact("light");
      router.refresh();
    });
  }

  const inputStyle = { background: "var(--input)", color: "var(--foreground)" };
  const total = expenditures.reduce((sum, e) => sum + e.amount_cents, 0);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p
          style={{
            fontSize: "0.85rem",
            fontWeight: 600,
            color: "var(--muted-foreground)",
          }}
        >
          Total: {formatCents(total)}
        </p>
        {canManage && !showForm && (
          <button
            onClick={() => {
              haptics.impact("light");
              setShowForm(true);
            }}
            style={{
              padding: "0.45rem 0.9rem",
              borderRadius: "var(--radius)",
              background: "var(--primary)",
              color: "var(--primary-foreground)",
              fontSize: "0.82rem",
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
            }}
          >
            + Add Expenditure
          </button>
        )}
      </div>

      {showForm && (
        <form
          onSubmit={handleAdd}
          className="rounded-xl border border-border p-4 space-y-3"
          style={{ background: "var(--card)" }}
        >
          {error && (
            <p className="text-sm" style={{ color: "var(--destructive)" }}>
              {error}
            </p>
          )}
          <input
            type="text"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            required
            placeholder="Description"
            className="w-full rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
            style={inputStyle}
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="relative">
              <span
                className="absolute left-3 top-1/2 -translate-y-1/2 text-sm"
                style={{ color: "var(--muted-foreground)" }}
              >
                $
              </span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={amountDollars}
                onChange={(e) => setAmountDollars(e.target.value)}
                required
                placeholder="0.00"
                className="w-full rounded-[var(--radius-md)] border border-border py-2 pl-7 pr-3 text-sm"
                style={inputStyle}
              />
            </div>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
              style={inputStyle}
            />
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Category (optional)"
              className="w-full rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
              style={inputStyle}
            />
          </div>
          <input
            type="text"
            value={receiptRef}
            onChange={(e) => setReceiptRef(e.target.value)}
            placeholder="Receipt / invoice reference (optional)"
            className="w-full rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
            style={inputStyle}
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isPending}
              className="active-push touch-target rounded-[var(--radius-md)] px-4 py-2 text-sm font-semibold disabled:opacity-50"
              style={{
                background: "var(--primary)",
                color: "var(--primary-foreground)",
              }}
            >
              {isPending ? "Saving…" : "Add"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="active-push rounded-[var(--radius-md)] px-4 py-2 text-sm font-medium"
              style={{ background: "var(--muted)", color: "var(--foreground)" }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {expenditures.length === 0 && !showForm ? (
        <p
          style={{
            color: "var(--muted-foreground)",
            fontSize: "0.9rem",
            padding: "2rem",
            textAlign: "center",
          }}
        >
          No expenditures recorded yet.
        </p>
      ) : (
        <div
          style={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-lg)",
            overflow: "hidden",
          }}
        >
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
                    "Date",
                    "Description",
                    "Category",
                    "Amount",
                    "Receipt",
                    "",
                  ].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "0.55rem 0.85rem",
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
                {expenditures.map((ex) => (
                  <tr
                    key={ex.id}
                    style={{ borderBottom: "1px solid var(--border)" }}
                  >
                    <td
                      style={{
                        padding: "0.55rem 0.85rem",
                        whiteSpace: "nowrap",
                        color: "var(--muted-foreground)",
                        fontSize: "0.82rem",
                      }}
                    >
                      {formatDate(ex.date)}
                    </td>
                    <td
                      style={{
                        padding: "0.55rem 0.85rem",
                        color: "var(--foreground)",
                        fontWeight: 500,
                      }}
                    >
                      {ex.description}
                    </td>
                    <td
                      style={{
                        padding: "0.55rem 0.85rem",
                        color: "var(--muted-foreground)",
                        fontSize: "0.82rem",
                      }}
                    >
                      {ex.category ?? "—"}
                    </td>
                    <td
                      style={{
                        padding: "0.55rem 0.85rem",
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {formatCents(ex.amount_cents)}
                    </td>
                    <td
                      style={{
                        padding: "0.55rem 0.85rem",
                        color: "var(--muted-foreground)",
                        fontSize: "0.78rem",
                      }}
                    >
                      {ex.receipt_reference ?? "—"}
                    </td>
                    <td style={{ padding: "0.55rem 0.85rem" }}>
                      {canManage && (
                        <button
                          onClick={() => handleDelete(ex.id)}
                          disabled={isPending}
                          style={{
                            padding: "0.2rem 0.4rem",
                            background: "transparent",
                            color: "var(--muted-foreground)",
                            fontSize: "0.75rem",
                            border: "none",
                            cursor: "pointer",
                          }}
                        >
                          ✕
                        </button>
                      )}
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
