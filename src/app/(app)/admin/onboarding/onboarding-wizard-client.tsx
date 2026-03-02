"use client";

// src/app/(app)/admin/onboarding/onboarding-wizard-client.tsx
//
// ============================================================
// WattleOS V2 - First-Run Setup Wizard (Client)
// ============================================================
// 4-step guided setup for new school owners:
//   1. Welcome      - confirm school name, timezone, country, currency
//   2. Invite Team  - add staff by email + role (inline quick invite)
//   3. Add Students - link to Data Import CSV wizard
//   4. All Done     - mark complete, go to Admin
//
// Design system:
//   - CSS variables only (no hardcoded tailwind colors)
//   - active-push touch-target on all buttons
//   - useHaptics() for native feedback
//   - card-interactive on link cards
//   - border border-border on all cards
// ============================================================

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useHaptics } from "@/lib/hooks/use-haptics";
import {
  saveOnboardingSchoolInfo,
  completeOnboarding,
} from "@/lib/actions/setup/onboarding";
import { massInviteStaff } from "@/lib/data-import/mass-invite-actions";
import type {
  OnboardingStatus,
  TenantRole,
} from "@/lib/actions/setup/onboarding";
import type { MassInviteStaffRow } from "@/lib/data-import/mass-invite-actions";
import {
  AUSTRALIAN_TIMEZONES,
  SUPPORTED_COUNTRIES,
  SUPPORTED_CURRENCIES,
} from "@/lib/constants/tenant-settings";

// ============================================================
// Types
// ============================================================

interface Props {
  initialData: OnboardingStatus;
  roles: TenantRole[];
}

type Step = 1 | 2 | 3 | 4;

interface StaffRow {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
}

// ============================================================
// Progress indicator
// ============================================================

function StepDots({ current }: { current: Step }) {
  const labels = ["School", "Team", "Students", "Done"];
  return (
    <div className="flex items-center justify-center gap-3">
      {([1, 2, 3, 4] as Step[]).map((s) => (
        <div key={s} className="flex flex-col items-center gap-1">
          <div
            className="h-2.5 w-2.5 rounded-full transition-all duration-300"
            style={{
              background:
                s === current
                  ? "var(--primary)"
                  : s < current
                    ? "var(--primary)"
                    : "var(--muted)",
              opacity: s < current ? 0.4 : 1,
            }}
          />
          <span
            className="text-[10px] font-medium"
            style={{
              color:
                s === current ? "var(--primary)" : "var(--muted-foreground)",
            }}
          >
            {labels[s - 1]}
          </span>
        </div>
      ))}
    </div>
  );
}

// ============================================================
// Step 1 - Welcome / School Info
// ============================================================

function Step1Welcome({
  initialData,
  onNext,
}: {
  initialData: OnboardingStatus;
  onNext: (name: string) => void;
}) {
  const haptics = useHaptics();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState(initialData.name);
  const [timezone, setTimezone] = useState(initialData.timezone);
  const [country, setCountry] = useState(initialData.country);
  const [currency, setCurrency] = useState(initialData.currency);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit() {
    if (!name.trim()) {
      setError("School name is required");
      return;
    }
    haptics.medium();
    setError(null);
    startTransition(async () => {
      const result = await saveOnboardingSchoolInfo({
        name,
        timezone,
        country,
        currency,
      });
      if (result.data) {
        onNext(result.data.name);
      } else {
        setError(result.error?.message ?? "Failed to save");
      }
    });
  }

  const inputClass =
    "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-colors";
  const labelClass = "block text-xs font-medium text-muted-foreground mb-1";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">
          Welcome to WattleOS
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Let&apos;s start by confirming your school&apos;s details.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className={labelClass}>School name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
            placeholder="e.g. Acacia Valley Montessori"
          />
        </div>

        <div>
          <label className={labelClass}>Timezone</label>
          <select
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className={inputClass}
          >
            {AUSTRALIAN_TIMEZONES.map((tz) => (
              <option key={tz.value} value={tz.value}>
                {tz.label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Country</label>
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className={inputClass}
            >
              {SUPPORTED_COUNTRIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Currency</label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className={inputClass}
            >
              {SUPPORTED_CURRENCIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {error && (
        <p
          className="rounded-lg border px-3 py-2 text-sm"
          style={{
            borderColor: "var(--destructive)",
            color: "var(--destructive)",
          }}
        >
          {error}
        </p>
      )}

      <button
        onClick={handleSubmit}
        disabled={isPending}
        className="active-push touch-target w-full rounded-lg px-4 py-3 text-sm font-semibold text-primary-foreground transition-colors disabled:opacity-60"
        style={{ background: "var(--primary)" }}
      >
        {isPending ? "Saving…" : "Save & Continue →"}
      </button>
    </div>
  );
}

// ============================================================
// Step 2 - Invite Your Team
// ============================================================

interface InviteResult {
  total: number;
  invited: number;
  skipped: number;
  errors: Array<{ row: number; email: string; message: string }>;
}

let rowIdCounter = 1;

function Step2Team({
  roles,
  onNext,
}: {
  roles: TenantRole[];
  onNext: (invited: number) => void;
}) {
  const haptics = useHaptics();
  const [isPending, startTransition] = useTransition();
  const defaultRole = roles[0]?.name ?? "";
  const [rows, setRows] = useState<StaffRow[]>([
    {
      id: rowIdCounter++,
      email: "",
      first_name: "",
      last_name: "",
      role: defaultRole,
    },
  ]);
  const [result, setResult] = useState<InviteResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function addRow() {
    haptics.light();
    setRows((prev) => [
      ...prev,
      {
        id: rowIdCounter++,
        email: "",
        first_name: "",
        last_name: "",
        role: defaultRole,
      },
    ]);
  }

  function removeRow(id: number) {
    haptics.light();
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  function updateRow(
    id: number,
    field: keyof Omit<StaffRow, "id">,
    value: string,
  ) {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)),
    );
  }

  function handleSend() {
    const validRows = rows.filter((r) => r.email.trim() && r.role);
    if (validRows.length === 0) {
      setError("Add at least one staff member with an email and role.");
      return;
    }
    setError(null);
    haptics.medium();
    startTransition(async () => {
      const staffRows: MassInviteStaffRow[] = validRows.map((r) => ({
        email: r.email.trim().toLowerCase(),
        first_name: r.first_name.trim(),
        last_name: r.last_name.trim(),
        role: r.role,
      }));
      const res = await massInviteStaff(staffRows);
      if (res.data) {
        setResult(res.data);
        haptics.success();
      } else {
        setError(res.error?.message ?? "Invite failed");
      }
    });
  }

  const inputClass =
    "rounded-lg border border-border bg-background px-2.5 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-colors";

  // After sending, show results + continue
  if (result) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-foreground">
            Invites sent!
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Your team will receive an email to set up their account.
          </p>
        </div>

        <div
          className="rounded-lg border border-border p-4 space-y-1"
          style={{ background: "var(--muted)" }}
        >
          <p className="text-sm text-foreground">
            <span className="font-semibold">{result.invited}</span> invited
            {result.skipped > 0 && (
              <>
                , <span className="font-semibold">{result.skipped}</span>{" "}
                already existed
              </>
            )}
          </p>
          {result.errors.length > 0 && (
            <ul className="mt-2 space-y-1">
              {result.errors.map((e) => (
                <li
                  key={`${e.row}-${e.email}`}
                  className="text-xs"
                  style={{ color: "var(--destructive)" }}
                >
                  {e.email}: {e.message}
                </li>
              ))}
            </ul>
          )}
        </div>

        <button
          onClick={() => {
            haptics.light();
            onNext(result.invited);
          }}
          className="active-push touch-target w-full rounded-lg px-4 py-3 text-sm font-semibold text-primary-foreground transition-colors"
          style={{ background: "var(--primary)" }}
        >
          Continue →
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">
          Invite your team
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Staff will receive an email to activate their account.
        </p>
      </div>

      <div className="space-y-2">
        {rows.map((row, i) => (
          <div
            key={row.id}
            className="rounded-lg border border-border p-3 space-y-2"
            style={{ background: "var(--muted)" }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                Staff {i + 1}
              </span>
              {rows.length > 1 && (
                <button
                  onClick={() => removeRow(row.id)}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Remove
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="First name"
                value={row.first_name}
                onChange={(e) =>
                  updateRow(row.id, "first_name", e.target.value)
                }
                className={inputClass}
              />
              <input
                type="text"
                placeholder="Last name"
                value={row.last_name}
                onChange={(e) => updateRow(row.id, "last_name", e.target.value)}
                className={inputClass}
              />
            </div>
            <input
              type="email"
              placeholder="Email address"
              value={row.email}
              onChange={(e) => updateRow(row.id, "email", e.target.value)}
              className={`${inputClass} w-full`}
            />
            <select
              value={row.role}
              onChange={(e) => updateRow(row.id, "role", e.target.value)}
              className={`${inputClass} w-full`}
            >
              {roles.map((r) => (
                <option key={r.id} value={r.name}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
        ))}

        <button
          onClick={addRow}
          className="active-push touch-target w-full rounded-lg border border-dashed px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          style={{ borderColor: "var(--border)" }}
        >
          + Add another
        </button>
      </div>

      {error && (
        <p
          className="rounded-lg border px-3 py-2 text-sm"
          style={{
            borderColor: "var(--destructive)",
            color: "var(--destructive)",
          }}
        >
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <button
          onClick={() => {
            haptics.light();
            onNext(0);
          }}
          className="active-push touch-target flex-1 rounded-lg border border-border px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Skip for now
        </button>
        <button
          onClick={handleSend}
          disabled={isPending}
          className="active-push touch-target flex-1 rounded-lg px-4 py-3 text-sm font-semibold text-primary-foreground transition-colors disabled:opacity-60"
          style={{ background: "var(--primary)" }}
        >
          {isPending ? "Sending…" : "Send Invites"}
        </button>
      </div>
    </div>
  );
}

// ============================================================
// Step 3 - Import Students
// ============================================================

function Step3Students({ onNext }: { onNext: () => void }) {
  const haptics = useHaptics();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">
          Import your students
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload a CSV file with student details. You can do this now or any
          time from Admin.
        </p>
      </div>

      <a
        href="/admin/data-import"
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => haptics.medium()}
        className="card-interactive block rounded-xl border border-border p-5"
      >
        <div className="flex items-start gap-4">
          <span
            className="text-3xl"
            style={{ color: "var(--empty-state-icon)" }}
          >
            📥
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground">
              Data Import Wizard
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Supports bulk CSV import for students and guardians. Opens in a
              new tab.
            </p>
          </div>
        </div>
        <p
          className="mt-3 text-xs font-medium"
          style={{ color: "var(--primary)" }}
        >
          Open Import Wizard →
        </p>
      </a>

      <p className="text-center text-xs text-muted-foreground">
        You can always access this from Admin → Data Import later.
      </p>

      <button
        onClick={() => {
          haptics.light();
          onNext();
        }}
        className="active-push touch-target w-full rounded-lg border border-border px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        Skip for now →
      </button>
    </div>
  );
}

// ============================================================
// Step 4 - All Done
// ============================================================

function Step4Done({
  schoolName,
  staffInvited,
}: {
  schoolName: string;
  staffInvited: number;
}) {
  const haptics = useHaptics();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleComplete() {
    haptics.heavy();
    startTransition(async () => {
      await completeOnboarding();
      router.push("/admin");
    });
  }

  return (
    <div className="space-y-6 text-center">
      <div className="space-y-2">
        <div className="text-5xl">🎉</div>
        <h2 className="text-xl font-semibold text-foreground">
          You&apos;re all set!
        </h2>
        <p className="text-sm text-muted-foreground">
          {schoolName} is ready to go on WattleOS.
        </p>
      </div>

      <div
        className="rounded-xl border border-border p-4 text-left space-y-2"
        style={{ background: "var(--muted)" }}
      >
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          What you set up
        </p>
        <ul className="space-y-1.5">
          <li className="flex items-center gap-2 text-sm text-foreground">
            <span style={{ color: "var(--attendance-present)" }}>✓</span>
            School details confirmed
          </li>
          {staffInvited > 0 && (
            <li className="flex items-center gap-2 text-sm text-foreground">
              <span style={{ color: "var(--attendance-present)" }}>✓</span>
              {staffInvited} staff member{staffInvited !== 1 ? "s" : ""} invited
            </li>
          )}
        </ul>
      </div>

      <div
        className="rounded-xl border border-border p-4 text-left space-y-2"
        style={{ background: "var(--muted)" }}
      >
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Next steps
        </p>
        <ul className="space-y-1.5">
          <li className="text-sm text-muted-foreground">
            → Import students via Data Import
          </li>
          <li className="text-sm text-muted-foreground">
            → Set up your first enrollment period
          </li>
          <li className="text-sm text-muted-foreground">
            → Configure your school programs
          </li>
        </ul>
      </div>

      <button
        onClick={handleComplete}
        disabled={isPending}
        className="active-push touch-target w-full rounded-lg px-4 py-3 text-sm font-semibold text-primary-foreground transition-colors disabled:opacity-60"
        style={{ background: "var(--primary)" }}
      >
        {isPending ? "Loading…" : "Go to Admin →"}
      </button>
    </div>
  );
}

// ============================================================
// Root wizard component
// ============================================================

export function OnboardingWizardClient({ initialData, roles }: Props) {
  const [step, setStep] = useState<Step>(1);
  const [schoolName, setSchoolName] = useState(initialData.name);
  const [staffInvited, setStaffInvited] = useState(0);

  return (
    <div className="mx-auto max-w-lg space-y-8 py-8 px-4">
      <StepDots current={step} />

      <div className="rounded-2xl border border-border bg-background p-6 shadow-sm">
        {step === 1 && (
          <Step1Welcome
            initialData={{ ...initialData, name: schoolName }}
            onNext={(name) => {
              setSchoolName(name);
              setStep(2);
            }}
          />
        )}
        {step === 2 && (
          <Step2Team
            roles={roles}
            onNext={(invited) => {
              setStaffInvited(invited);
              setStep(3);
            }}
          />
        )}
        {step === 3 && <Step3Students onNext={() => setStep(4)} />}
        {step === 4 && (
          <Step4Done schoolName={schoolName} staffInvited={staffInvited} />
        )}
      </div>
    </div>
  );
}
