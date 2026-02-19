// src/components/domain/billing/billing-dashboard-client.tsx
//
// ============================================================
// WattleOS V2 - Billing Dashboard (Client Component)
// ============================================================
// Two tabs: Invoices and Fee Schedules.
//
// Invoices tab: List + create form + Stripe sync/send actions.
// Fee Schedules tab: List + create form for tuition pricing.
// ============================================================

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

// ============================================================
// Props
// ============================================================

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

// ============================================================
// COMPONENT
// ============================================================

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

  // Summary stats
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
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-[var(--density-card-padding)] sm:grid-cols-3">
        <div className="rounded-lg borderborder-border bg-background p-[var(--density-card-padding)]">
          <p className="text-xs font-medium text-muted-foreground">
            Outstanding
          </p>
          <p className="mt-1 text-xl font-bold text-amber-700">
            {formatCurrency(totalOutstanding, currency)}
          </p>
        </div>
        <div className="rounded-lg borderborder-border bg-background p-[var(--density-card-padding)]">
          <p className="text-xs font-medium text-muted-foreground">Collected</p>
          <p className="mt-1 text-xl font-bold text-green-700">
            {formatCurrency(totalPaid, currency)}
          </p>
        </div>
        <div className="rounded-lg borderborder-border bg-background p-[var(--density-card-padding)]">
          <p className="text-xs font-medium text-muted-foreground">Overdue</p>
          <p className="mt-1 text-xl font-bold text-red-700">{overdueCount}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between border-bborder-border">
        <div className="flex gap-[var(--density-card-padding)]">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`border-b-2 pb-3 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? "border-primary text-amber-700"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
              <span className="ml-1.5 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
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
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-amber-700 transition-colors"
        >
          {activeTab === "invoices" ? "New Invoice" : "New Fee Schedule"}
        </button>
      </div>

      {/* Invoices tab */}
      {activeTab === "invoices" && (
        <div className="space-y-3">
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
            <div className="rounded-lg border border-dashed border-gray-300 bg-background py-12 text-center">
              <p className="text-sm text-muted-foreground">
                No invoices yet. Create one to get started.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg borderborder-border bg-background">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-background">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                      Invoice
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                      Student
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                      Guardian
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                      Amount
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                      Due
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                      Status
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
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
        <div className="space-y-3">
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
            <div className="rounded-lg border border-dashed border-gray-300 bg-background py-12 text-center">
              <p className="text-sm text-muted-foreground">
                No fee schedules defined. Create one to set tuition pricing.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
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

// ============================================================
// INVOICE ROW
// ============================================================

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
    <tr className="hover:bg-background">
      <td className="px-4 py-3">
        <p className="text-sm font-medium text-foreground">
          {invoice.invoice_number}
        </p>
        <p className="text-xs text-muted-foreground">
          {invoice.line_items.length} item
          {invoice.line_items.length !== 1 ? "s" : ""}
        </p>
      </td>
      <td className="px-4 py-3 text-sm text-foreground">{studentName}</td>
      <td className="px-4 py-3 text-sm text-foreground">{guardianName}</td>
      <td className="px-4 py-3 text-sm font-medium text-foreground">
        {formatCurrency(invoice.total_cents, currency)}
      </td>
      <td className="px-4 py-3 text-sm text-foreground">
        {new Date(invoice.due_date).toLocaleDateString("en-AU")}
      </td>
      <td className="px-4 py-3">
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusConfig.bgColor} ${statusConfig.color}`}
        >
          {statusConfig.label}
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-1">
          {invoice.status === "draft" && !invoice.stripe_invoice_id && (
            <button
              onClick={() => handleAction("sync")}
              disabled={acting}
              className="rounded px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-50"
            >
              Sync to Stripe
            </button>
          )}
          {invoice.status === "pending" && invoice.stripe_invoice_id && (
            <button
              onClick={() => handleAction("send")}
              disabled={acting}
              className="rounded px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-50 disabled:opacity-50"
            >
              Send
            </button>
          )}
          {invoice.stripe_hosted_url && (
            <a
              href={invoice.stripe_hosted_url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted"
            >
              View
            </a>
          )}
          {!["paid", "void", "refunded"].includes(invoice.status) && (
            <button
              onClick={() => handleAction("void")}
              disabled={acting}
              className="rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              Void
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

// ============================================================
// CREATE INVOICE FORM
// ============================================================

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

        // If fee schedule selected, auto-fill description + amount
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
    if (!selectedStudentId) {
      setError("Select a student");
      return;
    }
    if (!selectedGuardianId) {
      setError("Select a guardian");
      return;
    }
    if (!dueDate) {
      setError("Set a due date");
      return;
    }
    if (lineItems.some((li) => !li.description.trim())) {
      setError("All line items need a description");
      return;
    }
    if (lineItems.some((li) => li.unit_amount_cents <= 0)) {
      setError("All line items need a positive amount");
      return;
    }

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
    <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-[var(--density-card-padding)]">
      <h3 className="text-sm font-semibold text-foreground">Create Invoice</h3>

      {error && (
        <div className="mt-3 rounded-md bg-red-50 p-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="mt-4 grid grid-cols-1 gap-[var(--density-card-padding)] sm:grid-cols-2">
        {/* Student */}
        <div>
          <label className="block text-xs font-medium text-foreground">
            Student *
          </label>
          <select
            value={selectedStudentId}
            onChange={(e) => {
              setSelectedStudentId(e.target.value);
              setSelectedGuardianId("");
            }}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">Select student...</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.first_name} {s.last_name}
              </option>
            ))}
          </select>
        </div>

        {/* Guardian */}
        <div>
          <label className="block text-xs font-medium text-foreground">
            Bill to (Guardian) *
          </label>
          <select
            value={selectedGuardianId}
            onChange={(e) => setSelectedGuardianId(e.target.value)}
            disabled={!selectedStudentId}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
          >
            <option value="">Select guardian...</option>
            {guardians.map((g) => (
              <option key={g.id} value={g.id}>
                {g.user.first_name} {g.user.last_name} ({g.relationship}) -{" "}
                {g.user.email}
              </option>
            ))}
          </select>
        </div>

        {/* Due date */}
        <div>
          <label className="block text-xs font-medium text-foreground">
            Due Date *
          </label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        {/* Period */}
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="block text-xs font-medium text-foreground">
              Period Start
            </label>
            <input
              type="date"
              value={periodStart}
              onChange={(e) => setPeriodStart(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-foreground">
              Period End
            </label>
            <input
              type="date"
              value={periodEnd}
              onChange={(e) => setPeriodEnd(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        </div>
      </div>

      {/* Line items */}
      <div className="mt-5">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-foreground">Line Items</h4>
          <button
            onClick={addLineItem}
            className="text-xs font-medium text-amber-700 hover:text-amber-800"
          >
            + Add line
          </button>
        </div>
        <div className="mt-2 space-y-2">
          {lineItems.map((li, idx) => (
            <div key={idx} className="flex items-end gap-2">
              <div className="flex-1">
                {idx === 0 && (
                  <label className="block text-[10px] font-medium text-muted-foreground">
                    Fee Schedule (optional)
                  </label>
                )}
                <select
                  value={li.fee_schedule_id}
                  onChange={(e) =>
                    updateLineItem(idx, "fee_schedule_id", e.target.value)
                  }
                  className="block w-full rounded-md border border-gray-300 px-2 py-1.5 text-xs focus:border-ring focus:outline-none"
                >
                  <option value="">Manual entry</option>
                  {feeSchedules.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} - {formatCurrency(f.amount_cents, currency)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-[2]">
                {idx === 0 && (
                  <label className="block text-[10px] font-medium text-muted-foreground">
                    Description
                  </label>
                )}
                <input
                  type="text"
                  value={li.description}
                  onChange={(e) =>
                    updateLineItem(idx, "description", e.target.value)
                  }
                  placeholder="Tuition - Term 1 2026"
                  className="block w-full rounded-md border border-gray-300 px-2 py-1.5 text-xs focus:border-ring focus:outline-none"
                />
              </div>
              <div className="w-16">
                {idx === 0 && (
                  <label className="block text-[10px] font-medium text-muted-foreground">
                    Qty
                  </label>
                )}
                <input
                  type="number"
                  min={1}
                  value={li.quantity}
                  onChange={(e) =>
                    updateLineItem(
                      idx,
                      "quantity",
                      parseInt(e.target.value) || 1,
                    )
                  }
                  className="block w-full rounded-md border border-gray-300 px-2 py-1.5 text-xs focus:border-ring focus:outline-none"
                />
              </div>
              <div className="w-28">
                {idx === 0 && (
                  <label className="block text-[10px] font-medium text-muted-foreground">
                    Amount ($)
                  </label>
                )}
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={(li.unit_amount_cents / 100).toFixed(2)}
                  onChange={(e) =>
                    updateLineItem(
                      idx,
                      "unit_amount_cents",
                      Math.round(parseFloat(e.target.value || "0") * 100),
                    )
                  }
                  className="block w-full rounded-md border border-gray-300 px-2 py-1.5 text-xs font-mono focus:border-ring focus:outline-none"
                />
              </div>
              <div className="w-24 text-right">
                {idx === 0 && (
                  <label className="block text-[10px] font-medium text-muted-foreground">
                    Subtotal
                  </label>
                )}
                <span className="inline-block py-1.5 text-xs font-medium text-foreground">
                  {formatCurrency(li.quantity * li.unit_amount_cents, currency)}
                </span>
              </div>
              {lineItems.length > 1 && (
                <button
                  onClick={() => removeLineItem(idx)}
                  className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-red-600"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18 18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
        <div className="mt-3 flex justify-end border-tborder-border pt-3">
          <p className="text-sm font-semibold text-foreground">
            Total: {formatCurrency(total, currency)}
          </p>
        </div>
      </div>

      {/* Notes */}
      <div className="mt-4">
        <label className="block text-xs font-medium text-foreground">
          Notes (optional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Internal notes about this invoice..."
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      {/* Actions */}
      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={handleSubmit}
          disabled={isSaving}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-amber-700 disabled:opacity-50 transition-colors"
        >
          {isSaving ? "Creating..." : "Create Invoice"}
        </button>
        <button
          onClick={onCancel}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-foreground hover:bg-background transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ============================================================
// CREATE FEE SCHEDULE FORM
// ============================================================

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

  const frequencies: FeeFrequency[] = [
    "weekly",
    "fortnightly",
    "monthly",
    "termly",
    "annually",
    "one_off",
  ];

  async function handleSubmit() {
    setError(null);
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    const cents = Math.round(parseFloat(amountDollars || "0") * 100);
    if (cents <= 0) {
      setError("Amount must be greater than zero");
      return;
    }

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
    <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-[var(--density-card-padding)]">
      <h3 className="text-sm font-semibold text-foreground">
        Create Fee Schedule
      </h3>

      {error && (
        <div className="mt-3 rounded-md bg-red-50 p-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="mt-4 grid grid-cols-1 gap-[var(--density-card-padding)] sm:grid-cols-2">
        <div>
          <label className="block text-xs font-medium text-foreground">
            Name *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="3-6 Primary Tuition - 2026"
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-foreground">
            Class (optional)
          </label>
          <select
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">School-wide (all classes)</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.cycle_level ? `(${c.cycle_level})` : ""}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-foreground">
            Amount ($) *
          </label>
          <input
            type="number"
            min={0}
            step={0.01}
            value={amountDollars}
            onChange={(e) => setAmountDollars(e.target.value)}
            placeholder="2500.00"
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-foreground">
            Frequency *
          </label>
          <select
            value={frequency}
            onChange={(e) => setFrequency(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {frequencies.map((f) => (
              <option key={f} value={f}>
                {FEE_FREQUENCY_CONFIG[f].label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4">
        <label className="block text-xs font-medium text-foreground">
          Description (appears on invoices)
        </label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Tuition fee for 3-6 Primary program, Term 1 2026"
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={handleSubmit}
          disabled={isSaving}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-amber-700 disabled:opacity-50 transition-colors"
        >
          {isSaving ? "Creating..." : "Create Fee Schedule"}
        </button>
        <button
          onClick={onCancel}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-foreground hover:bg-background transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ============================================================
// FEE SCHEDULE CARD
// ============================================================

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
      className={`rounded-lg border bg-background p-[var(--density-card-padding)] shadow-sm ${fee.is_active ? "border-border" : "border-gray-100 opacity-60"}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <h4 className="text-sm font-semibold text-foreground">{fee.name}</h4>
          {fee.description && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {fee.description}
            </p>
          )}
        </div>
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${fee.is_active ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}
        >
          {fee.is_active ? "Active" : "Inactive"}
        </span>
      </div>
      <div className="mt-3 flex items-baseline gap-1">
        <span className="text-lg font-bold text-foreground">
          {formatCurrency(fee.amount_cents, currency)}
        </span>
        <span className="text-xs text-muted-foreground">
          {freqConfig.shortLabel}
        </span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{freqConfig.label}</p>
      <div className="mt-3 border-t border-gray-100 pt-3">
        <button
          onClick={handleToggleActive}
          disabled={toggling}
          className="text-xs font-medium text-muted-foreground hover:text-foreground disabled:opacity-50"
        >
          {fee.is_active ? "Deactivate" : "Reactivate"}
        </button>
      </div>
    </div>
  );
}
