"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useHaptics } from "@/lib/hooks/use-haptics";
import { addCollaborator, updateCollaborator } from "@/lib/actions/ilp";
import type { IlpCollaborator, IlpCollaboratorRole } from "@/types/domain";
import { COLLABORATOR_ROLE_CONFIG } from "@/lib/constants/ilp";

const ROLE_OPTIONS = Object.entries(COLLABORATOR_ROLE_CONFIG).map(
  ([key, cfg]) => ({
    value: key as IlpCollaboratorRole,
    label: cfg.label,
  }),
);

interface CollaboratorFormProps {
  planId: string;
  collaborator?: IlpCollaborator;
  onComplete?: () => void;
}

export function CollaboratorForm({
  planId,
  collaborator,
  onComplete,
}: CollaboratorFormProps) {
  const router = useRouter();
  const haptics = useHaptics();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(collaborator?.collaborator_name ?? "");
  const [role, setRole] = useState<IlpCollaboratorRole>(
    collaborator?.collaborator_role ?? "lead_educator",
  );
  const [organisation, setOrganisation] = useState(
    collaborator?.organisation ?? "",
  );
  const [email, setEmail] = useState(collaborator?.email ?? "");
  const [phone, setPhone] = useState(collaborator?.phone ?? "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Please enter the collaborator's name");
      haptics.error();
      return;
    }

    const input = {
      plan_id: planId,
      collaborator_name: name.trim(),
      collaborator_role: role,
      organisation: organisation.trim() || null,
      email: email.trim() || null,
      phone: phone.trim() || null,
    };

    startTransition(async () => {
      const result = collaborator
        ? await updateCollaborator(collaborator.id, input)
        : await addCollaborator(input);

      if (result.error) {
        setError(result.error.message);
        haptics.error();
        return;
      }

      haptics.success();
      if (onComplete) {
        onComplete();
      } else {
        router.refresh();
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-[var(--radius-lg)] border border-border p-4 space-y-4"
      style={{ background: "var(--card)" }}
    >
      <h3
        className="text-sm font-semibold"
        style={{ color: "var(--foreground)" }}
      >
        {collaborator ? "Edit Collaborator" : "Add Collaborator"}
      </h3>

      {error && (
        <div
          className="rounded-[var(--radius-md)] border p-2 text-xs"
          style={{
            borderColor: "var(--destructive)",
            background: "color-mix(in srgb, var(--destructive) 8%, transparent)",
            color: "var(--destructive)",
          }}
        >
          {error}
        </div>
      )}

      {/* Name */}
      <div className="space-y-1">
        <label
          className="text-sm font-medium"
          style={{ color: "var(--foreground)" }}
        >
          Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Full name"
          required
          className="w-full rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
          style={{ background: "var(--input)", color: "var(--foreground)" }}
        />
      </div>

      {/* Role */}
      <div className="space-y-1">
        <label
          className="text-sm font-medium"
          style={{ color: "var(--foreground)" }}
        >
          Role
        </label>
        <select
          value={role}
          onChange={(e) => {
            haptics.selection();
            setRole(e.target.value as IlpCollaboratorRole);
          }}
          className="w-full rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
          style={{ background: "var(--input)", color: "var(--foreground)" }}
        >
          {ROLE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Organisation */}
      <div className="space-y-1">
        <label
          className="text-sm font-medium"
          style={{ color: "var(--foreground)" }}
        >
          Organisation
        </label>
        <input
          type="text"
          value={organisation}
          onChange={(e) => setOrganisation(e.target.value)}
          placeholder="e.g., Children's Speech Pathology Clinic"
          className="w-full rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
          style={{ background: "var(--input)", color: "var(--foreground)" }}
        />
      </div>

      {/* Contact */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label
            className="text-sm font-medium"
            style={{ color: "var(--foreground)" }}
          >
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@example.com"
            className="w-full rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
            style={{ background: "var(--input)", color: "var(--foreground)" }}
          />
        </div>
        <div className="space-y-1">
          <label
            className="text-sm font-medium"
            style={{ color: "var(--foreground)" }}
          >
            Phone
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="e.g., 0412 345 678"
            className="w-full rounded-[var(--radius-md)] border border-border px-3 py-2 text-sm"
            style={{ background: "var(--input)", color: "var(--foreground)" }}
          />
        </div>
      </div>

      {/* Buttons */}
      <div className="flex justify-end gap-2">
        {onComplete && (
          <button
            type="button"
            onClick={() => {
              haptics.light();
              onComplete();
            }}
            className="active-push touch-target rounded-[var(--radius-md)] border border-border px-4 py-2 text-sm font-medium"
            style={{
              background: "var(--card)",
              color: "var(--foreground)",
            }}
          >
            Cancel
          </button>
        )}
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
            : collaborator
              ? "Update"
              : "Add Collaborator"}
        </button>
      </div>
    </form>
  );
}
