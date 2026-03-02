// src/app/(app)/admin/staff/[userId]/staff-profile-client.tsx
//
// ============================================================
// WattleOS V2 - Staff Profile (Interactive Tabs)
// ============================================================
// Client component. Tabbed UI covering:
//   Contact        - personal, phone, address, emergency contact
//   Employment     - type, position, dates, working rights, visa,
//                    qualifications, teacher registration
//   Role & Access  - change role, per-user permission overrides
//                    (grant/deny on top of role baseline)
//   Compliance     - WWCC, first aid, CPR, etc.
//   Account        - suspend, reactivate, remove
// ============================================================

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  updateStaffProfile,
  updateStaffRole,
  suspendStaffMember,
  reactivateStaffMember,
  removeStaffMember,
  setPermissionOverride,
  removePermissionOverride,
} from "@/lib/actions/staff-actions";
import { PermissionModules } from "@/lib/constants/permissions";
import type {
  EmploymentType,
  QualificationLevel,
  RoleWithCounts,
  StaffMemberDetail,
  WorkingRights,
} from "@/types/domain";

// ============================================================
// Shared
// ============================================================

type Tab = "contact" | "employment" | "role" | "compliance" | "danger";

function Field({
  label,
  name,
  defaultValue,
  full,
  type = "text",
  placeholder,
}: {
  label: string;
  name: string;
  defaultValue: string;
  full?: boolean;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div className={`space-y-1 ${full ? "sm:col-span-2" : ""}`}>
      <label className="text-sm font-medium text-foreground">{label}</label>
      <input
        type={type}
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
      />
    </div>
  );
}

function SelectField({
  label,
  name,
  defaultValue,
  options,
}: {
  label: string;
  name: string;
  defaultValue: string;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium text-foreground">{label}</label>
      <select
        name={name}
        defaultValue={defaultValue}
        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
      >
        <option value="">Not specified</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function FormFeedback({
  error,
  saved,
}: {
  error: string | null;
  saved: boolean;
}) {
  return (
    <>
      {error && (
        <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}
      {saved && (
        <div className="rounded-md bg-success/10 px-3 py-2 text-sm text-success">
          Saved.
        </div>
      )}
    </>
  );
}

// ============================================================
// Contact Tab
// ============================================================

function ContactTab({ member }: { member: StaffMemberDetail }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const p = member.profile;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    const fd = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await updateStaffProfile(member.user_id, {
        date_of_birth: (fd.get("date_of_birth") as string) || undefined,
        phone: (fd.get("phone") as string).trim() || undefined,
        address: (fd.get("address") as string).trim() || undefined,
        emergency_contact_name:
          (fd.get("emergency_contact_name") as string).trim() || undefined,
        emergency_contact_phone:
          (fd.get("emergency_contact_phone") as string).trim() || undefined,
        emergency_contact_relationship:
          (fd.get("emergency_contact_relationship") as string).trim() ||
          undefined,
      });

      if (result.error) setError(result.error.message);
      else {
        setSaved(true);
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-foreground">Personal</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Date of birth"
            name="date_of_birth"
            type="date"
            defaultValue={p?.date_of_birth ?? ""}
          />
          <Field label="Phone" name="phone" defaultValue={p?.phone ?? ""} />
          <Field
            label="Address"
            name="address"
            defaultValue={p?.address ?? ""}
            full
          />
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-foreground">
          Emergency Contact
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Name"
            name="emergency_contact_name"
            defaultValue={p?.emergency_contact_name ?? ""}
          />
          <Field
            label="Phone"
            name="emergency_contact_phone"
            defaultValue={p?.emergency_contact_phone ?? ""}
          />
          <Field
            label="Relationship"
            name="emergency_contact_relationship"
            defaultValue={p?.emergency_contact_relationship ?? ""}
          />
        </div>
      </section>

      <FormFeedback error={error} saved={saved} />

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {isPending ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}

// ============================================================
// Employment Tab (new - working rights, visa, qualifications)
// ============================================================

function EmploymentTab({ member }: { member: StaffMemberDetail }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [workingRights, setWorkingRights] = useState(
    member.profile?.working_rights ?? "",
  );

  const p = member.profile;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    const fd = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await updateStaffProfile(member.user_id, {
        employment_type:
          (fd.get("employment_type") as EmploymentType) || undefined,
        position_title:
          (fd.get("position_title") as string).trim() || undefined,
        start_date: (fd.get("start_date") as string) || undefined,
        end_date: (fd.get("end_date") as string) || undefined,
        working_rights:
          (fd.get("working_rights") as WorkingRights) || undefined,
        visa_subclass: (fd.get("visa_subclass") as string).trim() || undefined,
        visa_expiry: (fd.get("visa_expiry") as string) || undefined,
        work_restrictions:
          (fd.get("work_restrictions") as string).trim() || undefined,
        qualification_level:
          (fd.get("qualification_level") as QualificationLevel) || undefined,
        qualification_detail:
          (fd.get("qualification_detail") as string).trim() || undefined,
        teacher_registration_number:
          (fd.get("teacher_registration_number") as string).trim() || undefined,
        teacher_registration_state:
          (fd.get("teacher_registration_state") as string).trim() || undefined,
        teacher_registration_expiry:
          (fd.get("teacher_registration_expiry") as string) || undefined,
        acecqa_approval_number:
          (fd.get("acecqa_approval_number") as string).trim() || undefined,
        notes: (fd.get("notes") as string).trim() || undefined,
      });

      if (result.error) setError(result.error.message);
      else {
        setSaved(true);
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Employment */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-foreground">Employment</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            label="Employment type"
            name="employment_type"
            defaultValue={p?.employment_type ?? ""}
            options={[
              { value: "full_time", label: "Full time" },
              { value: "part_time", label: "Part time" },
              { value: "casual", label: "Casual" },
              { value: "contractor", label: "Contractor" },
            ]}
          />
          <Field
            label="Position title"
            name="position_title"
            defaultValue={p?.position_title ?? ""}
            placeholder="e.g. Room Leader"
          />
          <Field
            label="Start date"
            name="start_date"
            type="date"
            defaultValue={p?.start_date ?? ""}
          />
          <Field
            label="End date"
            name="end_date"
            type="date"
            defaultValue={p?.end_date ?? ""}
          />
        </div>
      </section>

      {/* Working Rights / Visa */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-foreground">
          Working Rights
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">
              Working rights
            </label>
            <select
              name="working_rights"
              value={workingRights}
              onChange={(e) => setWorkingRights(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="">Not specified</option>
              <option value="citizen">Australian Citizen</option>
              <option value="permanent_resident">Permanent Resident</option>
              <option value="visa_holder">Visa Holder</option>
            </select>
          </div>

          {workingRights === "visa_holder" && (
            <>
              <Field
                label="Visa subclass"
                name="visa_subclass"
                defaultValue={p?.visa_subclass ?? ""}
                placeholder="e.g. 482"
              />
              <Field
                label="Visa expiry"
                name="visa_expiry"
                type="date"
                defaultValue={p?.visa_expiry ?? ""}
              />
              <Field
                label="Work restrictions"
                name="work_restrictions"
                defaultValue={p?.work_restrictions ?? ""}
                placeholder="e.g. 40 hrs / fortnight"
              />
            </>
          )}
        </div>
      </section>

      {/* Qualifications */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-foreground">
          Qualifications
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            label="Highest qualification"
            name="qualification_level"
            defaultValue={p?.qualification_level ?? ""}
            options={[
              { value: "none", label: "None" },
              { value: "cert3", label: "Certificate III" },
              { value: "diploma", label: "Diploma" },
              { value: "bachelor", label: "Bachelor Degree" },
              { value: "masters", label: "Masters Degree" },
              { value: "ect", label: "Early Childhood Teacher (ECT)" },
              { value: "working_towards", label: "Working towards" },
            ]}
          />
          <Field
            label="Qualification detail"
            name="qualification_detail"
            defaultValue={p?.qualification_detail ?? ""}
            placeholder="e.g. Diploma of Early Childhood (CHC50121)"
          />
          <Field
            label="Teacher registration number"
            name="teacher_registration_number"
            defaultValue={p?.teacher_registration_number ?? ""}
          />
          <SelectField
            label="Registration state"
            name="teacher_registration_state"
            defaultValue={p?.teacher_registration_state ?? ""}
            options={[
              { value: "NSW", label: "NSW" },
              { value: "VIC", label: "VIC" },
              { value: "QLD", label: "QLD" },
              { value: "SA", label: "SA" },
              { value: "WA", label: "WA" },
              { value: "TAS", label: "TAS" },
              { value: "NT", label: "NT" },
              { value: "ACT", label: "ACT" },
            ]}
          />
          <Field
            label="Registration expiry"
            name="teacher_registration_expiry"
            type="date"
            defaultValue={p?.teacher_registration_expiry ?? ""}
          />
          <Field
            label="ACECQA approval number"
            name="acecqa_approval_number"
            defaultValue={p?.acecqa_approval_number ?? ""}
          />
        </div>
      </section>

      {/* Notes */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-foreground">
          Internal Notes
        </h3>
        <textarea
          name="notes"
          rows={3}
          defaultValue={p?.notes ?? ""}
          placeholder="Visible to admins only…"
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </section>

      <FormFeedback error={error} saved={saved} />

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {isPending ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}

// ============================================================
// Role & Access Tab (with per-user permission overrides)
// ============================================================

function RoleTab({
  member,
  roles,
}: {
  member: StaffMemberDetail;
  roles: RoleWithCounts[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedRoleId, setSelectedRoleId] = useState(member.role_id);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const staffRoles = roles.filter((r) => r.name.toLowerCase() !== "parent");

  // Build the effective permission state for this user
  const rolePermSet = new Set(member.role_permission_keys);
  const grantOverrides = new Set(
    member.overrides
      .filter((o) => o.override_type === "grant")
      .map((o) => o.permission_key),
  );
  const denyOverrides = new Set(
    member.overrides
      .filter((o) => o.override_type === "deny")
      .map((o) => o.permission_key),
  );

  function handleSaveRole() {
    if (selectedRoleId === member.role_id) return;
    setError(null);
    setSaved(false);

    startTransition(async () => {
      const result = await updateStaffRole(member.user_id, selectedRoleId);
      if (result.error) setError(result.error.message);
      else {
        setSaved(true);
        router.refresh();
      }
    });
  }

  function handleOverride(permKey: string, action: "grant" | "deny" | "reset") {
    setError(null);
    setSaved(false);

    startTransition(async () => {
      let result;
      if (action === "reset") {
        result = await removePermissionOverride(member.tenant_user_id, permKey);
      } else {
        result = await setPermissionOverride({
          tenantUserId: member.tenant_user_id,
          permissionKey: permKey,
          overrideType: action,
        });
      }

      if (result.error) setError(result.error.message);
      else router.refresh();
    });
  }

  // For each permission, determine its state:
  //   "role"   - comes from role, no override
  //   "grant"  - not from role, added via override
  //   "deny"   - from role, removed via override
  //   "none"   - not from role, no override
  type PermState = "role" | "grant" | "deny" | "none";

  function getPermState(key: string): PermState {
    if (denyOverrides.has(key)) return "deny";
    if (grantOverrides.has(key)) return "grant";
    if (rolePermSet.has(key)) return "role";
    return "none";
  }

  const allModules = Object.entries(PermissionModules);

  return (
    <div className="space-y-6">
      {/* Role selector */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Role</h3>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 space-y-1">
            <label className="text-sm font-medium text-foreground">
              Assigned role
            </label>
            <select
              value={selectedRoleId}
              onChange={(e) => {
                setSelectedRoleId(e.target.value);
                setSaved(false);
              }}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {staffRoles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                  {r.is_system ? "" : " (custom)"}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            disabled={isPending || selectedRoleId === member.role_id}
            onClick={handleSaveRole}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
          >
            {isPending ? "Saving…" : "Update Role"}
          </button>
        </div>
        <FormFeedback error={error} saved={saved} />
      </section>

      {/* Per-user permission overrides */}
      <section className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Permission Overrides
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Start from the role as a baseline, then grant or deny individual
            permissions for this person. Click a permission to cycle through
            states.
          </p>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 text-xs">
          <span className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded border border-border bg-muted" />
            From role
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded bg-success/40" />
            Granted (override)
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded bg-destructive/40" />
            Denied (override)
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded border border-border bg-background" />
            Not granted
          </span>
        </div>

        <div className="space-y-3">
          {allModules.map(([moduleKey, module]) => {
            const perms = module.permissions as readonly string[];

            return (
              <div
                key={moduleKey}
                className="rounded-md border border-border bg-card p-3"
              >
                <h4 className="mb-2 text-xs font-semibold text-foreground">
                  {module.label}
                </h4>

                <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-3">
                  {perms.map((permKey) => {
                    const state = getPermState(permKey);
                    const label = permKey
                      .replace(/_/g, " ")
                      .replace(/\b\w/g, (c) => c.toUpperCase());

                    // Determine what action the next click should do
                    // role → deny (remove from role via override)
                    // grant → reset (remove override)
                    // deny → reset (remove override, restores role)
                    // none → grant (add via override)
                    function handleClick() {
                      if (state === "role") {
                        handleOverride(permKey, "deny");
                      } else if (state === "grant") {
                        handleOverride(permKey, "reset");
                      } else if (state === "deny") {
                        handleOverride(permKey, "reset");
                      } else {
                        handleOverride(permKey, "grant");
                      }
                    }

                    const stateStyles: Record<PermState, string> = {
                      role: "bg-muted text-foreground border-border",
                      grant: "bg-success/15 text-success border-success/30",
                      deny: "bg-destructive/10 text-destructive/70 border-destructive/20 line-through",
                      none: "bg-background text-muted-foreground border-border",
                    };

                    const stateIndicator: Record<PermState, string> = {
                      role: "●",
                      grant: "+",
                      deny: "−",
                      none: "",
                    };

                    return (
                      <button
                        key={permKey}
                        type="button"
                        disabled={isPending}
                        onClick={handleClick}
                        className={`flex items-center gap-2 rounded border px-2 py-1.5 text-left text-xs transition-colors disabled:opacity-50 ${stateStyles[state]}`}
                      >
                        <span className="w-3 text-center text-xs font-bold">
                          {stateIndicator[state]}
                        </span>
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

// ============================================================
// Compliance Tab
// ============================================================

function ComplianceTab({ member }: { member: StaffMemberDetail }) {
  const records = member.compliance_records;

  function isExpiringSoon(dateStr: string | null) {
    if (!dateStr) return false;
    const diff = new Date(dateStr).getTime() - Date.now();
    return diff > 0 && diff < 60 * 24 * 60 * 60 * 1000;
  }

  function isExpired(dateStr: string | null) {
    if (!dateStr) return false;
    return new Date(dateStr).getTime() < Date.now();
  }

  const expiredCount = records.filter((r) => isExpired(r.expires_at)).length;
  const expiringCount = records.filter(
    (r) => !isExpired(r.expires_at) && isExpiringSoon(r.expires_at),
  ).length;
  const validCount = records.length - expiredCount - expiringCount;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-card p-6 text-center">
        <p
          className="mx-auto mb-3 text-3xl"
          style={{ color: "var(--empty-state-icon)" }}
        >
          🪪
        </p>
        <h3 className="text-sm font-semibold text-foreground">
          Regulatory Compliance
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          WWCC, First Aid, CPR, Anaphylaxis, Asthma, Geccko child safety, and
          Worker Register data are managed in the dedicated compliance module.
        </p>

        {/* Quick summary from legacy records */}
        {records.length > 0 && (
          <div className="mx-auto mt-4 flex max-w-xs justify-center gap-3">
            {validCount > 0 && (
              <span
                className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                style={{
                  backgroundColor: "var(--attendance-present-bg, #dcfce7)",
                  color: "var(--attendance-present-fg, #166534)",
                }}
              >
                {validCount} valid
              </span>
            )}
            {expiringCount > 0 && (
              <span
                className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                style={{
                  backgroundColor: "var(--attendance-late-bg, #fef9c3)",
                  color: "var(--attendance-late-fg, #854d0e)",
                }}
              >
                {expiringCount} expiring
              </span>
            )}
            {expiredCount > 0 && (
              <span
                className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                style={{
                  backgroundColor: "var(--attendance-absent-bg, #fee2e2)",
                  color: "var(--attendance-absent-fg, #991b1b)",
                }}
              >
                {expiredCount} expired
              </span>
            )}
          </div>
        )}

        <a
          href={`/admin/staff-compliance/${member.user_id}`}
          className="active-push touch-target mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          View Full Compliance Profile
        </a>
      </div>
    </div>
  );
}

// ============================================================
// Danger Tab
// ============================================================

function DangerTab({
  member,
  currentUserId,
}: {
  member: StaffMemberDetail;
  currentUserId: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const isSelf = member.user_id === currentUserId;

  function handleAction(
    action: "suspend" | "reactivate" | "remove",
    confirmMsg: string,
  ) {
    if (!window.confirm(confirmMsg)) return;
    setError(null);

    startTransition(async () => {
      const result =
        action === "suspend"
          ? await suspendStaffMember(member.user_id)
          : action === "reactivate"
            ? await reactivateStaffMember(member.user_id)
            : await removeStaffMember(member.user_id);

      if (result.error) setError(result.error.message);
      else if (action === "remove") router.push("/admin/staff");
      else router.refresh();
    });
  }

  if (isSelf) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-center">
        <p className="text-sm text-muted-foreground">
          You cannot modify your own account from here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-start justify-between">
          <div>
            <h4 className="text-sm font-semibold text-foreground">
              {member.status === "suspended"
                ? "Reactivate Account"
                : "Suspend Account"}
            </h4>
            <p className="mt-1 text-xs text-muted-foreground">
              {member.status === "suspended"
                ? "Allow this staff member to sign in again."
                : "Prevent this staff member from signing in. They won\u2019t be deleted."}
            </p>
          </div>
          {member.status === "suspended" ? (
            <button
              type="button"
              disabled={isPending}
              onClick={() =>
                handleAction("reactivate", "Reactivate this staff member?")
              }
              className="rounded-md border border-success/40 bg-success/10 px-4 py-2 text-sm font-medium text-success hover:bg-success/20 disabled:opacity-50"
            >
              Reactivate
            </button>
          ) : (
            <button
              type="button"
              disabled={isPending}
              onClick={() =>
                handleAction(
                  "suspend",
                  "Suspend this staff member? They won\u2019t be able to sign in.",
                )
              }
              className="rounded-md border border-warning/40 bg-warning/10 px-4 py-2 text-sm font-medium text-warning hover:bg-warning/20 disabled:opacity-50"
            >
              Suspend
            </button>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
        <div className="flex items-start justify-between">
          <div>
            <h4 className="text-sm font-semibold text-destructive">
              Remove from School
            </h4>
            <p className="mt-1 text-xs text-muted-foreground">
              Removes their membership from this school. Does not delete their
              WattleOS account. Can be undone by re-inviting them.
            </p>
          </div>
          <button
            type="button"
            disabled={isPending}
            onClick={() =>
              handleAction(
                "remove",
                "Remove this staff member from your school? They will lose all access.",
              )
            }
            className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/20 disabled:opacity-50"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Main Component
// ============================================================

interface StaffProfileClientProps {
  member: StaffMemberDetail;
  roles: RoleWithCounts[];
  currentUserId: string;
}

export function StaffProfileClient({
  member,
  roles,
  currentUserId,
}: StaffProfileClientProps) {
  const [tab, setTab] = useState<Tab>("contact");

  const tabs: { id: Tab; label: string }[] = [
    { id: "contact", label: "Contact" },
    { id: "employment", label: "Employment" },
    { id: "role", label: "Role & Access" },
    { id: "compliance", label: "Compliance" },
    { id: "danger", label: "Account" },
  ];

  // Check for compliance warnings
  const hasComplianceWarning = member.compliance_records.some((r) => {
    if (!r.expires_at) return false;
    const diff = new Date(r.expires_at).getTime() - Date.now();
    return diff < 60 * 24 * 60 * 60 * 1000; // expired or within 60 days
  });

  // Check for visa expiry warning
  const hasVisaWarning =
    member.profile?.visa_expiry &&
    new Date(member.profile.visa_expiry).getTime() - Date.now() <
      90 * 24 * 60 * 60 * 1000;

  // Check for override count
  const overrideCount = member.overrides.length;

  return (
    <div className="space-y-4">
      <div className="flex overflow-x-auto border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex-shrink-0 px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.id
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}

            {t.id === "compliance" && hasComplianceWarning && (
              <span className="ml-1.5 rounded-full bg-warning/20 px-1.5 py-0.5 text-xs text-warning">
                !
              </span>
            )}

            {t.id === "employment" && hasVisaWarning && (
              <span className="ml-1.5 rounded-full bg-warning/20 px-1.5 py-0.5 text-xs text-warning">
                !
              </span>
            )}

            {t.id === "role" && overrideCount > 0 && (
              <span className="ml-1.5 rounded-full bg-info/20 px-1.5 py-0.5 text-xs text-info">
                {overrideCount}
              </span>
            )}
          </button>
        ))}
      </div>

      <div>
        {tab === "contact" && <ContactTab member={member} />}
        {tab === "employment" && <EmploymentTab member={member} />}
        {tab === "role" && <RoleTab member={member} roles={roles} />}
        {tab === "compliance" && <ComplianceTab member={member} />}
        {tab === "danger" && (
          <DangerTab member={member} currentUserId={currentUserId} />
        )}
      </div>
    </div>
  );
}
