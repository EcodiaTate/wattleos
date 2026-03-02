"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useHaptics } from "@/lib/hooks/use-haptics";
import { createComplaint, updateComplaint } from "@/lib/actions/policies";
import type { Complaint } from "@/types/domain";
import type { CreateComplaintInput } from "@/lib/validations/policies";

interface ComplaintFormProps {
  complaint?: Complaint;
}

const COMPLAINANT_TYPES = [
  { value: "parent", label: "Parent / Guardian" },
  { value: "staff", label: "Staff Member" },
  { value: "anonymous", label: "Anonymous" },
  { value: "regulator", label: "Regulator" },
  { value: "other", label: "Other" },
] as const;

export function ComplaintForm({ complaint }: ComplaintFormProps) {
  const router = useRouter();
  const haptics = useHaptics();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [receivedAt, setReceivedAt] = useState(
    complaint?.received_at?.split("T")[0] ?? new Date().toISOString().split("T")[0],
  );
  const [complainantType, setComplainantType] = useState(
    complaint?.complainant_type ?? "parent",
  );
  const [complainantName, setComplainantName] = useState(complaint?.complainant_name ?? "");
  const [complainantContact, setComplainantContact] = useState(complaint?.complainant_contact ?? "");
  const [subject, setSubject] = useState(complaint?.subject ?? "");
  const [description, setDescription] = useState(complaint?.description ?? "");
  const [targetResolutionDate, setTargetResolutionDate] = useState(
    complaint?.target_resolution_date ?? "",
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const input: CreateComplaintInput = {
      received_at: receivedAt,
      complainant_type: complainantType as CreateComplaintInput["complainant_type"],
      complainant_name: complainantName || undefined,
      complainant_contact: complainantContact || undefined,
      subject,
      description,
      target_resolution_date: targetResolutionDate || undefined,
    };

    startTransition(async () => {
      const result = complaint
        ? await updateComplaint(complaint.id, input)
        : await createComplaint(input);

      if (result.error) {
        setError(result.error.message ?? "Something went wrong");
        haptics.error();
        return;
      }

      haptics.success();
      router.push(`/admin/policies/complaints/${result.data!.id}`);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div
          className="rounded-[var(--radius-md)] border p-3 text-sm"
          style={{
            borderColor: "var(--destructive)",
            background: "color-mix(in srgb, var(--destructive) 8%, transparent)",
            color: "var(--destructive)",
          }}
        >
          {error}
        </div>
      )}

      {/* Subject */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
          Subject *
        </label>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Brief summary of the complaint"
          required
          className="w-full rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
          style={{ background: "var(--input)", color: "var(--foreground)" }}
        />
      </div>

      {/* Complainant type + name */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <label className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
            Complainant Type *
          </label>
          <select
            value={complainantType}
            onChange={(e) => setComplainantType(e.target.value as CreateComplaintInput["complainant_type"])}
            className="w-full rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
            style={{ background: "var(--input)", color: "var(--foreground)" }}
          >
            {COMPLAINANT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
            Name
          </label>
          <input
            type="text"
            value={complainantName}
            onChange={(e) => setComplainantName(e.target.value)}
            placeholder="Complainant name"
            className="w-full rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
            style={{ background: "var(--input)", color: "var(--foreground)" }}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
            Contact
          </label>
          <input
            type="text"
            value={complainantContact}
            onChange={(e) => setComplainantContact(e.target.value)}
            placeholder="Phone or email"
            className="w-full rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
            style={{ background: "var(--input)", color: "var(--foreground)" }}
          />
        </div>
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
          Description *
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Full details of the complaint, including context and any evidence..."
          required
          rows={5}
          className="w-full rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
          style={{ background: "var(--input)", color: "var(--foreground)" }}
        />
      </div>

      {/* Dates */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
            Date Received *
          </label>
          <input
            type="date"
            value={receivedAt}
            onChange={(e) => setReceivedAt(e.target.value)}
            required
            className="w-full rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
            style={{ background: "var(--input)", color: "var(--foreground)" }}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
            Target Resolution Date
          </label>
          <input
            type="date"
            value={targetResolutionDate}
            onChange={(e) => setTargetResolutionDate(e.target.value)}
            className="w-full rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
            style={{ background: "var(--input)", color: "var(--foreground)" }}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="active-push touch-target rounded-[var(--radius-md)] border border-border px-4 py-2 text-sm font-medium"
          style={{ color: "var(--foreground)" }}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="active-push touch-target rounded-[var(--radius-md)] px-4 py-2 text-sm font-semibold transition-opacity disabled:opacity-50"
          style={{
            background: "var(--primary)",
            color: "var(--primary-foreground)",
          }}
        >
          {isPending
            ? "Saving..."
            : complaint
              ? "Update Complaint"
              : "Register Complaint"}
        </button>
      </div>
    </form>
  );
}
