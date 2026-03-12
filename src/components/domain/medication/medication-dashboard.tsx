"use client";

// src/components/domain/medication/medication-dashboard.tsx
//
// ============================================================
// Medication Dashboard - overview + alerts + today's doses
// ============================================================

import type {
  StudentMedicationSummary,
  MedicalManagementPlanWithStudent,
  MedicationAdministrationWithDetails,
} from "@/types/domain";
import { GlowTarget } from "@/components/domain/glow/glow-registry";
import Link from "next/link";

interface Props {
  summaries: StudentMedicationSummary[];
  expiringPlans: MedicalManagementPlanWithStudent[];
  expiredPlans: MedicalManagementPlanWithStudent[];
  todayAdministrations: MedicationAdministrationWithDetails[];
  canAdminister: boolean;
  canManage: boolean;
}

const PLAN_TYPE_LABELS: Record<string, string> = {
  ascia_anaphylaxis: "ASCIA Anaphylaxis",
  asthma: "Asthma",
  diabetes: "Diabetes",
  seizure: "Seizure",
  other: "Other",
};

export function MedicationDashboard({
  summaries,
  expiringPlans,
  expiredPlans,
  todayAdministrations,
  canAdminister,
  canManage,
}: Props) {
  const totalPlans = summaries.reduce((sum, s) => sum + s.active_plans, 0);
  const totalAuths = summaries.reduce(
    (sum, s) => sum + s.active_authorisations,
    0,
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-xl font-bold"
            style={{ color: "var(--foreground)" }}
          >
            Medication
          </h1>
          <p
            className="mt-1 text-sm"
            style={{ color: "var(--muted-foreground)" }}
          >
            Regulation 93/94 - medical management plans, authorisations and
            administration records.
          </p>
        </div>
        <div className="flex gap-2">
          {canAdminister && (
            <GlowTarget
              id="meds-btn-administer"
              category="button"
              label="Record Dose"
            >
              <Link
                href="/medication/administer"
                className="active-push touch-target inline-flex items-center gap-2 rounded-[var(--radius-md)] px-4 py-2 text-sm font-semibold transition-colors"
                style={{
                  background: "var(--primary)",
                  color: "var(--primary-foreground)",
                }}
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 4.5v15m7.5-7.5h-15"
                  />
                </svg>
                Record Dose
              </Link>
            </GlowTarget>
          )}
          <Link
            href="/medication/register"
            className="active-push touch-target inline-flex items-center gap-2 rounded-[var(--radius-md)] border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
            style={{ color: "var(--foreground)" }}
          >
            Register
          </Link>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard
          label="Active Plans"
          value={totalPlans}
          detail={`${summaries.length} students`}
          icon={
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
              />
            </svg>
          }
        />
        <SummaryCard
          label="Active Authorisations"
          value={totalAuths}
          detail="medications authorised"
          icon={
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z"
              />
            </svg>
          }
        />
        <SummaryCard
          label="Today's Doses"
          value={todayAdministrations.length}
          detail="administered today"
          icon={
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
              />
            </svg>
          }
        />
      </div>

      {/* Expired plans alert */}
      {expiredPlans.length > 0 && (
        <div
          className="rounded-[var(--radius-lg)] border p-4 space-y-3"
          style={{
            borderColor: "var(--destructive)",
            background:
              "color-mix(in srgb, var(--destructive) 8%, transparent)",
          }}
        >
          <div className="flex items-center gap-2">
            <svg
              className="h-5 w-5 shrink-0"
              style={{ color: "var(--destructive)" }}
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
              />
            </svg>
            <p
              className="text-sm font-semibold"
              style={{ color: "var(--destructive)" }}
            >
              {expiredPlans.length} expired medical management{" "}
              {expiredPlans.length === 1 ? "plan" : "plans"}
            </p>
          </div>
          <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
            These plans have passed their expiry date and must be renewed.
            Children with expired plans may not have current action plans on
            file.
          </p>
          <div className="space-y-1">
            {expiredPlans.map((plan) => (
              <Link
                key={plan.id}
                href={`/medication/student/${plan.student_id}`}
                className="touch-target flex items-center justify-between rounded-[var(--radius-md)] px-3 py-2 text-sm transition-colors hover:bg-white/20"
              >
                <span
                  className="font-medium"
                  style={{ color: "var(--foreground)" }}
                >
                  {plan.student.first_name} {plan.student.last_name} -{" "}
                  {PLAN_TYPE_LABELS[plan.plan_type] ?? plan.plan_type}
                </span>
                <span
                  className="text-xs font-mono font-semibold"
                  style={{ color: "var(--destructive)" }}
                >
                  Expired {plan.expiry_date}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Expiring plans warning */}
      {expiringPlans.length > 0 && (
        <div
          className="rounded-[var(--radius-lg)] border p-4 space-y-3"
          style={{
            borderColor: "color-mix(in srgb, orange 80%, transparent)",
            background: "color-mix(in srgb, orange 6%, transparent)",
          }}
        >
          <div className="flex items-center gap-2">
            <svg
              className="h-5 w-5 shrink-0"
              style={{ color: "orange" }}
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
              />
            </svg>
            <p
              className="text-sm font-semibold"
              style={{ color: "var(--foreground)" }}
            >
              {expiringPlans.length}{" "}
              {expiringPlans.length === 1 ? "plan" : "plans"} expiring within 30
              days
            </p>
          </div>
          <div className="space-y-1">
            {expiringPlans.map((plan) => {
              const daysLeft = Math.ceil(
                (new Date(plan.expiry_date!).getTime() - Date.now()) /
                  (1000 * 60 * 60 * 24),
              );
              return (
                <Link
                  key={plan.id}
                  href={`/medication/student/${plan.student_id}`}
                  className="touch-target flex items-center justify-between rounded-[var(--radius-md)] px-3 py-2 text-sm transition-colors hover:bg-white/20"
                >
                  <span
                    className="font-medium"
                    style={{ color: "var(--foreground)" }}
                  >
                    {plan.student.first_name} {plan.student.last_name} -{" "}
                    {PLAN_TYPE_LABELS[plan.plan_type] ?? plan.plan_type}
                  </span>
                  <span
                    className="text-xs font-mono"
                    style={{
                      color:
                        daysLeft <= 7
                          ? "var(--destructive)"
                          : "var(--muted-foreground)",
                    }}
                  >
                    {daysLeft} {daysLeft === 1 ? "day" : "days"} left
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Students with active plans */}
      <div>
        <h2
          className="mb-3 text-sm font-semibold"
          style={{ color: "var(--foreground)" }}
        >
          Students with medical management plans
        </h2>
        {summaries.length === 0 ? (
          <div
            className="rounded-[var(--radius-lg)] border border-border p-12 text-center"
            style={{ background: "var(--background)" }}
          >
            <svg
              className="mx-auto h-10 w-10"
              style={{ color: "var(--empty-state-icon)" }}
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
              />
            </svg>
            <p
              className="mt-3 text-sm font-medium"
              style={{ color: "var(--foreground)" }}
            >
              No medical management plans on file
            </p>
            <p
              className="mt-1 text-xs"
              style={{ color: "var(--muted-foreground)" }}
            >
              Plans are created from each student&apos;s medication profile.
            </p>
          </div>
        ) : (
          <div
            className="overflow-hidden rounded-[var(--radius-lg)] border border-border"
            style={{ background: "var(--background)" }}
          >
            <table className="w-full text-sm">
              <thead>
                <tr
                  style={{
                    borderBottom: "1px solid var(--border)",
                    background: "var(--muted)",
                  }}
                >
                  <th
                    className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    Student
                  </th>
                  <th
                    className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wide"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    Plans
                  </th>
                  <th
                    className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wide"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    Auth&apos;d Meds
                  </th>
                  <th
                    className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wide sm:table-cell"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    Last Dose
                  </th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {summaries.map((summary, i) => (
                  <GlowTarget
                    key={summary.student.id}
                    id={`meds-row-student-${summary.student.id}`}
                    category="row"
                    label={`${summary.student.first_name} ${summary.student.last_name} medication`}
                  >
                    <tr
                      style={{
                        borderTop:
                          i > 0 ? "1px solid var(--border)" : undefined,
                      }}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {summary.expiring_plans > 0 && (
                            <span
                              className="h-2 w-2 shrink-0 rounded-full"
                              style={{ background: "orange" }}
                              title={`${summary.expiring_plans} plan(s) expiring soon`}
                            />
                          )}
                          <span
                            className="font-medium"
                            style={{ color: "var(--foreground)" }}
                          >
                            {summary.student.first_name}{" "}
                            {summary.student.last_name}
                          </span>
                        </div>
                      </td>
                      <td
                        className="px-4 py-3 text-center font-mono text-sm"
                        style={{ color: "var(--foreground)" }}
                      >
                        {summary.active_plans}
                      </td>
                      <td
                        className="px-4 py-3 text-center font-mono text-sm"
                        style={{ color: "var(--foreground)" }}
                      >
                        {summary.active_authorisations}
                      </td>
                      <td
                        className="hidden px-4 py-3 text-xs sm:table-cell"
                        style={{ color: "var(--muted-foreground)" }}
                      >
                        {summary.last_administration_at
                          ? new Date(
                              summary.last_administration_at,
                            ).toLocaleString("en-AU", {
                              day: "2-digit",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "-"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/medication/student/${summary.student.id}`}
                          className="touch-target rounded-[var(--radius-md)] px-2 py-1 text-xs font-medium transition-colors hover:bg-muted"
                          style={{ color: "var(--primary)" }}
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  </GlowTarget>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Today's administrations */}
      {todayAdministrations.length > 0 && (
        <div>
          <h2
            className="mb-3 text-sm font-semibold"
            style={{ color: "var(--foreground)" }}
          >
            Today&apos;s administrations
          </h2>
          <div
            className="overflow-hidden rounded-[var(--radius-lg)] border border-border"
            style={{ background: "var(--background)" }}
          >
            <table className="w-full text-sm">
              <thead>
                <tr
                  style={{
                    borderBottom: "1px solid var(--border)",
                    background: "var(--muted)",
                  }}
                >
                  <th
                    className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    Time
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    Student
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    Medication
                  </th>
                  <th
                    className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wide sm:table-cell"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    Dose
                  </th>
                  <th
                    className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wide sm:table-cell"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    By
                  </th>
                </tr>
              </thead>
              <tbody>
                {todayAdministrations.map((admin, i) => (
                  <tr
                    key={admin.id}
                    style={{
                      borderTop: i > 0 ? "1px solid var(--border)" : undefined,
                    }}
                  >
                    <td
                      className="px-4 py-3 font-mono text-xs"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      {new Date(admin.administered_at).toLocaleTimeString(
                        "en-AU",
                        {
                          hour: "2-digit",
                          minute: "2-digit",
                        },
                      )}
                    </td>
                    <td
                      className="px-4 py-3 font-medium"
                      style={{ color: "var(--foreground)" }}
                    >
                      {admin.student.first_name} {admin.student.last_name}
                    </td>
                    <td
                      className="px-4 py-3"
                      style={{ color: "var(--foreground)" }}
                    >
                      {admin.medication_name}
                    </td>
                    <td
                      className="hidden px-4 py-3 sm:table-cell"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      {admin.dose_given} ({admin.route})
                    </td>
                    <td
                      className="hidden px-4 py-3 sm:table-cell"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      {admin.administrator.first_name}{" "}
                      {admin.administrator.last_name}
                      {admin.witness && (
                        <span className="text-xs">
                          {" "}
                          / {admin.witness.first_name} {admin.witness.last_name}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Summary card ──────────────────────────────────────────

function SummaryCard({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: number;
  detail: string;
  icon: React.ReactNode;
}) {
  return (
    <div
      className="rounded-[var(--radius-lg)] border border-border p-4"
      style={{ background: "var(--background)" }}
    >
      <div className="flex items-center gap-3">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)]"
          style={{
            background: "var(--muted)",
            color: "var(--muted-foreground)",
          }}
        >
          {icon}
        </div>
        <div>
          <p
            className="text-2xl font-bold"
            style={{ color: "var(--foreground)" }}
          >
            {value}
          </p>
          <p
            className="text-xs font-medium"
            style={{ color: "var(--muted-foreground)" }}
          >
            {label}
          </p>
          <p
            className="text-[10px]"
            style={{ color: "var(--muted-foreground)" }}
          >
            {detail}
          </p>
        </div>
      </div>
    </div>
  );
}
