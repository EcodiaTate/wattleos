// src/app/(app)/portal/re-enroll/[application_id]/page.tsx
//
// ============================================================
// WattleOS V2 - Re-enrollment Form (Parent Portal, Module 10)
// ============================================================
// Route: /portal/re-enroll/[application_id]
// Authenticated - pre-filled form for returning families.
// The application was created by admin (re-enrollment period),
// pre-populated with current student data. Parent reviews,
// updates what's changed, and submits.
//
// WHY pre-filled: For re-enrollment, 90% of data is unchanged.
// Parents only need to update new medical info, changed phone
// numbers, or new emergency contacts. Don't make them re-enter
// everything.
// ============================================================

import { getApplicationDetails } from "@/lib/actions/enroll";
import { getTenantContext } from "@/lib/auth/tenant-context";
import { redirect } from "next/navigation";
import { ReEnrollmentForm } from "./re-enrollment-form";

export const metadata = {
  title: "Re-enrollment - WattleOS",
};

interface ReEnrollPageProps {
  params: Promise<{ application_id: string }>;
}

export default async function ReEnrollPage({ params }: ReEnrollPageProps) {
  const { application_id } = await params;
  const ctx = await getTenantContext();
  if (!ctx) redirect("/login");

  const result = await getApplicationDetails(application_id);

  if (result.error || !result.data) {
    return (
      <div className="py-8 text-center">
        <h1 className="text-xl font-bold text-foreground">
          Application Not Found
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          We couldn&apos;t find this re-enrollment application. It may have been
          removed or you may not have access.
        </p>
      </div>
    );
  }

  const app = result.data;

  // Ensure this belongs to the current user
  const userEmail = ctx.user?.email?.toLowerCase();
  if (userEmail && app.submitted_by_email.toLowerCase() !== userEmail) {
    return (
      <div className="py-8 text-center">
        <h1 className="text-xl font-bold text-foreground">Access Denied</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This re-enrollment form is not associated with your account.
        </p>
      </div>
    );
  }

  // Already submitted?
  if (app.status !== "draft" && app.status !== "changes_requested") {
    return (
      <div className="py-8 text-center">
        <h1 className="text-xl font-bold text-foreground">Already Submitted</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This re-enrollment application has already been submitted with status:{" "}
          <span className="font-medium capitalize">
            {app.status.replace(/_/g, " ")}
          </span>
          .
        </p>
        <a
          href="/portal/applications"
          className="mt-4 inline-block rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-background hover:bg-primary"
        >
          View My Applications
        </a>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">
          Re-enrollment: {app.child_first_name} {app.child_last_name}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review your child&apos;s information below. Update anything
          that&apos;s changed, then confirm to submit.
        </p>
        {app.status === "changes_requested" && app.change_request_notes && (
          <div className="mt-3 rounded-lg border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary">
            <span className="font-medium">Changes requested: </span>
            {app.change_request_notes}
          </div>
        )}
      </div>

      <ReEnrollmentForm application={app} />
    </div>
  );
}
