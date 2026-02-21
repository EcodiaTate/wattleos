// src/components/domain/sis/CustodyRestrictionSection.tsx
"use client";

import type { CreateCustodyRestrictionInput, UpdateCustodyRestrictionInput } from "@/lib/actions/custody";
import { createCustodyRestriction, deleteCustodyRestriction, updateCustodyRestriction } from "@/lib/actions/custody";
import { RESTRICTION_TYPES } from "@/lib/constants";
import type { CustodyRestriction, RestrictionType } from "@/types/domain";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

interface CustodyRestrictionSectionProps {
  studentId: string;
  restrictions: CustodyRestriction[];
  canManage: boolean;
}

const ALERT_INPUT = "mt-1 block w-full rounded-lg border border-destructive/20 bg-background px-3 h-[var(--density-input-height)] text-sm font-medium focus:border-destructive focus:ring-1 focus:ring-destructive outline-none transition-all";

export function CustodyRestrictionSection({ studentId, restrictions, canManage }: CustodyRestrictionSectionProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [restrictedPersonName, setRestrictedPersonName] = useState("");
  const [restrictionType, setRestrictionType] = useState<RestrictionType>("no_contact");
  const [courtOrderReference, setCourtOrderReference] = useState("");
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().split("T")[0]);
  const [expiryDate, setExpiryDate] = useState("");
  const [notes, setNotes] = useState("");

  const resetForm = () => {
    setRestrictedPersonName(""); setRestrictionType("no_contact"); setCourtOrderReference("");
    setEffectiveDate(new Date().toISOString().split("T")[0]); setExpiryDate(""); setNotes(""); setError(null);
  };

  const closeForm = () => { setShowAddForm(false); setEditingId(null); resetForm(); };

  async function handleAdd() {
    if (!restrictedPersonName.trim() || !restrictionType || !effectiveDate) {
      setError("Restricted person, restriction type, and effective date are required.");
      return;
    }
    const result = await createCustodyRestriction({
      student_id: studentId, restricted_person_name: restrictedPersonName.trim(),
      restriction_type: restrictionType, court_order_reference: courtOrderReference.trim() || null,
      effective_date: effectiveDate, expiry_date: expiryDate || null, notes: notes.trim() || null,
    });
    if (result.error) { setError(result.error.message); return; }
    closeForm(); startTransition(() => router.refresh());
  }

  async function handleUpdate(id: string) {
    const result = await updateCustodyRestriction(id, {
      restricted_person_name: restrictedPersonName.trim(), restriction_type: restrictionType,
      court_order_reference: courtOrderReference.trim() || null, effective_date: effectiveDate,
      expiry_date: expiryDate || null, notes: notes.trim() || null,
    });
    if (result.error) { setError(result.error.message); return; }
    closeForm(); startTransition(() => router.refresh());
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`⚠️ SAFETY-CRITICAL: Remove custody restriction for "${name}"? This action is audit-logged.`)) return;
    const result = await deleteCustodyRestriction(id);
    if (result.error) { setError(result.error.message); return; }
    startTransition(() => router.refresh());
  }

  function renderForm(mode: "add" | "edit", restrictionId?: string) {
    return (
      <div className="space-y-4 rounded-xl border-2 border-destructive/20 bg-destructive/5 p-[var(--density-card-padding)] animate-scale-in">
        <div className="flex items-start gap-3 rounded-lg bg-destructive/10 p-3 text-xs font-bold text-destructive">
          <svg className="h-5 w-5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.168 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
          </svg>
          <span className="uppercase tracking-wide">Custody restrictions are safety-critical. Changes are audit-logged with your identity.</span>
        </div>

        <div className="grid grid-cols-1 gap-[var(--density-md)] sm:grid-cols-2">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-destructive">Restricted Person *</label>
            <input type="text" value={restrictedPersonName} onChange={(e) => setRestrictedPersonName(e.target.value)} className={ALERT_INPUT} />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-destructive">Type *</label>
            <select value={restrictionType} onChange={(e) => setRestrictionType(e.target.value as RestrictionType)} className={ALERT_INPUT}>
              {RESTRICTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-[var(--density-md)] sm:grid-cols-3">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-destructive">Effective Date *</label>
            <input type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} className={ALERT_INPUT} />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-destructive">Expiry Date</label>
            <input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} className={ALERT_INPUT} />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-destructive">Order Ref</label>
            <input type="text" value={courtOrderReference} onChange={(e) => setCourtOrderReference(e.target.value)} className={ALERT_INPUT} />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-destructive">Notes</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="mt-1 block w-full rounded-lg border border-destructive/20 bg-background p-3 text-sm font-medium focus:border-destructive focus:ring-1 focus:ring-destructive outline-none transition-all" />
        </div>

        <div className="flex gap-3">
          <button onClick={() => mode === "add" ? handleAdd() : handleUpdate(restrictionId!)} disabled={isPending} className="rounded-lg bg-destructive px-6 h-10 text-sm font-bold text-destructive-foreground shadow-sm hover:bg-destructive/90 active:scale-95 disabled:opacity-50">
            {isPending ? "..." : mode === "add" ? "Add Restriction" : "Save Changes"}
          </button>
          <button onClick={closeForm} className="rounded-lg border border-border bg-background px-6 h-10 text-sm font-bold text-muted-foreground hover:bg-muted active:scale-95">Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <section className={`rounded-xl border-2 bg-card shadow-sm lg:col-span-2 overflow-hidden transition-all ${restrictions.length > 0 ? "border-destructive/40" : "border-border"}`}>
      <div className={`flex items-center justify-between border-b px-6 py-4 ${restrictions.length > 0 ? "bg-destructive/10 border-destructive/20" : "bg-muted/30 border-border"}`}>
        <h2 className={`text-lg font-bold ${restrictions.length > 0 ? "text-destructive" : "text-foreground"}`}>
          Custody Restrictions
        </h2>
        {canManage && !showAddForm && !editingId && (
          <button onClick={() => { setEditingId(null); resetForm(); setShowAddForm(true); }} className="text-sm font-bold text-destructive hover:underline">+ Add Record</button>
        )}
      </div>
      <div className="p-6">
        {restrictions.length === 0 && !showAddForm ? (
          <p className="text-sm font-medium text-muted-foreground italic">No custody restrictions currently on file for this student.</p>
        ) : (
          <div className="space-y-4">
            {restrictions.map(r => (
              editingId === r.id ? <div key={r.id}>{renderForm("edit", r.id)}</div> : (
                <div key={r.id} className="rounded-xl border border-destructive/20 bg-destructive/5 p-5 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <p className="text-base font-bold text-destructive">{r.restricted_person_name}</p>
                        <span className="status-badge bg-destructive text-destructive-foreground font-bold uppercase text-[10px] status-badge-plain">
                          {r.restriction_type.replace(/_/g, " ")}
                        </span>
                      </div>
                      <div className="grid gap-1 text-xs font-bold text-destructive/80">
                        {r.court_order_reference && <p>ORDER: {r.court_order_reference}</p>}
                        <p>EFFECTIVE: {r.effective_date}{r.expiry_date && ` - EXPIRES: ${r.expiry_date}`}</p>
                        {r.notes && <p className="mt-2 bg-background/50 p-2 rounded border border-destructive/10 italic font-medium">&ldquo;{r.notes}&rdquo;</p>}
                      </div>
                    </div>
                    {canManage && (
                      <div className="flex gap-2">
                        <button onClick={() => { setShowAddForm(false); setEditingId(r.id); setRestrictedPersonName(r.restricted_person_name); setRestrictionType(r.restriction_type); setCourtOrderReference(r.court_order_reference ?? ""); setEffectiveDate(r.effective_date); setExpiryDate(r.expiry_date ?? ""); setNotes(r.notes ?? ""); setError(null); }} className="rounded-full p-2 text-destructive hover:bg-destructive/10 transition-all"><svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                        <button onClick={() => handleDelete(r.id, r.restricted_person_name)} className="rounded-full p-2 text-destructive hover:bg-destructive/10 transition-all"><svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                      </div>
                    )}
                  </div>
                </div>
              )
            ))}
          </div>
        )}
        {showAddForm && <div className="mt-4">{renderForm("add")}</div>}
      </div>
    </section>
  );
}