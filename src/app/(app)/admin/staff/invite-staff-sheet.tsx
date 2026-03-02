// src/app/(app)/admin/staff/invite-staff-sheet.tsx
//
// ============================================================
// WattleOS V2 - Invite Staff Sheet
// ============================================================
// Client component. Slide-over sheet for inviting a new staff
// member by email. Requires email + role selection. First/last
// name optional (they set it on first sign-in).
// ============================================================

"use client";

import { useRef, useState, useTransition } from "react";
import { inviteStaffMember } from "@/lib/actions/staff-actions";
import type { RoleWithCounts } from "@/types/domain";

interface InviteStaffSheetProps {
  roles: RoleWithCounts[];
  onSuccess: () => void;
  onClose: () => void;
}

export function InviteStaffSheet({
  roles,
  onSuccess,
  onClose,
}: InviteStaffSheetProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Filter out Parent role - staff shouldn't be invited as Parent
  const staffRoles = roles.filter((r) => r.name.toLowerCase() !== "parent");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);

    const email = (fd.get("email") as string).trim();
    const firstName = (fd.get("first_name") as string).trim() || undefined;
    const lastName = (fd.get("last_name") as string).trim() || undefined;
    const roleId = fd.get("role_id") as string;

    if (!email || !roleId) {
      setError("Email and role are required.");
      return;
    }

    startTransition(async () => {
      const result = await inviteStaffMember({
        email,
        firstName,
        lastName,
        roleId,
      });

      if (result.error) {
        setError(result.error?.message ?? null);
      } else {
        formRef.current?.reset();
        onSuccess();
      }
    });
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40"
        onClick={onClose}
        aria-hidden
      />

      {/* Sheet */}
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-background shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-foreground">
              Invite Staff Member
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              They&apos;ll receive an email with a sign-in link.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form
          ref={formRef}
          onSubmit={handleSubmit}
          className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 py-6"
        >
          {/* Email */}
          <div className="space-y-1">
            <label
              htmlFor="invite-email"
              className="text-sm font-medium text-foreground"
            >
              Email address <span className="text-destructive">*</span>
            </label>
            <input
              id="invite-email"
              name="email"
              type="email"
              required
              autoComplete="off"
              placeholder="guide@yourschool.edu.au"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {/* Name (optional) */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label
                htmlFor="invite-first"
                className="text-sm font-medium text-foreground"
              >
                First name
              </label>
              <input
                id="invite-first"
                name="first_name"
                type="text"
                placeholder="Optional"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div className="space-y-1">
              <label
                htmlFor="invite-last"
                className="text-sm font-medium text-foreground"
              >
                Last name
              </label>
              <input
                id="invite-last"
                name="last_name"
                type="text"
                placeholder="Optional"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>

          {/* Role */}
          <div className="space-y-1">
            <label
              htmlFor="invite-role"
              className="text-sm font-medium text-foreground"
            >
              Role <span className="text-destructive">*</span>
            </label>
            <select
              id="invite-role"
              name="role_id"
              required
              defaultValue=""
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="" disabled>
                Select a role…
              </option>
              {staffRoles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                  {r.is_system ? "" : " (custom)"}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              Sets their initial access level. You can change this later.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="mt-auto flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {isPending ? "Sending…" : "Send Invitation"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
