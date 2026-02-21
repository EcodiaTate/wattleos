// src/app/(app)/admin/enrollment/applications/[id]/page.tsx
//
// ============================================================
// WattleOS V2 - Application Review Page (Module 10)
// ============================================================
// The admin's single-screen review of a full enrollment
// application. All data sections are visible at once so the
// admin can make an informed approve/reject/request-changes
// decision without navigating away.
//
// WHY one page: Montessori school admins are busy. They need
// to see everything, decide, and click once. This page shows
// child info, guardians, medical, emergency contacts, custody,
// consents, and uploaded documents - then presents action
// buttons at the bottom.
// ============================================================

import { getApplicationDetails } from "@/lib/actions/enroll";
import type {
  ApplicationCustodyRestriction,
  ApplicationEmergencyContact,
  ApplicationGuardian,
  ApplicationMedicalCondition,
} from "@/types/domain";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ApprovalActions } from "./approval-actions";
import { DocumentSection } from "./document-section";

export const metadata = {
  title: "Review Application - WattleOS",
};

// ── Helpers ──────────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return " - ";
  return new Date(iso).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: "bg-gray-100 text-gray-600",
    submitted: "bg-blue-100 text-blue-700",
    under_review: "bg-purple-100 text-purple-700",
    changes_requested: "bg-amber-100 text-amber-700",
    approved: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-700",
    withdrawn: "bg-gray-100 text-gray-400",
  };

  const labels: Record<string, string> = {
    draft: "Draft",
    submitted: "Submitted",
    under_review: "Under Review",
    changes_requested: "Changes Requested",
    approved: "Approved",
    rejected: "Rejected",
    withdrawn: "Withdrawn",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${styles[status] ?? "bg-gray-100 text-gray-600"}`}
    >
      {labels[status] ?? status}
    </span>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const styles: Record<string, string> = {
    mild: "bg-yellow-100 text-yellow-800",
    moderate: "bg-orange-100 text-orange-800",
    severe: "bg-red-100 text-red-800",
    life_threatening: "bg-red-200 text-red-900",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${styles[severity] ?? "bg-gray-100 text-gray-700"}`}
    >
      {severity.replace(/_/g, " ")}
    </span>
  );
}

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <div className="border-b border-gray-100 px-5 py-3">
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

function Field({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div>
      <dt className="text-xs font-medium text-gray-500">{label}</dt>
      <dd className="mt-0.5 text-sm text-gray-900">{value || " - "}</dd>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────

interface ApplicationDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ApplicationDetailPage({
  params,
}: ApplicationDetailPageProps) {
  const { id } = await params;
  const result = await getApplicationDetails(id);

  if (result.error || !result.data) {
    notFound();
  }

  const app = result.data;
  const guardians = (app.guardians ?? []) as ApplicationGuardian[];
  const medicalConditions = (app.medical_conditions ??
    []) as ApplicationMedicalCondition[];
  const emergencyContacts = (app.emergency_contacts ??
    []) as ApplicationEmergencyContact[];
  const custodyRestrictions = (app.custody_restrictions ??
    []) as ApplicationCustodyRestriction[];
  const documents = app.documents ?? [];

  const isActionable = [
    "submitted",
    "under_review",
    "changes_requested",
  ].includes(app.status);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">
              {app.child_first_name} {app.child_last_name}
            </h1>
            <StatusBadge status={app.status} />
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Enrollment Application · Submitted {formatDate(app.submitted_at)} ·{" "}
            {app.submitted_by_email}
          </p>
          {app.enrollment_period && (
            <p className="text-sm text-gray-400">
              Period: {app.enrollment_period.name} ({app.enrollment_period.year}
              )
            </p>
          )}
        </div>
        <Link
          href="/admin/enrollment/applications"
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          ← Back to Queue
        </Link>
      </div>

      {/* Admin notes / rejection / change request banners */}
      {app.rejection_reason && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm">
          <span className="font-medium text-red-800">Rejection Reason:</span>{" "}
          <span className="text-red-700">{app.rejection_reason}</span>
        </div>
      )}
      {app.change_request_notes && (
        <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm">
          <span className="font-medium text-amber-800">Changes Requested:</span>{" "}
          <span className="text-amber-700">{app.change_request_notes}</span>
        </div>
      )}
      {app.admin_notes && (
        <div className="rounded-lg bg-gray-50 px-4 py-3 text-sm">
          <span className="font-medium text-gray-700">Admin Notes:</span>{" "}
          <span className="text-gray-600">{app.admin_notes}</span>
        </div>
      )}

      {/* Approval result banner */}
      {app.status === "approved" && app.created_student_id && (
        <div className="rounded-lg bg-green-50 px-4 py-3 text-sm">
          <span className="font-medium text-green-800">
            Approved and enrolled.
          </span>{" "}
          <Link
            href={`/students/${app.created_student_id}`}
            className="font-medium text-green-700 underline hover:text-green-900"
          >
            View student record →
          </Link>
        </div>
      )}

      {/* ── Child Information ─────────────────────────────── */}
      <SectionCard title="Child Information">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3 lg:grid-cols-4">
          <Field label="First Name" value={app.child_first_name} />
          <Field label="Last Name" value={app.child_last_name} />
          <Field label="Preferred Name" value={app.child_preferred_name} />
          <Field
            label="Date of Birth"
            value={formatDate(app.child_date_of_birth)}
          />
          <Field label="Gender" value={app.child_gender} />
          <Field label="Nationality" value={app.child_nationality} />
          <Field
            label="Languages"
            value={
              app.child_languages && app.child_languages.length > 0
                ? (app.child_languages as string[]).join(", ")
                : null
            }
          />
          <Field label="Previous School" value={app.child_previous_school} />
          <Field
            label="Requested Program"
            value={app.requested_program?.replace(/_/g, " ")}
          />
          <Field
            label="Requested Start"
            value={formatDate(app.requested_start_date)}
          />
          {app.existing_student && (
            <Field
              label="Re-enrollment For"
              value={`${app.existing_student.first_name} ${app.existing_student.last_name}`}
            />
          )}
        </dl>
      </SectionCard>

      {/* ── Guardians ─────────────────────────────────────── */}
      <SectionCard title={`Guardians (${guardians.length})`}>
        {guardians.length === 0 ? (
          <p className="text-sm text-gray-400">No guardians listed.</p>
        ) : (
          <div className="space-y-4">
            {guardians.map((g, i) => (
              <div
                key={i}
                className="rounded-lg border border-gray-100 bg-gray-50 p-4"
              >
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">
                    {g.first_name} {g.last_name}
                  </span>
                  {g.is_primary && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                      Primary
                    </span>
                  )}
                  <span className="text-xs text-gray-500">
                    {g.relationship}
                  </span>
                </div>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
                  <Field label="Email" value={g.email} />
                  <Field label="Phone" value={g.phone} />
                  <Field label="Address" value={g.address} />
                  <Field
                    label="Emergency Contact"
                    value={g.is_emergency_contact ? "Yes" : "No"}
                  />
                  <Field
                    label="Pickup Authorized"
                    value={g.pickup_authorized ? "Yes" : "No"}
                  />
                </dl>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* ── Medical Conditions ────────────────────────────── */}
      <SectionCard title={`Medical Conditions (${medicalConditions.length})`}>
        {medicalConditions.length === 0 ? (
          <p className="text-sm text-gray-400">
            No medical conditions reported.
          </p>
        ) : (
          <div className="space-y-3">
            {medicalConditions.map((mc, i) => (
              <div
                key={i}
                className="rounded-lg border border-gray-100 bg-gray-50 p-4"
              >
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">
                    {mc.condition_name}
                  </span>
                  <SeverityBadge severity={mc.severity} />
                  <span className="text-xs text-gray-500">
                    ({mc.condition_type})
                  </span>
                </div>
                <dl className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
                  {mc.description && (
                    <Field label="Description" value={mc.description} />
                  )}
                  {mc.action_plan && (
                    <Field label="Action Plan" value={mc.action_plan} />
                  )}
                  {mc.requires_medication && (
                    <>
                      <Field label="Medication" value={mc.medication_name} />
                      <Field
                        label="Medication Location"
                        value={mc.medication_location}
                      />
                    </>
                  )}
                </dl>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* ── Emergency Contacts ────────────────────────────── */}
      <SectionCard title={`Emergency Contacts (${emergencyContacts.length})`}>
        {emergencyContacts.length === 0 ? (
          <p className="text-sm text-gray-400">No emergency contacts listed.</p>
        ) : (
          <div className="space-y-3">
            {emergencyContacts.map((ec, i) => (
              <div
                key={i}
                className="flex items-start gap-4 rounded-lg border border-gray-100 bg-gray-50 p-4"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-sm font-bold text-amber-700">
                  {ec.priority_order}
                </div>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
                  <Field label="Name" value={ec.name} />
                  <Field label="Relationship" value={ec.relationship} />
                  <Field label="Phone (Primary)" value={ec.phone_primary} />
                  <Field label="Phone (Secondary)" value={ec.phone_secondary} />
                  <Field label="Email" value={ec.email} />
                </dl>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* ── Custody Restrictions ──────────────────────────── */}
      {custodyRestrictions.length > 0 && (
        <SectionCard
          title={`Custody Restrictions (${custodyRestrictions.length})`}
        >
          <div className="space-y-3">
            {custodyRestrictions.map((cr, i) => (
              <div
                key={i}
                className="rounded-lg border border-red-100 bg-red-50 p-4"
              >
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-sm font-medium text-red-900">
                    {cr.restricted_person_name}
                  </span>
                  <span className="rounded-full bg-red-200 px-2 py-0.5 text-xs font-medium text-red-800">
                    {cr.restriction_type.replace(/_/g, " ")}
                  </span>
                </div>
                <dl className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
                  {cr.court_order_reference && (
                    <Field
                      label="Court Order Ref"
                      value={cr.court_order_reference}
                    />
                  )}
                  {cr.notes && <Field label="Notes" value={cr.notes} />}
                </dl>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* ── Consents ──────────────────────────────────────── */}
      <SectionCard title="Consents">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
          <Field
            label="Media Consent"
            value={app.media_consent ? "✓ Granted" : "✗ Declined"}
          />
          <Field
            label="Directory Consent"
            value={app.directory_consent ? "✓ Granted" : "✗ Declined"}
          />
          <Field
            label="Terms Accepted"
            value={
              app.terms_accepted
                ? `✓ ${formatDate(app.terms_accepted_at)}`
                : "✗ Not accepted"
            }
          />
          <Field
            label="Privacy Accepted"
            value={app.privacy_accepted ? "✓ Accepted" : "✗ Not accepted"}
          />
        </dl>
      </SectionCard>

      {/* ── Documents ─────────────────────────────────────── */}
      <DocumentSection documents={documents} />

      {/* ── Custom Responses ──────────────────────────────── */}
      {app.custom_responses &&
        Object.keys(app.custom_responses as Record<string, unknown>).length >
          0 && (
          <SectionCard title="Custom Questions">
            <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
              {Object.entries(
                app.custom_responses as Record<string, unknown>,
              ).map(([key, value]) => (
                <Field
                  key={key}
                  label={key.replace(/_/g, " ")}
                  value={String(value)}
                />
              ))}
            </dl>
          </SectionCard>
        )}

      {/* ── Review Info ───────────────────────────────────── */}
      {app.reviewer && (
        <SectionCard title="Review History">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
            <Field
              label="Reviewed By"
              value={`${app.reviewer.first_name ?? ""} ${app.reviewer.last_name ?? ""}`}
            />
            <Field label="Reviewed At" value={formatDate(app.reviewed_at)} />
          </dl>
        </SectionCard>
      )}

      {/* ── Action Buttons ────────────────────────────────── */}
      {isActionable && (
        <ApprovalActions applicationId={app.id} currentStatus={app.status} />
      )}
    </div>
  );
}
