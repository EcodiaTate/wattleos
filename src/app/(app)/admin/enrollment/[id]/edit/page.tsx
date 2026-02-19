// src/app/(app)/admin/enrollment/[id]/edit/page.tsx
//
// ============================================================
// WattleOS V2 - Edit Enrollment Period Page (Module 10)
// ============================================================
// Fetches the existing period data and passes it to the form
// component in edit mode. Validates the period exists.
// ============================================================

import { getEnrollmentPeriod } from "@/lib/actions/enroll";
import { notFound } from "next/navigation";
import { EnrollmentPeriodForm } from "../../enrollment-period-form";

export const metadata = {
  title: "Edit Enrollment Period - WattleOS",
};

interface EditEnrollmentPeriodPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditEnrollmentPeriodPage({
  params,
}: EditEnrollmentPeriodPageProps) {
  const { id } = await params;
  const result = await getEnrollmentPeriod(id);

  if (result.error || !result.data) {
    notFound();
  }

  const period = result.data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Edit Enrollment Period
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Update settings for &ldquo;{period.name}&rdquo;.
        </p>
      </div>
      <EnrollmentPeriodForm initialData={period} />
    </div>
  );
}
