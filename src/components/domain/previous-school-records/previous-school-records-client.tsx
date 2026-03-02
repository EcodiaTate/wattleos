"use client";

import { useState } from "react";
import type { PreviousSchoolRecord } from "@/types/domain";
import { PreviousSchoolRecordForm } from "./previous-school-record-form";
import { useHaptics } from "@/lib/hooks/use-haptics";

interface Props {
  studentId: string;
  records: PreviousSchoolRecord[];
  canManage: boolean;
}

// ── Helpers ───────────────────────────────────────────────────

function formatDateRange(start: string | null, end: string | null): string {
  const fmt = (d: string) =>
    new Date(d + "T00:00:00").toLocaleDateString("en-AU", {
      month: "short",
      year: "numeric",
    });

  if (start && end) return `${fmt(start)} – ${fmt(end)}`;
  if (start) return `From ${fmt(start)}`;
  if (end) return `Until ${fmt(end)}`;
  return "Dates unknown";
}

function schoolTypeLabel(type: string | null): string {
  const labels: Record<string, string> = {
    government: "Government",
    independent: "Independent",
    catholic: "Catholic",
    international: "International",
    homeschool: "Homeschool",
    other: "Other",
  };
  return type ? (labels[type] ?? type) : "";
}

// ── Card ──────────────────────────────────────────────────────

function RecordCard({
  record,
  canManage,
  isExpanded,
  onToggle,
}: {
  record: PreviousSchoolRecord;
  canManage: boolean;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const haptics = useHaptics();
  const typeLabel = schoolTypeLabel(record.school_type);
  const location = [
    record.suburb,
    record.state,
    record.country !== "Australia" ? record.country : null,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div
      className="rounded-xl border border-border overflow-hidden"
      style={{ backgroundColor: "var(--card)" }}
    >
      {/* Header row - always visible */}
      <button
        type="button"
        onClick={() => {
          onToggle();
          haptics.selection();
        }}
        className="card-interactive w-full px-4 py-4 text-left"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p
              className="truncate text-sm font-semibold"
              style={{ color: "var(--foreground)" }}
            >
              {record.school_name}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
              {typeLabel && (
                <span
                  className="rounded-full px-2 py-0.5 text-xs font-medium"
                  style={{
                    backgroundColor: "var(--accent)",
                    color: "var(--accent-foreground)",
                  }}
                >
                  {typeLabel}
                </span>
              )}
              {location && (
                <span
                  className="text-xs"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  {location}
                </span>
              )}
            </div>
            <p
              className="mt-1 text-xs"
              style={{ color: "var(--muted-foreground)" }}
            >
              {formatDateRange(record.start_date, record.end_date)}
            </p>
            {record.year_levels && record.year_levels.length > 0 && (
              <p
                className="mt-0.5 text-xs"
                style={{ color: "var(--muted-foreground)" }}
              >
                {record.year_levels.join(", ")}
              </p>
            )}
          </div>
          <span
            className="mt-0.5 shrink-0 text-sm transition-transform"
            style={{
              color: "var(--muted-foreground)",
              transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
            }}
          >
            ▾
          </span>
        </div>
      </button>

      {/* Expanded detail / edit form */}
      {isExpanded && (
        <div className="border-t border-border px-4 py-5">
          {/* Contact detail (read) */}
          {(record.principal_name ||
            record.contact_phone ||
            record.contact_email) &&
            !canManage && (
              <div
                className="mb-5 space-y-1.5 text-sm"
                style={{ color: "var(--muted-foreground)" }}
              >
                {record.principal_name && <p>👤 {record.principal_name}</p>}
                {record.contact_phone && <p>📞 {record.contact_phone}</p>}
                {record.contact_email && <p>✉️ {record.contact_email}</p>}
                {record.reason_for_leaving && (
                  <p>↩ {record.reason_for_leaving}</p>
                )}
                {record.transfer_document_url && (
                  <p>
                    📄{" "}
                    <a
                      href={record.transfer_document_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                      style={{ color: "var(--primary)" }}
                    >
                      Transfer document
                    </a>
                  </p>
                )}
                {record.notes && (
                  <p className="whitespace-pre-wrap">{record.notes}</p>
                )}
              </div>
            )}

          {/* Edit form (manage only) */}
          {canManage && (
            <PreviousSchoolRecordForm
              studentId={record.student_id}
              record={record}
              canManage={canManage}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ── Main client ───────────────────────────────────────────────

export function PreviousSchoolRecordsClient({
  studentId,
  records,
  canManage,
}: Props) {
  const haptics = useHaptics();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
    if (showAddForm) setShowAddForm(false);
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2
          className="text-base font-semibold"
          style={{ color: "var(--foreground)" }}
        >
          Previous Schools
          {records.length > 0 && (
            <span
              className="ml-2 rounded-full px-2 py-0.5 text-xs font-normal"
              style={{
                backgroundColor: "var(--accent)",
                color: "var(--accent-foreground)",
              }}
            >
              {records.length}
            </span>
          )}
        </h2>
        {canManage && (
          <button
            type="button"
            onClick={() => {
              setShowAddForm((v) => !v);
              setExpandedId(null);
              haptics.selection();
            }}
            className="active-push touch-target rounded-lg px-3 py-1.5 text-sm font-medium"
            style={{
              backgroundColor: showAddForm ? "var(--muted)" : "var(--primary)",
              color: showAddForm
                ? "var(--foreground)"
                : "var(--primary-foreground)",
            }}
          >
            {showAddForm ? "Cancel" : "+ Add School"}
          </button>
        )}
      </div>

      {/* Add form */}
      {showAddForm && canManage && (
        <div
          className="rounded-xl border border-border p-5"
          style={{ backgroundColor: "var(--card)" }}
        >
          <p
            className="mb-4 text-sm font-semibold"
            style={{ color: "var(--foreground)" }}
          >
            Add Previous School
          </p>
          <PreviousSchoolRecordForm
            studentId={studentId}
            canManage={canManage}
            onSaved={() => setShowAddForm(false)}
          />
        </div>
      )}

      {/* Empty state */}
      {records.length === 0 && !showAddForm && (
        <div className="rounded-xl border border-border py-12 text-center">
          <p className="text-2xl" style={{ color: "var(--empty-state-icon)" }}>
            🏫
          </p>
          <p
            className="mt-2 text-sm"
            style={{ color: "var(--muted-foreground)" }}
          >
            No previous school records recorded
          </p>
          {canManage && (
            <p
              className="mt-1 text-xs"
              style={{ color: "var(--muted-foreground)" }}
            >
              Use &ldquo;+ Add School&rdquo; above to start building the history
            </p>
          )}
        </div>
      )}

      {/* Record cards */}
      {records.length > 0 && (
        <div className="space-y-3">
          {records.map((r) => (
            <RecordCard
              key={r.id}
              record={r}
              canManage={canManage}
              isExpanded={expandedId === r.id}
              onToggle={() => toggleExpand(r.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
