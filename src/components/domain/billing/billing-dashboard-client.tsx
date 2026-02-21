// src/components/domain/billing/billing-dashboard-client.tsx
"use client";

import {
  createFeeSchedule,
  createInvoice,
  listFeeSchedules,
  listInvoices,
  sendStripeInvoice,
  syncInvoiceToStripe,
  updateFeeSchedule,
  voidInvoice,
} from "@/lib/actions/billing";
import type { FeeFrequency, InvoiceStatus } from "@/lib/constants/billing";
import {
  FEE_FREQUENCY_CONFIG,
  formatCurrency,
  INVOICE_STATUS_CONFIG,
} from "@/lib/constants/billing";
import type { FeeSchedule, InvoiceWithDetails } from "@/types/domain";
import { useState } from "react";

interface StudentWithGuardians {
  id: string;
  first_name: string;
  last_name: string;
  guardians: Array<{
    id: string;
    relationship: string;
    user_id: string;
    user: {
      id: string;
      first_name: string | null;
      last_name: string | null;
      email: string;
    };
  }>;
}

interface ClassOption {
  id: string;
  name: string;
  cycle_level: string | null;
}

interface BillingDashboardClientProps {
  invoices: InvoiceWithDetails[];
  feeSchedules: FeeSchedule[];
  students: StudentWithGuardians[];
  classes: ClassOption[];
  currency: string;
}

export function BillingDashboardClient({
  invoices: initialInvoices,
  feeSchedules: initialFeeSchedules,
  students,
  classes,
  currency,
}: BillingDashboardClientProps) {
  const [activeTab, setActiveTab] = useState<"invoices" | "fees">("invoices");
  const [invoices, setInvoices] = useState(initialInvoices);
  const [feeSchedules, setFeeSchedules] = useState(initialFeeSchedules);
  const [showCreateInvoice, setShowCreateInvoice] = useState(false);
  const [showCreateFee, setShowCreateFee] = useState(false);

  async function refreshInvoices() {
    const result = await listInvoices();
    if (result.data) setInvoices(result.data);
  }

  async function refreshFees() {
    const result = await listFeeSchedules();
    if (result.data) setFeeSchedules(result.data);
  }

  const totalOutstanding = invoices
    .filter((i) => ["sent", "pending", "overdue"].includes(i.status))
    .reduce((sum, i) => sum + (i.total_cents - i.amount_paid_cents), 0);

  const totalPaid = invoices
    .filter((i) => i.status === "paid")
    .reduce((sum, i) => sum + i.amount_paid_cents, 0);

  const overdueCount = invoices.filter((i) => i.status === "overdue").length;

  const tabs = [
    { key: "invoices" as const, label: "Invoices", count: invoices.length },
    {
      key: "fees" as const,
      label: "Fee Schedules",
      count: feeSchedules.filter((f) => f.is_active).length,
    },
  ];

  return (
    <div className="space-y-[var(--density-section-gap)]">
      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-[var(--density-md)] sm:grid-cols-3">
        <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-[var(--density-card-padding)] shadow-[var(--shadow-sm)]">
          <p className="text-[var(--text-xs)] font-medium text-[var(--muted-foreground)] uppercase tracking-wider">
            Outstanding
          </p>
          <p className="mt-1 text-[var(--text-xl)] font-bold text-[var(--warning)]">
            {formatCurrency(totalOutstanding, currency)}
          </p>
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-[var(--density-card-padding)] shadow-[var(--shadow-sm)]">
          <p className="text-[var(--text-xs)] font-medium text-[var(--muted-foreground)] uppercase tracking-wider">Collected</p>
          <p className="mt-1 text-[var(--text-xl)] font-bold text-[var(--success)]">
            {formatCurrency(totalPaid, currency)}
          </p>
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-[var(--density-card-padding)] shadow-[var(--shadow-sm)]">
          <p className="text-[var(--text-xs)] font-medium text-[var(--muted-foreground)] uppercase tracking-wider">Overdue</p>
          <p className="mt-1 text-[var(--text-xl)] font-bold text-[var(--destructive)]">{overdueCount}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-[var(--border)]">
        <div className="flex gap-[var(--density-lg)]">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`border-b-2 pb-3 text-[var(--text-sm)] font-medium transition-colors ${
                activeTab === tab.key
                  ? "border-[var(--primary)] text-[var(--primary-700)] dark:text-[var(--primary-400)]"
                  : "border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              }`}
            >
              {tab.label}
              <span className="ml-1.5 rounded-full bg-[var(--muted)] px-2 py-0.5 text-[var(--text-xs)] text-[var(--muted-foreground)]">
                {tab.count}
              </span>
            </button>
          ))}
        </div>
        <button
          onClick={() =>
            activeTab === "invoices"
              ? setShowCreateInvoice(true)
              : setShowCreateFee(true)
          }
          className="rounded-lg bg-[var(--primary)] px-[var(--density-button-padding-x)] h-[var(--density-button-height)] text-[var(--text-sm)] font-medium text-[var(--primary-foreground)] hover:bg-[var(--primary-600)] transition-colors shadow-[var(--shadow-sm)]"
        >
          {activeTab === "invoices" ? "New Invoice" : "New Fee Schedule"}
        </button>
      </div>

      {/* Invoices tab */}
      {activeTab === "invoices" && (
        <div className="space-y-[var(--density-md)]">
          {showCreateInvoice && (
            <CreateInvoiceForm
              students={students}
              feeSchedules={feeSchedules.filter((f) => f.is_active)}
              currency={currency}
              onCreated={() => {
                setShowCreateInvoice(false);
                refreshInvoices();
              }}
              onCancel={() => setShowCreateInvoice(false)}
            />
          )}

          {invoices.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[var(--border-strong)] bg-[var(--card)] py-12 text-center">
              <p className="text-[var(--text-sm)] text-[var(--muted-foreground)]">
                No invoices yet. Create one to get started.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--card)] shadow-[var(--shadow-sm)]">
              <table className="min-w-full divide-y divide-[var(--border)]">
                <thead className="bg-[var(--table-header-bg)]">
                  <tr>
                    <th className="px-[var(--density-table-cell-x)] py-[var(--density-table-header-y)] text-left text-[var(--text-xs)] font-semibold text-[var(--table-header-fg)] uppercase tracking-wider">
                      Invoice
                    </th>
                    <th className="px-[var(--density-table-cell-x)] py-[var(--density-table-header-y)] text-left text-[var(--text-xs)] font-semibold text-[var(--table-header-fg)] uppercase tracking-wider">
                      Student
                    </th>
                    <th className="px-[var(--density-table-cell-x)] py-[var(--density-table-header-y)] text-left text-[var(--text-xs)] font-semibold text-[var(--table-header-fg)] uppercase tracking-wider">
                      Guardian
                    </th>
                    <th className="px-[var(--density-table-cell-x)] py-[var(--density-table-header-y)] text-left text-[var(--text-xs)] font-semibold text-[var(--table-header-fg)] uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-[var(--density-table-cell-x)] py-[var(--density-table-header-y)] text-left text-[var(--text-xs)] font-semibold text-[var(--table-header-fg)] uppercase tracking-wider">
                      Due
                    </th>
                    <th className="px-[var(--density-table-cell-x)] py-[var(--density-table-header-y)] text-left text-[var(--text-xs)] font-semibold text-[var(--table-header-fg)] uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-[var(--density-table-cell-x)] py-[var(--density-table-header-y)] text-right text-[var(--text-xs)] font-semibold text-[var(--table-header-fg)] uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)] bg-[var(--card)]">
                  {invoices.map((inv) => (
                    <InvoiceRow
                      key={inv.id}
                      invoice={inv}
                      currency={currency}
                      onRefresh={refreshInvoices}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Fee Schedules tab */}
      {activeTab === "fees" && (
        <div className="space-y-[var(--density-md)]">
          {showCreateFee && (
            <CreateFeeForm
              classes={classes}
              currency={currency}
              onCreated={() => {
                setShowCreateFee(false);
                refreshFees();
              }}
              onCancel={() => setShowCreateFee(false)}
            />
          )}

          {feeSchedules.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[var(--border-strong)] bg-[var(--card)] py-12 text-center">
              <p className="text-[var(--text-sm)] text-[var(--muted-foreground)]">
                No fee schedules defined. Create one to set tuition pricing.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-[var(--density-md)] sm:grid-cols-2 lg:grid-cols-3">
              {feeSchedules.map((fee) => (
                <FeeScheduleCard
                  key={fee.id}
                  fee={fee}
                  currency={currency}
                  onUpdated={refreshFees}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function InvoiceRow({
  invoice,
  currency,
  onRefresh,
}: {
  invoice: InvoiceWithDetails;
  currency: string;
  onRefresh: () => void;
}) {
  const [acting, setActing] = useState(false);
  const statusConfig =
    INVOICE_STATUS_CONFIG[invoice.status as InvoiceStatus] ??
    INVOICE_STATUS_CONFIG.draft;

  const studentName = invoice.student
    ? `${invoice.student.first_name} ${invoice.student.last_name}`
    : "Unknown";

  const guardianName = invoice.guardian?.user
    ? `${invoice.guardian.user.first_name ?? ""} ${invoice.guardian.user.last_name ?? ""}`.trim() ||
      invoice.guardian.user.email
    : "Unknown";

  async function handleAction(action: "sync" | "send" | "void") {
    setActing(true);
    if (action === "sync") await syncInvoiceToStripe(invoice.id);
    else if (action === "send") await sendStripeInvoice(invoice.id);
    else if (action === "void") {
      if (!confirm("Void this invoice? This cannot be undone.")) {
        setActing(false);
        return;
      }
      await voidInvoice(invoice.id);
    }
    setActing(false);
    onRefresh();
  }

  return (
    <tr className="hover:bg-[var(--table-row-hover)] transition-colors">
      <td className="px-[var(--density-table-cell-x)] py-[var(--density-table-cell-y)]">
        <p className="text-[var(--text-sm)] font-medium text-[var(--foreground)]">
          {invoice.invoice_number}
        </p>
        <p className="text-[var(--text-xs)] text-[var(--muted-foreground)]">
          {invoice.line_items.length} item
          {invoice.line_items.length !== 1 ? "s" : ""}
        </p>
      </td>
      <td className="px-[var(--density-table-cell-x)] py-[var(--density-table-cell-y)] text-[var(--text-sm)] text-[var(--foreground)]">{studentName}</td>
      <td className="px-[var(--density-table-cell-x)] py-[var(--density-table-cell-y)] text-[var(--text-sm)] text-[var(--foreground)]">{guardianName}</td>
      <td className="px-[var(--density-table-cell-x)] py-[var(--density-table-cell-y)] text-[var(--text-sm)] font-bold text-[var(--foreground)] tabular-nums">
        {formatCurrency(invoice.total_cents, currency)}
      </td>
      <td className="px-[var(--density-table-cell-x)] py-[var(--density-table-cell-y)] text-[var(--text-sm)] text-[var(--foreground)]">
        {new Date(invoice.due_date).toLocaleDateString("en-AU")}
      </td>
      <td className="px-[var(--density-table-cell-x)] py-[var(--density-table-cell-y)]">
        <span
          className={`status-badge status-badge-plain px-2 py-0.5 text-[10px] ${statusConfig.bgColor} ${statusConfig.color}`}
        >
          {statusConfig.label}
        </span>
      </td>
      <td className="px-[var(--density-table-cell-x)] py-[var(--density-table-cell-y)] text-right">
        <div className="flex items-center justify-end gap-1">
          {invoice.status === "draft" && !invoice.stripe_invoice_id && (
            <button
              onClick={() => handleAction("sync")}
              disabled={acting}
              className="rounded px-2 py-1 text-[var(--text-xs)] font-medium text-[var(--info)] hover:bg-[var(--info-foreground)] hover:text-[var(--info)] transition-colors disabled:opacity-50"
            >
              Sync to Stripe
            </button>
          )}
          {invoice.status === "pending" && invoice.stripe_invoice_id && (
            <button
              onClick={() => handleAction("send")}
              disabled={acting}
              className="rounded px-2 py-1 text-[var(--text-xs)] font-medium text-[var(--success)] hover:bg-[var(--success-foreground)] transition-colors disabled:opacity-50"
            >
              Send
            </button>
          )}
          {invoice.stripe_hosted_url && (
            <a
              href={invoice.stripe_hosted_url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded px-2 py-1 text-[var(--text-xs)] font-medium text-[var(--muted-foreground)] hover:bg-[var(--muted)] transition-colors"
            >
              View
            </a>
          )}
          {!["paid", "void", "refunded"].includes(invoice.status) && (
            <button
              onClick={() => handleAction("void")}
              disabled={acting}
              className="rounded px-2 py-1 text-[var(--text-xs)] font-medium text-[var(--destructive)] hover:bg-[var(--destructive-foreground)] transition-colors disabled:opacity-50"
            >
              Void
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

function CreateInvoiceForm({
  students,
  feeSchedules,
  currency,
  onCreated,
  onCancel,
}: {
  students: StudentWithGuardians[];
  feeSchedules: FeeSchedule[];
  currency: string;
  onCreated: () => void;
  onCancel: () => void;
}) {
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [selectedGuardianId, setSelectedGuardianId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [notes, setNotes] = useState("");
  const [lineItems, setLineItems] = useState<
    Array<{
      description: string;
      quantity: number;
      unit_amount_cents: number;
      fee_schedule_id: string;
    }>
  >([
    { description: "", quantity: 1, unit_amount_cents: 0, fee_schedule_id: "" },
  ]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedStudent = students.find((s) => s.id === selectedStudentId);
  const guardians = selectedStudent?.guardians ?? [];

  function addLineItem() {
    setLineItems((prev) => [
      ...prev,
      {
        description: "",
        quantity: 1,
        unit_amount_cents: 0,
        fee_schedule_id: "",
      },
    ]);
  }

  function removeLineItem(index: number) {
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  }

  function updateLineItem(
    index: number,
    field: string,
    value: string | number,
  ) {
    setLineItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const updated = { ...item, [field]: value };
        if (field === "fee_schedule_id" && value) {
          const fee = feeSchedules.find((f) => f.id === value);
          if (fee) {
            updated.description = fee.description || fee.name;
            updated.unit_amount_cents = fee.amount_cents;
          }
        }
        return updated;
      }),
    );
  }

  const total = lineItems.reduce(
    (sum, li) => sum + li.quantity * li.unit_amount_cents,
    0,
  );

  async function handleSubmit() {
    setError(null);
    if (!selectedStudentId) { setError("Select a student"); return; }
    if (!selectedGuardianId) { setError("Select a guardian"); return; }
    if (!dueDate) { setError("Set a due date"); return; }
    if (lineItems.some((li) => !li.description.trim())) { setError("All line items need a description"); return; }
    if (lineItems.some((li) => li.unit_amount_cents <= 0)) { setError("All line items need a positive amount"); return; }

    setIsSaving(true);
    const result = await createInvoice({
      student_id: selectedStudentId,
      guardian_id: selectedGuardianId,
      due_date: dueDate,
      period_start: periodStart || undefined,
      period_end: periodEnd || undefined,
      notes: notes || undefined,
      line_items: lineItems.map((li) => ({
        fee_schedule_id: li.fee_schedule_id || undefined,
        description: li.description,
        quantity: li.quantity,
        unit_amount_cents: li.unit_amount_cents,
      })),
    });
    setIsSaving(false);

    if (result.error) {
      setError(result.error.message);
      return;
    }
    onCreated();
  }

  return (
    <div className="rounded-lg border border-[var(--primary-200)] bg-[var(--primary-50)] p-[var(--density-card-padding)] animate-fade-in">
      <h3 className="text-[var(--text-sm)] font-semibold text-[var(--foreground)]">Create Invoice</h3>

      {error && (
        <div className="mt-3 rounded-md bg-[var(--form-error-bg)] p-3">
          <p className="text-[var(--text-sm)] text-[var(--form-error-fg)]">{error}</p>
        </div>
      )}

      <div className="mt-4 grid grid-cols-1 gap-[var(--density-md)] sm:grid-cols-2">
        <div>
          <label className="block text-[var(--text-xs)] font-medium text-[var(--form-label-fg)]">
            Student *
          </label>
          <select
            value={selectedStudentId}
            onChange={(e) => {
              setSelectedStudentId(e.target.value);
              setSelectedGuardianId("");
            }}
            className="mt-1 block w-full rounded-lg border border-[var(--input)] bg-[var(--card)] px-3 h-[var(--density-input-height)] text-[var(--text-sm)] focus:border-[var(--input-focus)] focus:outline-none focus:ring-1 focus:ring-[var(--ring)]"
          >
            <option value="">Select student...</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.first_name} {s.last_name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[var(--text-xs)] font-medium text-[var(--form-label-fg)]">
            Bill to (Guardian) *
          </label>
          <select
            value={selectedGuardianId}
            onChange={(e) => setSelectedGuardianId(e.target.value)}
            disabled={!selectedStudentId}
            className="mt-1 block w-full rounded-lg border border-[var(--input)] bg-[var(--card)] px-3 h-[var(--density-input-height)] text-[var(--text-sm)] focus:border-[var(--input-focus)] focus:outline-none focus:ring-1 focus:ring-[var(--ring)] disabled:bg-[var(--input-disabled-bg)] disabled:text-[var(--input-disabled-fg)]"
          >
            <option value="">Select guardian...</option>
            {guardians.map((g) => (
              <option key={g.id} value={g.id}>
                {g.user.first_name} {g.user.last_name} ({g.relationship})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[var(--text-xs)] font-medium text-[var(--form-label-fg)]">
            Due Date *
          </label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-[var(--input)] bg-[var(--card)] px-3 h-[var(--density-input-height)] text-[var(--text-sm)] focus:border-[var(--input-focus)] focus:outline-none focus:ring-1 focus:ring-[var(--ring)]"
          />
        </div>

        <div className="flex gap-2">
          <div className="flex-1">
            <label className="block text-[var(--text-xs)] font-medium text-[var(--form-label-fg)]">
              Period Start
            </label>
            <input
              type="date"
              value={periodStart}
              onChange={(e) => setPeriodStart(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-[var(--input)] bg-[var(--card)] px-3 h-[var(--density-input-height)] text-[var(--text-sm)] focus:border-[var(--input-focus)]"
            />
          </div>
          <div className="flex-1">
            <label className="block text-[var(--text-xs)] font-medium text-[var(--form-label-fg)]">
              Period End
            </label>
            <input
              type="date"
              value={periodEnd}
              onChange={(e) => setPeriodEnd(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-[var(--input)] bg-[var(--card)] px-3 h-[var(--density-input-height)] text-[var(--text-sm)] focus:border-[var(--input-focus)]"
            />
          </div>
        </div>
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-[var(--text-xs)] font-semibold text-[var(--foreground)] uppercase tracking-wider">Line Items</h4>
          <button onClick={addLineItem} className="text-[var(--text-xs)] font-medium text-[var(--primary-700)] dark:text-[var(--primary-400)] hover:underline">+ Add line</button>
        </div>
        <div className="space-y-2">
          {lineItems.map((li, idx) => (
            <div key={idx} className="flex items-end gap-2 animate-slide-down">
              <div className="flex-1">
                <select
                  value={li.fee_schedule_id}
                  onChange={(e) => updateLineItem(idx, "fee_schedule_id", e.target.value)}
                  className="block w-full rounded-md border border-[var(--input)] bg-[var(--card)] px-2 py-1.5 text-[var(--text-xs)] focus:border-[var(--input-focus)] focus:outline-none"
                >
                  <option value="">Manual entry</option>
                  {feeSchedules.map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex-[2]">
                <input
                  type="text"
                  value={li.description}
                  onChange={(e) => updateLineItem(idx, "description", e.target.value)}
                  placeholder="Description"
                  className="block w-full rounded-md border border-[var(--input)] bg-[var(--card)] px-2 py-1.5 text-[var(--text-xs)] focus:border-[var(--input-focus)]"
                />
              </div>
              <div className="w-16">
                <input
                  type="number"
                  min={1}
                  value={li.quantity}
                  onChange={(e) => updateLineItem(idx, "quantity", parseInt(e.target.value) || 1)}
                  className="block w-full rounded-md border border-[var(--input)] bg-[var(--card)] px-2 py-1.5 text-[var(--text-xs)] focus:border-[var(--input-focus)]"
                />
              </div>
              <div className="w-28">
                <input
                  type="number"
                  step={0.01}
                  value={(li.unit_amount_cents / 100).toFixed(2)}
                  onChange={(e) => updateLineItem(idx, "unit_amount_cents", Math.round(parseFloat(e.target.value || "0") * 100))}
                  className="block w-full rounded-md border border-[var(--input)] bg-[var(--card)] px-2 py-1.5 text-[var(--text-xs)] font-mono focus:border-[var(--input-focus)]"
                />
              </div>
              <div className="w-24 text-right">
                <span className="inline-block py-1.5 text-[var(--text-xs)] font-bold text-[var(--foreground)] tabular-nums">
                  {formatCurrency(li.quantity * li.unit_amount_cents, currency)}
                </span>
              </div>
              {lineItems.length > 1 && (
                <button onClick={() => removeLineItem(idx)} className="rounded p-1 text-[var(--muted-foreground)] hover:text-[var(--destructive)] hover:bg-[var(--destructive-foreground)]">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18 18 6M6 6l12 12" /></svg>
                </button>
              )}
            </div>
          ))}
        </div>
        <div className="mt-3 flex justify-end border-t border-[var(--border)] pt-3">
          <p className="text-[var(--text-sm)] font-bold text-[var(--foreground)]">
            Total: {formatCurrency(total, currency)}
          </p>
        </div>
      </div>

      <div className="mt-4">
        <label className="block text-[var(--text-xs)] font-medium text-[var(--form-label-fg)]">Notes (optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="mt-1 block w-full rounded-lg border border-[var(--input)] bg-[var(--card)] px-3 py-2 text-[var(--text-sm)] focus:border-[var(--input-focus)] focus:outline-none focus:ring-1 focus:ring-[var(--ring)]"
        />
      </div>

      <div className="mt-6 flex items-center gap-3">
        <button
          onClick={handleSubmit}
          disabled={isSaving}
          className="rounded-lg bg-[var(--primary)] px-4 py-2 text-[var(--text-sm)] font-medium text-[var(--primary-foreground)] hover:bg-[var(--primary-600)] shadow-[var(--shadow-sm)] transition-colors disabled:opacity-50"
        >
          {isSaving ? "Creating..." : "Create Invoice"}
        </button>
        <button
          onClick={onCancel}
          className="rounded-lg border border-[var(--border-strong)] px-4 py-2 text-[var(--text-sm)] font-medium text-[var(--foreground)] hover:bg-[var(--background)] transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function CreateFeeForm({
  classes,
  currency,
  onCreated,
  onCancel,
}: {
  classes: ClassOption[];
  currency: string;
  onCreated: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [classId, setClassId] = useState("");
  const [amountDollars, setAmountDollars] = useState("");
  const [frequency, setFrequency] = useState("termly");
  const [description, setDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const frequencies: FeeFrequency[] = ["weekly", "fortnightly", "monthly", "termly", "annually", "one_off"];

  async function handleSubmit() {
    setError(null);
    if (!name.trim()) { setError("Name is required"); return; }
    const cents = Math.round(parseFloat(amountDollars || "0") * 100);
    if (cents <= 0) { setError("Amount must be greater than zero"); return; }

    setIsSaving(true);
    const result = await createFeeSchedule({
      name: name.trim(),
      class_id: classId || null,
      amount_cents: cents,
      currency,
      frequency,
      description: description.trim() || undefined,
    });
    setIsSaving(false);

    if (result.error) {
      setError(result.error.message);
      return;
    }
    onCreated();
  }

  return (
    <div className="rounded-lg border border-[var(--primary-200)] bg-[var(--primary-50)] p-[var(--density-card-padding)] animate-fade-in">
      <h3 className="text-[var(--text-sm)] font-semibold text-[var(--foreground)]">Create Fee Schedule</h3>

      {error && (
        <div className="mt-3 rounded-md bg-[var(--form-error-bg)] p-3">
          <p className="text-[var(--text-sm)] text-[var(--form-error-fg)]">{error}</p>
        </div>
      )}

      <div className="mt-4 grid grid-cols-1 gap-[var(--density-md)] sm:grid-cols-2">
        <div>
          <label className="block text-[var(--text-xs)] font-medium text-[var(--form-label-fg)]">Name *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-[var(--input)] bg-[var(--card)] px-3 h-[var(--density-input-height)] text-[var(--text-sm)] focus:border-[var(--input-focus)] focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-[var(--text-xs)] font-medium text-[var(--form-label-fg)]">Class (optional)</label>
          <select
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-[var(--input)] bg-[var(--card)] px-3 h-[var(--density-input-height)] text-[var(--text-sm)] focus:border-[var(--input-focus)] focus:outline-none"
          >
            <option value="">School-wide (all classes)</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[var(--text-xs)] font-medium text-[var(--form-label-fg)]">Amount ($) *</label>
          <input
            type="number"
            step={0.01}
            value={amountDollars}
            onChange={(e) => setAmountDollars(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-[var(--input)] bg-[var(--card)] px-3 h-[var(--density-input-height)] text-[var(--text-sm)] font-mono focus:border-[var(--input-focus)]"
          />
        </div>
        <div>
          <label className="block text-[var(--text-xs)] font-medium text-[var(--form-label-fg)]">Frequency *</label>
          <select
            value={frequency}
            onChange={(e) => setFrequency(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-[var(--input)] bg-[var(--card)] px-3 h-[var(--density-input-height)] text-[var(--text-sm)] focus:border-[var(--input-focus)]"
          >
            {frequencies.map((f) => (
              <option key={f} value={f}>{FEE_FREQUENCY_CONFIG[f].label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={handleSubmit}
          disabled={isSaving}
          className="rounded-lg bg-[var(--primary)] px-4 py-2 text-[var(--text-sm)] font-medium text-[var(--primary-foreground)] hover:bg-[var(--primary-600)] shadow-[var(--shadow-sm)] transition-colors disabled:opacity-50"
        >
          {isSaving ? "Creating..." : "Create Fee Schedule"}
        </button>
        <button
          onClick={onCancel}
          className="rounded-lg border border-[var(--border-strong)] px-4 py-2 text-[var(--text-sm)] font-medium text-[var(--foreground)] hover:bg-[var(--background)] transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function FeeScheduleCard({
  fee,
  currency,
  onUpdated,
}: {
  fee: FeeSchedule;
  currency: string;
  onUpdated: () => void;
}) {
  const [toggling, setToggling] = useState(false);
  const freqConfig = FEE_FREQUENCY_CONFIG[fee.frequency as FeeFrequency] ?? {
    label: fee.frequency,
    shortLabel: "",
  };

  async function handleToggleActive() {
    setToggling(true);
    await updateFeeSchedule(fee.id, { is_active: !fee.is_active });
    setToggling(false);
    onUpdated();
  }

  return (
    <div
      className={`rounded-lg border bg-[var(--card)] p-[var(--density-card-padding)] shadow-[var(--shadow-sm)] card-interactive ${
        fee.is_active ? "border-[var(--border)]" : "border-[var(--border)] opacity-60 grayscale-[0.5]"
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <h4 className="text-[var(--text-sm)] font-bold text-[var(--foreground)]">{fee.name}</h4>
          {fee.description && (
            <p className="mt-1 text-[var(--text-xs)] text-[var(--muted-foreground)] line-clamp-2">
              {fee.description}
            </p>
          )}
        </div>
        <span
          className={`status-badge px-2 py-0.5 ${
            fee.is_active 
              ? "bg-[var(--success-foreground)] text-[var(--success)]" 
              : "bg-[var(--muted)] text-[var(--muted-foreground)]"
          }`}
        >
          {fee.is_active ? "Active" : "Inactive"}
        </span>
      </div>
      <div className="mt-4 flex items-baseline gap-1">
        <span className="text-[var(--text-xl)] font-bold text-[var(--foreground)] tabular-nums">
          {formatCurrency(fee.amount_cents, currency)}
        </span>
        <span className="text-[var(--text-xs)] text-[var(--muted-foreground)]">
          {freqConfig.shortLabel}
        </span>
      </div>
      <p className="mt-1 text-[var(--text-xs)] font-medium text-[var(--muted-foreground)] uppercase tracking-wider">{freqConfig.label}</p>
      <div className="mt-4 border-t border-[var(--border)] pt-3">
        <button
          onClick={handleToggleActive}
          disabled={toggling}
          className="text-[var(--text-xs)] font-semibold text-[var(--primary-700)] dark:text-[var(--primary-400)] hover:underline disabled:opacity-50"
        >
          {fee.is_active ? "Deactivate Schedule" : "Reactivate Schedule"}
        </button>
      </div>
    </div>
  );
}