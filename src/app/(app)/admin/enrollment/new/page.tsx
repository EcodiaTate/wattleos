// src/app/(app)/admin/enrollment/new/page.tsx

import { EnrollmentPeriodForm } from "../enrollment-period-form";

export const metadata = {
  title: "Create Enrollment Period - WattleOS",
};

export default function CreateEnrollmentPeriodPage() {
  return (
    <div className="content-narrow animate-fade-in space-y-[var(--density-section-gap)]">
      <div className="border-b border-[var(--border)] pb-[var(--density-md)]">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
          Create Enrollment Period
        </h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Configure when the school accepts new applications.
        </p>
      </div>
      
      <div className="rounded-[var(--radius)] bg-[var(--card)] p-[var(--density-card-padding)] shadow-[var(--shadow-sm)] border border-[var(--border)]">
        <EnrollmentPeriodForm />
      </div>
    </div>
  );
}