// src/app/(app)/students/[id]/page.tsx
//
// ============================================================
// WattleOS V2 - Student Detail Page
// ============================================================
// Server Component. Fetches all student data and renders a
// comprehensive profile view with sections for medical,
// guardians, enrollments, safety data, and pickup authorizations.
//
// PART A FIX: Guardian display now handles null user (parent
// hasn't created account yet). Falls back to guardian.first_name
// and guardian.last_name which are populated during enrollment
// approval. Shows "Invited" vs "Linked" account status.
//
// PART B: Added "Demographics & Compliance" card showing
// nationality, languages, indigenous status, address, government
// identifiers, and other ACARA/ISQ reporting fields.
// ============================================================

import { PickupAuthorizationSection } from "@/components/domain/attendance/pickup-authorization-section";
import { getStudent } from "@/lib/actions/students";
import {
  calculateAge,
  enrollmentStatusColor,
  formatDate,
  formatStudentName,
  severityColor,
} from "@/lib/utils";
import type { GuardianWithUser, ResidentialAddress } from "@/types/domain";
import Link from "next/link";
import { notFound } from "next/navigation";

interface StudentDetailPageProps {
  params: Promise<{ id: string }>;
}

// ============================================================
// Helper: resolve display name from guardian or linked user
// ============================================================
function guardianDisplayName(g: GuardianWithUser): string {
  if (g.user) {
    return [g.user.first_name, g.user.last_name].filter(Boolean).join(" ");
  }
  return [g.first_name, g.last_name].filter(Boolean).join(" ") || "Unknown";
}

function guardianDisplayEmail(g: GuardianWithUser): string | null {
  return g.user?.email ?? g.email ?? null;
}

// ============================================================
// Helper: format address JSONB into readable string
// ============================================================
function formatAddress(address: ResidentialAddress | null): string | null {
  if (!address) return null;
  const parts = [
    address.line1,
    address.line2,
    address.suburb,
    address.state && address.postcode
      ? `${address.state} ${address.postcode}`
      : address.state || address.postcode,
    address.country,
  ].filter(Boolean);
  return parts.join(", ");
}

// ============================================================
// Helper: human-readable label for indigenous status
// ============================================================
function indigenousStatusLabel(status: string): string {
  const map: Record<string, string> = {
    aboriginal: "Aboriginal",
    torres_strait_islander: "Torres Strait Islander",
    both: "Aboriginal and Torres Strait Islander",
    neither: "Neither",
    not_stated: "Not stated",
  };
  return map[status] ?? status;
}

// ============================================================
// Helper: human-readable label for language background
// ============================================================
function languageBackgroundLabel(bg: string): string {
  const map: Record<string, string> = {
    english_only: "English only",
    lbote: "Language background other than English (LBOTE)",
    not_stated: "Not stated",
  };
  return map[bg] ?? bg;
}

// ============================================================
// Sub-component: single detail row for Demographics card
// ============================================================
function DetailRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <dt className="text-xs font-medium text-muted-foreground whitespace-nowrap">{label}</dt>
      <dd className="text-sm text-foreground text-right">{value}</dd>
    </div>
  );
}

export default async function StudentDetailPage({
  params,
}: StudentDetailPageProps) {
  const { id } = await params;
  const result = await getStudent(id);

  if (result.error || !result.data) {
    notFound();
  }

  const student = result.data;
  const displayName = formatStudentName(
    student.first_name,
    student.last_name,
    student.preferred_name,
  );
  const age = calculateAge(student.dob);

  // Check for critical medical alerts
  const criticalConditions = student.medical_conditions.filter(
    (c) => c.severity === "life_threatening" || c.severity === "severe",
  );

  // Pre-compute compliance display values
  const formattedAddress = formatAddress(student.residential_address);
  const languagesDisplay = student.languages?.join(", ") ?? null;

  // Determine if there's any demographics data to show
  const hasDemographics =
    student.nationality ||
    languagesDisplay ||
    student.previous_school ||
    student.indigenous_status ||
    student.language_background ||
    student.country_of_birth ||
    student.home_language ||
    student.visa_subclass ||
    formattedAddress ||
    student.religion ||
    student.crn ||
    student.usi ||
    student.medicare_number;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/students" className="hover:text-foreground">
          Students
        </Link>
        <span>/</span>
        <span className="text-foreground">{displayName}</span>
      </nav>

      {/* Critical Medical Alert Banner */}
      {criticalConditions.length > 0 && (
        <div className="rounded-md border border-red-200 bg-red-50 p-[var(--density-card-padding)]">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-red-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.168 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Medical Alert
              </h3>
              <div className="mt-1 text-sm text-red-700">
                {criticalConditions.map((c) => (
                  <p key={c.id}>
                    <strong>{c.condition_name}</strong> (
                    {c.severity.replace("_", " ")})
                    {c.requires_medication &&
                      ` - Requires medication: ${c.medication_name}`}
                    {c.medication_location && ` (${c.medication_location})`}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Profile Header */}
      <div className="overflow-hidden rounded-lg border border-border bg-background shadow-sm">
        <div className="px-6 py-5">
          <div className="flex items-start gap-[var(--density-card-padding)]">
            {/* Avatar */}
            <div className="flex-shrink-0">
              {student.photo_url ? (
                <img
                  className="h-20 w-20 rounded-full object-cover"
                  src={student.photo_url}
                  alt={displayName}
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-indigo-100 text-2xl font-semibold text-indigo-600">
                  {student.first_name[0]}
                  {student.last_name[0]}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-semibold text-foreground">
                  {displayName}
                </h1>
                <span
                  className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${enrollmentStatusColor(student.enrollment_status)}`}
                >
                  {student.enrollment_status}
                </span>
              </div>
              {student.preferred_name && (
                <p className="text-sm text-muted-foreground">
                  Legal name: {student.first_name} {student.last_name}
                </p>
              )}
              <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
                {student.dob && (
                  <span>
                    Born: {formatDate(student.dob)} ({age} yrs)
                  </span>
                )}
                {student.gender && <span>Gender: {student.gender}</span>}
              </div>
              {student.notes && (
                <p className="mt-3 text-sm text-muted-foreground">
                  {student.notes}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-shrink-0 gap-2">
              <Link
                href={`/students/${id}/edit`}
                className="rounded-md border border-gray-300 bg-background px-4 py-2 text-sm font-medium text-foreground shadow-sm hover:bg-background"
              >
                Edit
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Content Sections */}
      <div className="grid grid-cols-1 gap-[var(--density-card-padding)] lg:grid-cols-2">
        {/* Demographics & Compliance */}
        <section className="rounded-lg border border-border bg-background shadow-sm">
          <div className="border-b border-border px-6 py-4">
            <h2 className="text-lg font-medium text-foreground">
              Demographics &amp; Compliance
            </h2>
          </div>
          <div className="px-6 py-4">
            {!hasDemographics ? (
              <p className="text-sm text-muted-foreground">
                No demographic or compliance data recorded yet.
              </p>
            ) : (
              <dl className="divide-y divide-gray-100">
                {/* Background */}
                <DetailRow label="Nationality" value={student.nationality} />
                <DetailRow label="Country of Birth" value={student.country_of_birth} />
                <DetailRow label="Languages Spoken" value={languagesDisplay} />
                <DetailRow label="Home Language" value={student.home_language} />
                <DetailRow
                  label="Indigenous Status"
                  value={student.indigenous_status ? indigenousStatusLabel(student.indigenous_status) : null}
                />
                <DetailRow
                  label="Language Background"
                  value={student.language_background ? languageBackgroundLabel(student.language_background) : null}
                />
                <DetailRow label="Religion" value={student.religion} />
                <DetailRow label="Previous School" value={student.previous_school} />
                <DetailRow label="Visa Subclass" value={student.visa_subclass} />

                {/* Address */}
                <DetailRow label="Residential Address" value={formattedAddress} />

                {/* Government identifiers */}
                <DetailRow label="CRN" value={student.crn} />
                <DetailRow label="USI" value={student.usi} />
                <DetailRow label="Medicare Number" value={student.medicare_number} />
              </dl>
            )}
          </div>
        </section>

        {/* Enrollments */}
        <section className="rounded-lg border border-border bg-background shadow-sm">
          <div className="border-b border-border px-6 py-4">
            <h2 className="text-lg font-medium text-foreground">Enrollments</h2>
          </div>
          <div className="px-6 py-4">
            {student.enrollments.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No enrollment records.
              </p>
            ) : (
              <div className="space-y-3">
                {student.enrollments.map((enrollment) => (
                  <div
                    key={enrollment.id}
                    className="flex items-center justify-between rounded-md border border-gray-100 p-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {enrollment.class?.name ?? "Unknown class"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(enrollment.start_date)}
                        {enrollment.end_date
                          ? ` - ${formatDate(enrollment.end_date)}`
                          : " - Present"}
                      </p>
                    </div>
                    <span
                      className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${enrollmentStatusColor(enrollment.status as string)}`}
                    >
                      {enrollment.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Guardians */}
        <section className="rounded-lg border border-border bg-background shadow-sm">
          <div className="border-b border-border px-6 py-4">
            <h2 className="text-lg font-medium text-foreground">
              Guardians &amp; Parents
            </h2>
          </div>
          <div className="px-6 py-4">
            {student.guardians.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No guardians linked.
              </p>
            ) : (
              <div className="space-y-3">
                {student.guardians.map((guardian) => (
                  <div
                    key={guardian.id}
                    className="flex items-center justify-between rounded-md border border-gray-100 p-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {guardianDisplayName(guardian)}
                        {guardian.is_primary && (
                          <span className="ml-2 text-xs font-normal text-indigo-600">
                            Primary
                          </span>
                        )}
                        {/* Account status */}
                        {guardian.user_id ? (
                          <span className="ml-2 text-xs font-normal text-green-600">
                            ✓ Account linked
                          </span>
                        ) : (
                          <span className="ml-2 text-xs font-normal text-amber-600">
                            Invited
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {guardian.relationship}
                        {guardian.phone && ` · ${guardian.phone}`}
                        {guardianDisplayEmail(guardian) &&
                          ` · ${guardianDisplayEmail(guardian)}`}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      {guardian.pickup_authorized && (
                        <span className="rounded bg-green-50 px-1.5 py-0.5 text-xs text-green-700">
                          Pickup
                        </span>
                      )}
                      {guardian.media_consent && (
                        <span className="rounded bg-blue-50 px-1.5 py-0.5 text-xs text-blue-700">
                          Media
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Medical Conditions */}
        <section className="rounded-lg border border-border bg-background shadow-sm">
          <div className="border-b border-border px-6 py-4">
            <h2 className="text-lg font-medium text-foreground">
              Medical Conditions
            </h2>
          </div>
          <div className="px-6 py-4">
            {student.medical_conditions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No medical conditions recorded.
              </p>
            ) : (
              <div className="space-y-3">
                {student.medical_conditions.map((condition) => (
                  <div
                    key={condition.id}
                    className="rounded-md border border-gray-100 p-3"
                  >
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground">
                        {condition.condition_name}
                      </p>
                      <span
                        className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${severityColor(condition.severity)}`}
                      >
                        {condition.severity.replace("_", " ")}
                      </span>
                    </div>
                    {condition.description && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {condition.description}
                      </p>
                    )}
                    {condition.requires_medication && (
                      <p className="mt-1 text-xs text-amber-700">
                        Medication: {condition.medication_name}
                        {condition.medication_location &&
                          ` (${condition.medication_location})`}
                      </p>
                    )}
                    {condition.action_plan && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Action plan: {condition.action_plan}
                      </p>
                    )}
                    {condition.expiry_date && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Review by: {formatDate(condition.expiry_date)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Emergency Contacts */}
        <section className="rounded-lg border border-border bg-background shadow-sm">
          <div className="border-b border-border px-6 py-4">
            <h2 className="text-lg font-medium text-foreground">
              Emergency Contacts
            </h2>
          </div>
          <div className="px-6 py-4">
            {student.emergency_contacts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No emergency contacts recorded.
              </p>
            ) : (
              <div className="space-y-3">
                {student.emergency_contacts.map((contact, index) => (
                  <div
                    key={contact.id}
                    className="flex items-center justify-between rounded-md border border-gray-100 p-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-gray-200 text-xs text-muted-foreground">
                          {index + 1}
                        </span>
                        {contact.name}
                      </p>
                      <p className="ml-7 text-xs text-muted-foreground">
                        {contact.relationship} · {contact.phone_primary}
                        {contact.phone_secondary &&
                          ` / ${contact.phone_secondary}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Pickup Authorizations */}
        <PickupAuthorizationSection studentId={id} />

        {/* Custody Restrictions */}
        {student.custody_restrictions.length > 0 && (
          <section className="rounded-lg border-2 border-red-200 bg-background shadow-sm lg:col-span-2">
            <div className="border-b border-red-200 bg-red-50 px-6 py-4">
              <h2 className="text-lg font-medium text-red-900">
                Custody Restrictions
              </h2>
            </div>
            <div className="px-6 py-4">
              <div className="space-y-3">
                {student.custody_restrictions.map((restriction) => (
                  <div
                    key={restriction.id}
                    className="rounded-md border border-red-100 bg-red-50/50 p-3"
                  >
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-red-900">
                        {restriction.restricted_person_name}
                      </p>
                      <span className="inline-flex rounded-full border border-red-200 bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                        {restriction.restriction_type.replace(/_/g, " ")}
                      </span>
                    </div>
                    {restriction.court_order_reference && (
                      <p className="mt-1 text-xs text-red-700">
                        Court order: {restriction.court_order_reference}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-red-600">
                      Effective: {formatDate(restriction.effective_date)}
                      {restriction.expiry_date &&
                        ` - Expires: ${formatDate(restriction.expiry_date)}`}
                    </p>
                    {restriction.notes && (
                      <p className="mt-1 text-xs text-red-600">
                        {restriction.notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}