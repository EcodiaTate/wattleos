// src/app/(app)/admin/enrollment/new/page.tsx
//
// ============================================================
// WattleOS V2 - Create Enrollment Period Page (Module 10)
// ============================================================
// Thin server wrapper that renders the period form in create mode.
// ============================================================

import { EnrollmentPeriodForm } from "../enrollment-period-form";

export const metadata = {
  title: "Create Enrollment Period - WattleOS",
};

export default function CreateEnrollmentPeriodPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Create Enrollment Period
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Configure when the school accepts new applications.
        </p>
      </div>
      <EnrollmentPeriodForm />
    </div>
  );
}
