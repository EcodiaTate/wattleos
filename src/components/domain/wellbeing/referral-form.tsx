"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useHaptics } from "@/lib/hooks/use-haptics";
import type { StudentReferralWithStudent, Student } from "@/types/domain";
import {
  createReferral,
  updateReferral,
  updateReferralStatus,
  deleteReferral,
} from "@/lib/actions/wellbeing";
import { ReferralStatusBadge } from "./referral-status-badge";
import { REFERRAL_SPECIALTY_CONFIG, VALID_REFERRAL_STATUS_TRANSITIONS } from "@/lib/constants/wellbeing";
import type { ReferralStatus, ReferralSpecialty } from "@/types/domain";

const SPECIALTIES = Object.entries(REFERRAL_SPECIALTY_CONFIG).map(([value, cfg]) => ({
  value: value as ReferralSpecialty,
  label: `${cfg.emoji} ${cfg.label}`,
}));

const STATUSES = [
  { value: "pending" as const, label: "Pending" },
  { value: "accepted" as const, label: "Accepted" },
  { value: "in_progress" as const, label: "In Progress" },
  { value: "closed" as const, label: "Closed" },
  { value: "declined" as const, label: "Declined" },
];

interface ReferralFormProps {
  students: Array<Pick<Student, "id" | "first_name" | "last_name" | "preferred_name">>;
  referral?: StudentReferralWithStudent | null;
  canManage: boolean;
  defaultStudentId?: string;
}

export function ReferralForm({ students, referral, canManage, defaultStudentId }: ReferralFormProps) {
  const router = useRouter();
  const haptics = useHaptics();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [studentId, setStudentId] = useState(referral?.student_id || defaultStudentId || "");
  const [referralType, setReferralType] = useState<"internal" | "external">(referral?.referral_type || "external");
  const [specialty, setSpecialty] = useState<ReferralSpecialty>(referral?.specialty || "speech_pathology");
  const [referralReason, setReferralReason] = useState(referral?.referral_reason || "");
  const [referredToName, setReferredToName] = useState(referral?.referred_to_name || "");
  const [referredToOrg, setReferredToOrg] = useState(referral?.referred_to_organisation || "");
  const [notes, setNotes] = useState(referral?.notes || "");
  const [followUpDate, setFollowUpDate] = useState(referral?.follow_up_date || "");
  const [status, setStatus] = useState<ReferralStatus>(referral?.status || "pending");
  const [outcomeNotes, setOutcomeNotes] = useState(referral?.outcome_notes || "");

  const validNextStatuses = referral ? VALID_REFERRAL_STATUS_TRANSITIONS[referral.status] : [];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!studentId) { setError("Please select a student"); haptics.error(); return; }
    if (!referralReason.trim()) { setError("Referral reason is required"); haptics.error(); return; }

    startTransition(async () => {
      const input = {
        student_id: studentId,
        referral_type: referralType,
        specialty,
        referral_reason: referralReason.trim(),
        referred_to_name: referredToName.trim() || null,
        referred_to_organisation: referredToOrg.trim() || null,
        notes: notes.trim() || null,
        follow_up_date: followUpDate || null,
        linked_flag_id: null,
      };
      const result = referral ? await updateReferral(referral.id, input) : await createReferral(input);
      if (result.error) { setError(result.error.message); haptics.error(); return; }
      haptics.success();
      router.push("/admin/wellbeing/referrals");
      router.refresh();
    });
  }

  async function handleStatusChange(newStatus: ReferralStatus) {
    if (!referral) return;
    startTransition(async () => {
      const result = await updateReferralStatus(referral.id, {
        status: newStatus,
        outcome_notes: outcomeNotes.trim() || null,
      });
      if (result.error) { setError(result.error.message); haptics.error(); return; }
      haptics.success();
      setStatus(newStatus);
      router.refresh();
    });
  }

  async function handleDelete() {
    if (!referral) return;
    startTransition(async () => {
      const result = await deleteReferral(referral.id);
      if (result.error) { setError(result.error.message); haptics.error(); return; }
      haptics.success();
      router.push("/admin/wellbeing/referrals");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg border p-3 text-sm" style={{ borderColor: "var(--destructive)", color: "var(--destructive)" }}>
          {error}
        </div>
      )}

      <div className="space-y-1.5">
        <label className="text-sm font-medium" style={{ color: "var(--foreground)" }}>Student *</label>
        <select
          disabled={!canManage || !!referral}
          value={studentId}
          onChange={(e) => { setStudentId(e.target.value); haptics.selection(); }}
          className="w-full rounded-lg border border-border px-3 py-2 text-sm"
          style={{ backgroundColor: "var(--input)", color: "var(--foreground)" }}
        >
          <option value="">Select a student...</option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.preferred_name || `${s.first_name} ${s.last_name}`}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium" style={{ color: "var(--foreground)" }}>Referral Type *</label>
          <select
            disabled={!canManage}
            value={referralType}
            onChange={(e) => { setReferralType(e.target.value as typeof referralType); haptics.selection(); }}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm"
            style={{ backgroundColor: "var(--input)", color: "var(--foreground)" }}
          >
            <option value="internal">Internal</option>
            <option value="external">External</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium" style={{ color: "var(--foreground)" }}>Specialty *</label>
          <select
            disabled={!canManage}
            value={specialty}
            onChange={(e) => { setSpecialty(e.target.value as ReferralSpecialty); haptics.selection(); }}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm"
            style={{ backgroundColor: "var(--input)", color: "var(--foreground)" }}
          >
            {SPECIALTIES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
      </div>

      {referralType === "external" && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium" style={{ color: "var(--foreground)" }}>Practitioner Name</label>
            <input disabled={!canManage} type="text" value={referredToName} onChange={(e) => setReferredToName(e.target.value)}
              maxLength={200} placeholder="e.g. Dr. Jane Smith"
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
              style={{ backgroundColor: "var(--input)", color: "var(--foreground)" }} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium" style={{ color: "var(--foreground)" }}>Organisation</label>
            <input disabled={!canManage} type="text" value={referredToOrg} onChange={(e) => setReferredToOrg(e.target.value)}
              maxLength={300} placeholder="e.g. Melbourne Paediatrics"
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
              style={{ backgroundColor: "var(--input)", color: "var(--foreground)" }} />
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        <label className="text-sm font-medium" style={{ color: "var(--foreground)" }}>Referral Reason *</label>
        <textarea disabled={!canManage} value={referralReason} onChange={(e) => setReferralReason(e.target.value)}
          rows={4} maxLength={2000} placeholder="Describe why this referral is needed..."
          className="w-full rounded-lg border border-border px-3 py-2 text-sm"
          style={{ backgroundColor: "var(--input)", color: "var(--foreground)" }} />
        <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>{referralReason.length}/2000</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium" style={{ color: "var(--foreground)" }}>Follow-up Date</label>
          <input disabled={!canManage} type="date" value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm"
            style={{ backgroundColor: "var(--input)", color: "var(--foreground)" }} />
        </div>
        {referral && (
          <div className="space-y-1.5">
            <label className="text-sm font-medium" style={{ color: "var(--foreground)" }}>Current Status</label>
            <div className="flex items-center gap-2 pt-2">
              <ReferralStatusBadge status={status} />
            </div>
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium" style={{ color: "var(--foreground)" }}>Notes</label>
        <textarea disabled={!canManage} value={notes} onChange={(e) => setNotes(e.target.value)}
          rows={3} maxLength={5000} placeholder="Additional notes..."
          className="w-full rounded-lg border border-border px-3 py-2 text-sm"
          style={{ backgroundColor: "var(--input)", color: "var(--foreground)" }} />
        <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>{notes.length}/5000</p>
      </div>

      {referral && canManage && validNextStatuses.length > 0 && (
        <div className="rounded-lg border border-border p-4 space-y-3" style={{ backgroundColor: "var(--card)" }}>
          <p className="text-sm font-medium" style={{ color: "var(--foreground)" }}>Update Status</p>
          <div className="space-y-1.5">
            <label className="text-xs" style={{ color: "var(--muted-foreground)" }}>Outcome notes (optional)</label>
            <textarea value={outcomeNotes} onChange={(e) => setOutcomeNotes(e.target.value)} rows={2} maxLength={3000}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
              style={{ backgroundColor: "var(--input)", color: "var(--foreground)" }} />
          </div>
          <div className="flex flex-wrap gap-2">
            {validNextStatuses.map((s) => (
              <button key={s} type="button" onClick={() => handleStatusChange(s)} disabled={isPending}
                className="active-push touch-target rounded-lg px-3 py-1.5 text-xs font-medium transition-opacity disabled:opacity-50"
                style={{ backgroundColor: `var(--referral-${s.replace("_","-")})`, color: `var(--referral-${s.replace("_","-")}-fg, #fff)` }}>
                → {STATUSES.find((x) => x.value === s)?.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {referral && canManage && (
        <div className="space-y-1.5">
          <label className="text-sm font-medium" style={{ color: "var(--foreground)" }}>Outcome Notes</label>
          <textarea disabled={!canManage} value={outcomeNotes} onChange={(e) => setOutcomeNotes(e.target.value)}
            rows={3} maxLength={3000} placeholder="Final outcome summary..."
            className="w-full rounded-lg border border-border px-3 py-2 text-sm"
            style={{ backgroundColor: "var(--input)", color: "var(--foreground)" }} />
        </div>
      )}

      {canManage && (
        <div className="flex items-center gap-3">
          <button type="submit" disabled={isPending}
            className="active-push touch-target rounded-lg px-4 py-2 text-sm font-medium transition-opacity disabled:opacity-50"
            style={{ backgroundColor: "var(--primary)", color: "var(--primary-foreground)" }}>
            {isPending ? "Saving..." : referral ? "Update Referral" : "Create Referral"}
          </button>
          {referral && (showDeleteConfirm ? (
            <>
              <button type="button" onClick={handleDelete} disabled={isPending}
                className="active-push touch-target rounded-lg px-3 py-2 text-sm font-medium transition-opacity disabled:opacity-50"
                style={{ backgroundColor: "var(--destructive)", color: "var(--destructive-foreground)" }}>
                Confirm Delete
              </button>
              <button type="button" onClick={() => setShowDeleteConfirm(false)} disabled={isPending}
                className="rounded-lg px-3 py-2 text-sm" style={{ color: "var(--muted-foreground)" }}>
                Cancel
              </button>
            </>
          ) : (
            <button type="button" onClick={() => { setShowDeleteConfirm(true); haptics.warning(); }}
              style={{ color: "var(--destructive)" }} className="text-sm font-medium">
              Delete
            </button>
          ))}
        </div>
      )}
    </form>
  );
}
