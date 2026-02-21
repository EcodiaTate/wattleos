// src/components/domain/sis/MedicalConditionSection.tsx
"use client";

import type { CreateMedicalConditionInput, UpdateMedicalConditionInput } from "@/lib/actions/medical";
import { createMedicalCondition, deleteMedicalCondition, updateMedicalCondition } from "@/lib/actions/medical";
import { MEDICAL_CONDITION_TYPES, MEDICAL_SEVERITIES } from "@/lib/constants";
import type { MedicalCondition, MedicalSeverity } from "@/types/domain";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

function getSeverityStyle(severity: MedicalSeverity) {
  const varMap: Record<MedicalSeverity, string> = {
    life_threatening: "var(--medical-life-threatening)",
    severe: "var(--medical-severe)",
    moderate: "var(--medical-moderate)",
    mild: "var(--medical-mild)",
  };
  const color = varMap[severity];
  return { backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)`, color: color, borderColor: `color-mix(in srgb, ${color} 30%, transparent)` };
}

interface MedicalConditionSectionProps { studentId: string; conditions: MedicalCondition[]; canManage: boolean; }

const MED_INPUT = "mt-1.5 block w-full rounded-lg border border-input bg-card px-4 h-[var(--density-input-height)] text-sm font-medium placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none shadow-sm transition-all";

export function MedicalConditionSection({ studentId, conditions, canManage }: MedicalConditionSectionProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [conditionType, setConditionType] = useState(""); const [conditionName, setConditionName] = useState("");
  const [severity, setSeverity] = useState<MedicalSeverity>("mild"); const [description, setDescription] = useState("");
  const [actionPlan, setActionPlan] = useState(""); const [requiresMedication, setRequiresMedication] = useState(false);
  const [medicationName, setMedicationName] = useState(""); const [medicationLocation, setMedicationLocation] = useState("");
  const [expiryDate, setExpiryDate] = useState("");

  const resetForm = () => { setConditionType(""); setConditionName(""); setSeverity("mild"); setDescription(""); setActionPlan(""); setRequiresMedication(false); setMedicationName(""); setMedicationLocation(""); setExpiryDate(""); setError(null); };
  const closeForm = () => { setShowAddForm(false); setEditingId(null); resetForm(); };

  async function handleAdd() {
    if (!conditionType || !conditionName.trim()) { setError("Type and name are required."); return; }
    const r = await createMedicalCondition({ student_id: studentId, condition_type: conditionType, condition_name: conditionName.trim(), severity, description: description.trim() || null, action_plan: actionPlan.trim() || null, requires_medication: requiresMedication, medication_name: requiresMedication ? medicationName.trim() || null : null, medication_location: requiresMedication ? medicationLocation.trim() || null : null, expiry_date: expiryDate || null });
    if (r.error) { setError(r.error.message); return; }
    closeForm(); startTransition(() => router.refresh());
  }

  async function handleUpdate(id: string) {
    const r = await updateMedicalCondition(id, { condition_type: conditionType, condition_name: conditionName.trim(), severity, description: description.trim() || null, action_plan: actionPlan.trim() || null, requires_medication: requiresMedication, medication_name: requiresMedication ? medicationName.trim() || null : null, medication_location: requiresMedication ? medicationLocation.trim() || null : null, expiry_date: expiryDate || null });
    if (r.error) { setError(r.error.message); return; }
    closeForm(); startTransition(() => router.refresh());
  }

  function renderForm(mode: "add" | "edit", conditionId?: string) {
    return (
      <div className="space-y-5 rounded-xl border border-primary-200 bg-primary-50/20 p-[var(--density-card-padding)] animate-scale-in">
        {error && <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-2.5 text-xs font-bold text-destructive">{error}</div>}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div><label className="block text-xs font-bold uppercase tracking-wider text-form-label-fg">Type *</label><select value={conditionType} onChange={(e) => setConditionType(e.target.value)} className={MED_INPUT}><option value="">Select...</option>{MEDICAL_CONDITION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select></div>
          <div><label className="block text-xs font-bold uppercase tracking-wider text-form-label-fg">Condition Name *</label><input type="text" value={conditionName} onChange={(e) => setConditionName(e.target.value)} className={MED_INPUT} /></div>
          <div><label className="block text-xs font-bold uppercase tracking-wider text-form-label-fg">Severity *</label><select value={severity} onChange={(e) => setSeverity(e.target.value as MedicalSeverity)} className={MED_INPUT}>{MEDICAL_SEVERITIES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}</select></div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div><label className="block text-xs font-bold uppercase tracking-wider text-form-label-fg">Description</label><textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="mt-1.5 block w-full rounded-lg border border-input bg-card p-3 text-sm font-medium focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" /></div>
          <div><label className="block text-xs font-bold uppercase tracking-wider text-form-label-fg">Action Plan</label><textarea value={actionPlan} onChange={(e) => setActionPlan(e.target.value)} rows={2} className="mt-1.5 block w-full rounded-lg border border-input bg-card p-3 text-sm font-medium focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" /></div>
        </div>
        <div className="space-y-4 bg-card/40 p-4 rounded-xl border border-border/50">
          <label className="flex items-center gap-2.5 text-xs font-bold text-foreground cursor-pointer group"><input type="checkbox" checked={requiresMedication} onChange={(e) => setRequiresMedication(e.target.checked)} className="h-4 w-4 rounded border-input text-primary focus:ring-primary" /><span className="group-hover:text-primary transition-colors">Requires medication to be kept on-site</span></label>
          {requiresMedication && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 animate-slide-down">
              <div><label className="block text-[10px] font-bold uppercase text-muted-foreground">Medication Name</label><input type="text" value={medicationName} onChange={(e) => setMedicationName(e.target.value)} className={MED_INPUT} /></div>
              <div><label className="block text-[10px] font-bold uppercase text-muted-foreground">Medication Location</label><input type="text" value={medicationLocation} onChange={(e) => setMedicationLocation(e.target.value)} className={MED_INPUT} /></div>
            </div>
          )}
        </div>
        <div className="max-w-xs"><label className="block text-xs font-bold uppercase tracking-wider text-form-label-fg">Next Review Date</label><input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} className={MED_INPUT} /></div>
        <div className="flex gap-3">
          <button onClick={() => mode === "add" ? handleAdd() : handleUpdate(conditionId!)} disabled={isPending} className="rounded-lg bg-primary px-6 h-10 text-sm font-bold text-primary-foreground shadow-md hover:bg-primary-600 active:scale-95 disabled:opacity-50">{isPending ? "..." : mode === "add" ? "Add Condition" : "Save Changes"}</button>
          <button onClick={closeForm} className="rounded-lg border border-border bg-background px-6 h-10 text-sm font-bold text-muted-foreground hover:bg-muted active:scale-95">Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <section className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="flex items-center justify-between border-b border-border bg-muted/20 px-6 py-4">
        <h2 className="text-lg font-bold text-foreground">Medical Conditions</h2>
        {canManage && !showAddForm && !editingId && (
          <button onClick={() => { setEditingId(null); resetForm(); setShowAddForm(true); }} className="text-sm font-bold text-primary hover:underline">+ Add Record</button>
        )}
      </div>
      <div className="p-6">
        {conditions.length === 0 && !showAddForm ? (
          <p className="text-sm font-medium text-muted-foreground italic">No medical records on file.</p>
        ) : (
          <div className="space-y-4">
            {conditions.map(c => (
              editingId === c.id ? <div key={c.id}>{renderForm("edit", c.id)}</div> : (
                <div key={c.id} className="rounded-xl border border-border/60 bg-background p-5 shadow-sm hover:border-primary-100 transition-all">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <p className="text-base font-bold text-foreground">{c.condition_name}</p>
                        <span className="status-badge font-black uppercase text-[9px] px-2 py-0 border status-badge-plain" style={getSeverityStyle(c.severity)}>{c.severity.replace("_", " ")}</span>
                        <span className="status-badge bg-muted text-muted-foreground font-bold uppercase text-[9px] px-2 py-0 status-badge-plain">{c.condition_type}</span>
                      </div>
                      {c.description && <p className="text-xs font-medium text-muted-foreground mb-2">{c.description}</p>}
                      {c.action_plan && (
                        <div className="bg-muted/30 p-3 rounded-lg border border-border/50 text-xs">
                          <span className="font-bold text-foreground uppercase tracking-wider block mb-1 text-[10px]">Staff Action Plan:</span>
                          <p className="font-medium text-muted-foreground">{c.action_plan}</p>
                        </div>
                      )}
                      {c.requires_medication && c.medication_name && (
                        <div className="mt-3 flex items-center gap-2 text-xs font-bold text-info">
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a2 2 0 00-1.96 1.414l-.727 2.903a2 2 0 01-3.566 0l-.727-2.903a2 2 0 00-1.96-1.414l-2.387.477a2 2 0 00-1.022.547l2.387 2.387a2 2 0 001.022.547l2.387.477a2 2 0 001.96-1.414l.727-2.903a2 2 0 013.566 0l.727 2.903a2 2 0 001.96 1.414l2.387-.477a2 2 0 001.022-.547l-2.387-2.387z" /></svg>
                          <span>Medication: {c.medication_name}{c.medication_location && ` - Location: ${c.medication_location}`}</span>
                        </div>
                      )}
                    </div>
                    {canManage && (
                      <div className="flex gap-1 pl-4 border-l border-border ml-4">
                        <button onClick={() => { setShowAddForm(false); setEditingId(c.id); setConditionType(c.condition_type); setConditionName(c.condition_name); setSeverity(c.severity); setDescription(c.description ?? ""); setActionPlan(c.action_plan ?? ""); setRequiresMedication(c.requires_medication); setMedicationName(c.medication_name ?? ""); setMedicationLocation(c.medication_location ?? ""); setExpiryDate(c.expiry_date ?? ""); setError(null); }} className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-all"><svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                        <button onClick={async () => { if(confirm(`Delete "${c.condition_name}"?`)) { const r = await deleteMedicalCondition(c.id); if(r.error) setError(r.error.message); else startTransition(() => router.refresh()); } }} className="rounded-full p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all"><svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                      </div>
                    )}
                  </div>
                </div>
              )
            ))}
          </div>
        )}
        {showAddForm && renderForm("add")}
      </div>
    </section>
  );
}