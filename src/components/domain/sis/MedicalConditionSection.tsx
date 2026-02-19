// src/components/domain/sis/MedicalConditionSection.tsx
//
// ============================================================
// WattleOS V2 — Medical Condition Section (DESIGN SYSTEM MIGRATED)
// ============================================================
// MIGRATION CHANGES:
// • Severity badges: hardcoded red/orange/yellow/green
//   → CSS variables (--medical-life-threatening, --medical-severe,
//     --medical-moderate, --medical-mild) via inline styles.
//   WHY inline: medical severity is domain-specific and uses
//   color-mix() to derive bg/border from a single token.
//   These colors intentionally do NOT change with brand hue —
//   a life-threatening condition is always red regardless of school.
// • Card: border-gray-200 bg-white → border-border bg-card
// • Section header: text-gray-900 → text-foreground
// • Labels: text-gray-700 → text-foreground
// • Descriptions: text-gray-500/600 → text-muted-foreground
// • Inputs: border-gray-300 focus:amber → border-input focus:ring
// • Checkbox: text-amber-600 → text-primary
// • Primary btn: bg-amber-600 → bg-primary text-primary-foreground
// • Cancel btn: border-gray-300 text-gray-600 → border-border text-muted-foreground
// • Form bg: border-amber-200 bg-amber-50/50 → border-primary/30 bg-primary/5
// • Error: bg-red-50 text-red-700 → bg-destructive/10 text-destructive
// • Required: text-red-500 → text-destructive
// • Row: border-gray-100 → border-border/50
// • Type badge: bg-gray-100 text-gray-600 → bg-muted text-muted-foreground
// • Medication: text-blue-600 → text-info
// • Delete hover: hover:bg-red-50 → hover:bg-destructive/10
// • Spacing & typography → density & font-scale variables
// ============================================================

'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  createMedicalCondition,
  updateMedicalCondition,
  deleteMedicalCondition,
} from '@/lib/actions/medical';
import {
  MEDICAL_CONDITION_TYPES,
  MEDICAL_SEVERITIES,
} from '@/lib/constants';
import type { MedicalCondition, MedicalSeverity } from '@/types/domain';
import type {
  CreateMedicalConditionInput,
  UpdateMedicalConditionInput,
} from '@/lib/actions/medical';

// ── Severity style helper ─────────────────────────────────
// Returns inline styles using CSS variables from globals.css.
// color-mix() derives bg (12% opacity) and border (25% opacity)
// from a single domain token, keeping dark mode support automatic.

function getSeverityStyle(severity: MedicalSeverity): React.CSSProperties {
  const varMap: Record<MedicalSeverity, string> = {
    life_threatening: 'var(--medical-life-threatening)',
    severe: 'var(--medical-severe)',
    moderate: 'var(--medical-moderate)',
    mild: 'var(--medical-mild)',
  };
  const color = varMap[severity];
  return {
    backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)`,
    color: color,
    borderColor: `color-mix(in srgb, ${color} 25%, transparent)`,
  };
}

// ── Props ───────────────────────────────────────────────────

interface MedicalConditionSectionProps {
  studentId: string;
  conditions: MedicalCondition[];
  canManage: boolean;
}

// ── Component ───────────────────────────────────────────────

export function MedicalConditionSection({
  studentId,
  conditions,
  canManage,
}: MedicalConditionSectionProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ── Form state ──────────────────────────────────────────
  const [conditionType, setConditionType] = useState('');
  const [conditionName, setConditionName] = useState('');
  const [severity, setSeverity] = useState<MedicalSeverity>('mild');
  const [description, setDescription] = useState('');
  const [actionPlan, setActionPlan] = useState('');
  const [requiresMedication, setRequiresMedication] = useState(false);
  const [medicationName, setMedicationName] = useState('');
  const [medicationLocation, setMedicationLocation] = useState('');
  const [expiryDate, setExpiryDate] = useState('');

  function resetForm() {
    setConditionType('');
    setConditionName('');
    setSeverity('mild');
    setDescription('');
    setActionPlan('');
    setRequiresMedication(false);
    setMedicationName('');
    setMedicationLocation('');
    setExpiryDate('');
    setError(null);
  }

  function openAdd() {
    setEditingId(null);
    resetForm();
    setShowAddForm(true);
  }

  function openEdit(condition: MedicalCondition) {
    setShowAddForm(false);
    setEditingId(condition.id);
    setConditionType(condition.condition_type);
    setConditionName(condition.condition_name);
    setSeverity(condition.severity);
    setDescription(condition.description ?? '');
    setActionPlan(condition.action_plan ?? '');
    setRequiresMedication(condition.requires_medication);
    setMedicationName(condition.medication_name ?? '');
    setMedicationLocation(condition.medication_location ?? '');
    setExpiryDate(condition.expiry_date ?? '');
    setError(null);
  }

  function closeForm() {
    setShowAddForm(false);
    setEditingId(null);
    resetForm();
  }

  async function handleAdd() {
    if (!conditionType || !conditionName.trim()) {
      setError('Condition type and name are required.');
      return;
    }

    const input: CreateMedicalConditionInput = {
      student_id: studentId,
      condition_type: conditionType,
      condition_name: conditionName.trim(),
      severity,
      description: description.trim() || null,
      action_plan: actionPlan.trim() || null,
      requires_medication: requiresMedication,
      medication_name: requiresMedication ? medicationName.trim() || null : null,
      medication_location: requiresMedication ? medicationLocation.trim() || null : null,
      expiry_date: expiryDate || null,
    };

    const result = await createMedicalCondition(input);
    if (result.error) {
      setError(result.error.message);
      return;
    }

    closeForm();
    startTransition(() => router.refresh());
  }

  async function handleUpdate(conditionId: string) {
    const input: UpdateMedicalConditionInput = {
      condition_type: conditionType,
      condition_name: conditionName.trim(),
      severity,
      description: description.trim() || null,
      action_plan: actionPlan.trim() || null,
      requires_medication: requiresMedication,
      medication_name: requiresMedication ? medicationName.trim() || null : null,
      medication_location: requiresMedication ? medicationLocation.trim() || null : null,
      expiry_date: expiryDate || null,
    };

    const result = await updateMedicalCondition(conditionId, input);
    if (result.error) {
      setError(result.error.message);
      return;
    }

    closeForm();
    startTransition(() => router.refresh());
  }

  async function handleDelete(conditionId: string, conditionName: string) {
    if (!confirm(`Delete "${conditionName}"? This cannot be undone.`)) return;

    const result = await deleteMedicalCondition(conditionId);
    if (result.error) {
      setError(result.error.message);
      return;
    }

    startTransition(() => router.refresh());
  }

  // ── Inline form ─────────────────────────────────────────
  function renderForm(mode: 'add' | 'edit', conditionId?: string) {
    return (
      <div className="space-y-[var(--density-md)] rounded-md border border-primary/30 bg-primary/5 p-[var(--density-card-padding)]">
        {error && (
          <div className="rounded bg-destructive/10 p-2 text-[length:var(--text-xs)] text-destructive">{error}</div>
        )}

        <div className="grid grid-cols-1 gap-[var(--density-md)] sm:grid-cols-3">
          <div>
            <label className="block text-[length:var(--text-xs)] font-medium text-foreground">
              Type <span className="text-destructive">*</span>
            </label>
            <select
              value={conditionType}
              onChange={(e) => setConditionType(e.target.value)}
              className="mt-1 block w-full rounded border border-input bg-card px-3 py-2 text-[length:var(--text-sm)] text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">Select...</option>
              {MEDICAL_CONDITION_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[length:var(--text-xs)] font-medium text-foreground">
              Condition Name <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={conditionName}
              onChange={(e) => setConditionName(e.target.value)}
              placeholder="e.g. Peanut allergy"
              className="mt-1 block w-full rounded border border-input bg-card px-3 py-2 text-[length:var(--text-sm)] text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          <div>
            <label className="block text-[length:var(--text-xs)] font-medium text-foreground">
              Severity <span className="text-destructive">*</span>
            </label>
            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value as MedicalSeverity)}
              className="mt-1 block w-full rounded border border-input bg-card px-3 py-2 text-[length:var(--text-sm)] text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {MEDICAL_SEVERITIES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-[length:var(--text-xs)] font-medium text-foreground">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="Additional details about the condition..."
            className="mt-1 block w-full rounded border border-input bg-card px-3 py-2 text-[length:var(--text-sm)] text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        <div>
          <label className="block text-[length:var(--text-xs)] font-medium text-foreground">
            Action Plan
          </label>
          <textarea
            value={actionPlan}
            onChange={(e) => setActionPlan(e.target.value)}
            rows={2}
            placeholder="Steps to take if this condition presents..."
            className="mt-1 block w-full rounded border border-input bg-card px-3 py-2 text-[length:var(--text-sm)] text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        {/* Medication */}
        <div className="space-y-[var(--density-sm)]">
          <label className="flex items-center gap-2 text-[length:var(--text-sm)] text-foreground">
            <input
              type="checkbox"
              checked={requiresMedication}
              onChange={(e) => setRequiresMedication(e.target.checked)}
              className="h-4 w-4 rounded border-input text-primary focus:ring-ring"
            />
            Requires medication
          </label>

          {requiresMedication && (
            <div className="grid grid-cols-1 gap-[var(--density-md)] sm:grid-cols-2">
              <div>
                <label className="block text-[length:var(--text-xs)] font-medium text-foreground">
                  Medication Name
                </label>
                <input
                  type="text"
                  value={medicationName}
                  onChange={(e) => setMedicationName(e.target.value)}
                  placeholder="e.g. EpiPen, Ventolin"
                  className="mt-1 block w-full rounded border border-input bg-card px-3 py-2 text-[length:var(--text-sm)] text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-[length:var(--text-xs)] font-medium text-foreground">
                  Medication Location
                </label>
                <input
                  type="text"
                  value={medicationLocation}
                  onChange={(e) => setMedicationLocation(e.target.value)}
                  placeholder="e.g. Office first aid kit"
                  className="mt-1 block w-full rounded border border-input bg-card px-3 py-2 text-[length:var(--text-sm)] text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            </div>
          )}
        </div>

        <div className="w-48">
          <label className="block text-[length:var(--text-xs)] font-medium text-foreground">
            Review Date
          </label>
          <input
            type="date"
            value={expiryDate}
            onChange={(e) => setExpiryDate(e.target.value)}
            className="mt-1 block w-full rounded border border-input bg-card px-3 py-2 text-[length:var(--text-sm)] text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <p className="mt-1 text-[length:var(--text-xs)] text-muted-foreground">When this plan should be reviewed.</p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => mode === 'add' ? handleAdd() : handleUpdate(conditionId!)}
            disabled={isPending}
            className="rounded bg-primary px-3 py-1.5 text-[length:var(--text-sm)] font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {isPending ? 'Saving...' : mode === 'add' ? 'Add Condition' : 'Save Changes'}
          </button>
          <button
            onClick={closeForm}
            className="rounded border border-border px-3 py-1.5 text-[length:var(--text-sm)] font-medium text-muted-foreground hover:bg-muted"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <section className="rounded-lg border border-border bg-card shadow-[var(--shadow-xs)]">
      <div className="flex items-center justify-between border-b border-border px-[var(--density-card-padding)] py-[var(--density-card-padding)]">
        <h2 className="text-[length:var(--text-lg)] font-medium text-foreground">Medical Conditions</h2>
        {canManage && !showAddForm && !editingId && (
          <button
            onClick={openAdd}
            className="text-[length:var(--text-sm)] font-medium text-primary hover:text-primary/80"
          >
            + Add Condition
          </button>
        )}
      </div>
      <div className="p-[var(--density-card-padding)]">
        {conditions.length === 0 && !showAddForm ? (
          <p className="text-[length:var(--text-sm)] text-muted-foreground">No medical conditions recorded.</p>
        ) : (
          <div className="space-y-[var(--density-sm)]">
            {conditions.map((condition) => {
              if (editingId === condition.id) {
                return (
                  <div key={condition.id}>{renderForm('edit', condition.id)}</div>
                );
              }

              return (
                <div
                  key={condition.id}
                  className="rounded-md border border-border/50 p-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-[length:var(--text-sm)] font-medium text-foreground">
                          {condition.condition_name}
                        </p>
                        <span
                          className="inline-flex rounded-full border px-2 py-0.5 text-[length:var(--text-xs)] font-medium"
                          style={getSeverityStyle(condition.severity)}
                        >
                          {condition.severity.replace('_', ' ')}
                        </span>
                        <span className="rounded bg-muted px-1.5 py-0.5 text-[length:var(--text-xs)] text-muted-foreground">
                          {condition.condition_type}
                        </span>
                      </div>
                      {condition.description && (
                        <p className="mt-1 text-[length:var(--text-xs)] text-muted-foreground">{condition.description}</p>
                      )}
                      {condition.action_plan && (
                        <p className="mt-1 text-[length:var(--text-xs)] text-muted-foreground">
                          <span className="font-medium text-foreground">Action plan:</span> {condition.action_plan}
                        </p>
                      )}
                      {condition.requires_medication && condition.medication_name && (
                        <p
                          className="mt-1 text-[length:var(--text-xs)]"
                          style={{ color: 'var(--info)' }}
                        >
                          💊 {condition.medication_name}
                          {condition.medication_location && (
                            <span className="text-muted-foreground"> - {condition.medication_location}</span>
                          )}
                        </p>
                      )}
                    </div>
                    {canManage && (
                      <div className="flex gap-1">
                        <button
                          onClick={() => openEdit(condition)}
                          className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                          title="Edit"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(condition.id, condition.condition_name)}
                          className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          title="Delete"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {showAddForm && renderForm('add')}
      </div>
    </section>
  );
}