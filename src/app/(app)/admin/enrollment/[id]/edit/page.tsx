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
    <div className="content-narrow animate-fade-in space-y-[var(--density-section-gap)]">
      <div className="border-b border-[var(--border)] pb-[var(--density-md)]">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
          Edit Enrollment Period
        </h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Update settings for &ldquo;{period.name}&rdquo;.
        </p>
      </div>
      
      <div className="rounded-[var(--radius)] bg-[var(--card)] p-[var(--density-card-padding)] shadow-[var(--shadow-sm)] border border-[var(--border)]">
        <EnrollmentPeriodForm initialData={period} />
      </div>
    </div>
  );
}