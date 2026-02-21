// src/components/domain/sis/EmergencyContactSection.tsx
"use client";

import type { CreateEmergencyContactInput, UpdateEmergencyContactInput } from "@/lib/actions/emergency-contacts";
import { createEmergencyContact, deleteEmergencyContact, updateEmergencyContact } from "@/lib/actions/emergency-contacts";
import type { EmergencyContact } from "@/types/domain";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

interface EmergencyContactSectionProps {
  studentId: string;
  contacts: EmergencyContact[];
  canManage: boolean;
}

const EMERGENCY_INPUT = "mt-1.5 block w-full rounded-lg border border-input bg-card px-4 h-[var(--density-input-height)] text-sm font-medium focus:border-primary focus:ring-1 focus:ring-primary outline-none shadow-sm transition-all";

export function EmergencyContactSection({ studentId, contacts, canManage }: EmergencyContactSectionProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(""); const [relationship, setRelationship] = useState("");
  const [phonePrimary, setPhonePrimary] = useState(""); const [phoneSecondary, setPhoneSecondary] = useState("");
  const [email, setEmail] = useState(""); const [priorityOrder, setPriorityOrder] = useState(contacts.length + 1);
  const [notes, setNotes] = useState("");

  const resetForm = () => { setName(""); setRelationship(""); setPhonePrimary(""); setPhoneSecondary(""); setEmail(""); setPriorityOrder(contacts.length + 1); setNotes(""); setError(null); };
  const closeForm = () => { setShowAddForm(false); setEditingId(null); resetForm(); };

  async function handleAdd() {
    if (!name.trim() || !relationship.trim() || !phonePrimary.trim()) { setError("Name, relationship, and primary phone are required."); return; }
    const result = await createEmergencyContact({ student_id: studentId, name: name.trim(), relationship: relationship.trim(), phone_primary: phonePrimary.trim(), phone_secondary: phoneSecondary.trim() || null, email: email.trim() || null, priority_order: priorityOrder, notes: notes.trim() || null });
    if (result.error) { setError(result.error.message); return; }
    closeForm(); startTransition(() => router.refresh());
  }

  async function handleUpdate(id: string) {
    const result = await updateEmergencyContact(id, { name: name.trim(), relationship: relationship.trim(), phone_primary: phonePrimary.trim(), phone_secondary: phoneSecondary.trim() || null, email: email.trim() || null, priority_order: priorityOrder, notes: notes.trim() || null });
    if (result.error) { setError(result.error.message); return; }
    closeForm(); startTransition(() => router.refresh());
  }

  function renderForm(mode: "add" | "edit", contactId?: string) {
    return (
      <div className="space-y-5 rounded-xl border border-primary-200 bg-primary-50/30 p-[var(--density-card-padding)] animate-scale-in">
        {error && <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-xs font-bold text-destructive">{error}</div>}
        <div className="grid grid-cols-1 gap-[var(--density-md)] sm:grid-cols-3">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-form-label-fg">Full Name *</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Smith" className={EMERGENCY_INPUT} />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-form-label-fg">Relationship *</label>
            <input type="text" value={relationship} onChange={(e) => setRelationship(e.target.value)} placeholder="e.g. Neighbor" className={EMERGENCY_INPUT} />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-form-label-fg">Priority (1=First)</label>
            <input type="number" min={1} max={10} value={priorityOrder} onChange={(e) => setPriorityOrder(Number(e.target.value))} className={EMERGENCY_INPUT} />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-[var(--density-md)] sm:grid-cols-3">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-form-label-fg">Primary Phone *</label>
            <input type="tel" value={phonePrimary} onChange={(e) => setPhonePrimary(e.target.value)} className={EMERGENCY_INPUT} />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-form-label-fg">Secondary Phone</label>
            <input type="tel" value={phoneSecondary} onChange={(e) => setPhoneSecondary(e.target.value)} className={EMERGENCY_INPUT} />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-form-label-fg">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={EMERGENCY_INPUT} />
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-form-label-fg">Notes</label>
          <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} className={EMERGENCY_INPUT} />
        </div>
        <div className="flex gap-3">
          <button onClick={() => mode === "add" ? handleAdd() : handleUpdate(contactId!)} disabled={isPending} className="rounded-lg bg-primary px-6 h-10 text-sm font-bold text-primary-foreground shadow-md hover:bg-primary-600 active:scale-95 disabled:opacity-50">
            {isPending ? "..." : mode === "add" ? "Add Contact" : "Save Changes"}
          </button>
          <button onClick={closeForm} className="rounded-lg border border-border bg-background px-6 h-10 text-sm font-bold text-muted-foreground hover:bg-muted active:scale-95">Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <section className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="flex items-center justify-between border-b border-border bg-muted/20 px-6 py-4">
        <h2 className="text-lg font-bold text-foreground">Emergency Contacts</h2>
        {canManage && !showAddForm && !editingId && (
          <button onClick={() => { setEditingId(null); resetForm(); setPriorityOrder(contacts.length + 1); setShowAddForm(true); }} className="text-sm font-bold text-primary hover:underline">+ Add Contact</button>
        )}
      </div>
      <div className="p-6">
        {contacts.length === 0 && !showAddForm ? (
          <p className="text-sm font-medium text-muted-foreground italic">No emergency contacts recorded.</p>
        ) : (
          <div className="space-y-4">
            {contacts.map(c => (
              editingId === c.id ? <div key={c.id}>{renderForm("edit", c.id)}</div> : (
                <div key={c.id} className="flex items-center justify-between rounded-xl border border-border/60 bg-background p-4 transition-all hover:border-primary-200 shadow-sm">
                  <div className="flex items-center gap-5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary tabular-nums">
                      {c.priority_order}
                    </span>
                    <div>
                      <p className="text-base font-bold text-foreground">{c.name}</p>
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-tight">
                        {c.relationship} • {c.phone_primary}{c.phone_secondary && ` / ${c.phone_secondary}`}{c.email && ` • ${c.email}`}
                      </p>
                      {c.notes && <p className="mt-1 text-xs font-medium italic text-primary-700/80">Note: {c.notes}</p>}
                    </div>
                  </div>
                  {canManage && (
                    <div className="flex gap-1">
                      <button onClick={() => { setShowAddForm(false); setEditingId(c.id); setName(c.name); setRelationship(c.relationship); setPhonePrimary(c.phone_primary); setPhoneSecondary(c.phone_secondary ?? ""); setEmail(c.email ?? ""); setPriorityOrder(c.priority_order); setNotes(c.notes ?? ""); setError(null); }} className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-all"><svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                      <button onClick={async () => { if(confirm(`Delete "${c.name}"?`)) { const r = await deleteEmergencyContact(c.id); if(r.error) setError(r.error.message); else startTransition(() => router.refresh()); } }} className="rounded-full p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all"><svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                    </div>
                  )}
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