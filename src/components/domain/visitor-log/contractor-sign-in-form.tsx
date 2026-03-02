"use client";

// src/components/domain/visitor-log/contractor-sign-in-form.tsx
//
// ============================================================
// WattleOS V2 - Contractor Sign-In Form
// ============================================================
// Records a contractor arrival with licence, insurance, and
// WWCC verification fields.
// ============================================================

import { useState, useTransition } from "react";
import { createContractorRecord } from "@/lib/actions/visitor-log";
import { useHaptics } from "@/lib/hooks/use-haptics";
import type { ContractorSignInRecord } from "@/types/domain";

interface ContractorSignInFormProps {
  onSuccess: (record: ContractorSignInRecord) => void;
  onCancel: () => void;
}

export function ContractorSignInForm({
  onSuccess,
  onCancel,
}: ContractorSignInFormProps) {
  const haptics = useHaptics();
  const [isPending, startTransition] = useTransition();

  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [trade, setTrade] = useState("");
  const [licenceNumber, setLicenceNumber] = useState("");
  const [insuranceNumber, setInsuranceNumber] = useState("");
  const [insuranceExpiry, setInsuranceExpiry] = useState("");
  const [inductionConfirmed, setInductionConfirmed] = useState(false);
  const [wwccNumber, setWwccNumber] = useState("");
  const [wwccVerified, setWwccVerified] = useState(false);
  const [workLocation, setWorkLocation] = useState("");
  const [workDescription, setWorkDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  const fieldClass =
    "w-full rounded-[var(--radius-md)] border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) {
      setError("Company name is required.");
      return;
    }
    if (!contactName.trim()) {
      setError("Contact name is required.");
      return;
    }
    if (!workLocation.trim()) {
      setError("Work location is required.");
      return;
    }
    setError("");
    haptics.impact("medium");

    startTransition(async () => {
      const result = await createContractorRecord({
        company_name: companyName.trim(),
        contact_name: contactName.trim(),
        trade: trade.trim() || null,
        licence_number: licenceNumber.trim() || null,
        insurance_number: insuranceNumber.trim() || null,
        insurance_expiry: insuranceExpiry || null,
        induction_confirmed: inductionConfirmed,
        wwcc_number: wwccNumber.trim() || null,
        wwcc_verified: wwccVerified,
        work_location: workLocation.trim(),
        work_description: workDescription.trim() || null,
        signed_in_at: new Date().toISOString(),
        notes: notes.trim() || null,
      });

      if (result.error) {
        setError(result.error.message);
        return;
      }

      onSuccess(result.data!);
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Company / Contact */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Company <span className="text-destructive">*</span>
          </label>
          <input
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="Acme Electrical Pty Ltd"
            className={fieldClass}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Contact person <span className="text-destructive">*</span>
          </label>
          <input
            type="text"
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            placeholder="John Smith"
            className={fieldClass}
          />
        </div>
      </div>

      {/* Trade */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">
          Trade / service type{" "}
          <span className="text-xs text-muted-foreground">(optional)</span>
        </label>
        <input
          type="text"
          value={trade}
          onChange={(e) => setTrade(e.target.value)}
          placeholder="e.g. Electrician, Plumber, IT support"
          className={fieldClass}
        />
      </div>

      {/* Work location */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">
          Work location <span className="text-destructive">*</span>
        </label>
        <input
          type="text"
          value={workLocation}
          onChange={(e) => setWorkLocation(e.target.value)}
          placeholder="e.g. Roof, Room 3, Server room"
          className={fieldClass}
        />
      </div>

      {/* Work description */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">
          Work description{" "}
          <span className="text-xs text-muted-foreground">(optional)</span>
        </label>
        <input
          type="text"
          value={workDescription}
          onChange={(e) => setWorkDescription(e.target.value)}
          placeholder="e.g. Annual fire alarm testing"
          className={fieldClass}
        />
      </div>

      {/* Licence & Insurance */}
      <fieldset className="space-y-3 rounded-[var(--radius-md)] border border-border p-3">
        <legend className="px-1 text-xs font-medium text-muted-foreground">
          Licence & Insurance
        </legend>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">
              Licence no.
            </label>
            <input
              type="text"
              value={licenceNumber}
              onChange={(e) => setLicenceNumber(e.target.value)}
              placeholder="L123456"
              className={fieldClass}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">
              Insurance no.
            </label>
            <input
              type="text"
              value={insuranceNumber}
              onChange={(e) => setInsuranceNumber(e.target.value)}
              placeholder="INS-9876"
              className={fieldClass}
            />
          </div>
        </div>
        <div className="w-1/2">
          <label className="block text-xs font-medium text-foreground mb-1">
            Insurance expiry
          </label>
          <input
            type="date"
            value={insuranceExpiry}
            onChange={(e) => setInsuranceExpiry(e.target.value)}
            className={fieldClass}
          />
        </div>
      </fieldset>

      {/* Induction & WWCC */}
      <fieldset className="space-y-3 rounded-[var(--radius-md)] border border-border p-3">
        <legend className="px-1 text-xs font-medium text-muted-foreground">
          Induction & WWCC
        </legend>
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={inductionConfirmed}
              onChange={(e) => setInductionConfirmed(e.target.checked)}
              className="h-4 w-4 rounded border-border accent-[var(--primary)]"
            />
            <span className="text-sm font-medium text-foreground">
              Site induction complete
            </span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={wwccVerified}
              onChange={(e) => setWwccVerified(e.target.checked)}
              className="h-4 w-4 rounded border-border accent-[var(--primary)]"
            />
            <span className="text-sm font-medium text-foreground">
              WWCC verified
            </span>
          </label>
        </div>
        <div className="w-1/2">
          <label className="block text-xs font-medium text-foreground mb-1">
            WWCC number
          </label>
          <input
            type="text"
            value={wwccNumber}
            onChange={(e) => setWwccNumber(e.target.value)}
            placeholder="WWC1234567E"
            className={fieldClass}
          />
        </div>
      </fieldset>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">
          Notes{" "}
          <span className="text-xs text-muted-foreground">(optional)</span>
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          maxLength={500}
          placeholder="Any additional notes"
          className="w-full resize-none rounded-[var(--radius-md)] border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {error && (
        <div className="rounded-[var(--radius-md)] border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={() => {
            haptics.impact("light");
            onCancel();
          }}
          className="touch-target rounded-[var(--radius-md)] border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="active-push touch-target rounded-[var(--radius-md)] bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity disabled:opacity-50"
        >
          {isPending ? "Signing in…" : "Sign In Contractor"}
        </button>
      </div>
    </form>
  );
}
