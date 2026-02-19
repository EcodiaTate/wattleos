// src/app/(app)/portal/applications/page.tsx
//
// ============================================================
// WattleOS V2 - My Applications (Parent Portal, Module 10)
// ============================================================
// Route: /portal/applications
// Authenticated - parent sees status of their enrollment
// applications. Fetches by the user's email address.
//
// WHY by email (not user ID): Applications are submitted
// before the parent has a WattleOS account. The linkage is
// email address, not user_id. Once they accept an invite,
// they see apps matching their email.
// ============================================================

import { getApplicationStatusByEmail } from "@/lib/actions/enroll";
import { getTenantContext } from "@/lib/auth/tenant-context";
import { redirect } from "next/navigation";
import { ApplicationStatusCard } from "./application-status-card";

export const metadata = {
  title: "My Applications - WattleOS",
};

export default async function ParentApplicationsPage() {
  const ctx = await getTenantContext();
  if (!ctx) redirect("/login");

  const email = ctx.user?.email;
  if (!email) {
    return (
      <div className="py-8 text-center">
        <h1 className="text-xl font-bold text-gray-900">No Email Found</h1>
        <p className="mt-2 text-sm text-gray-500">
          We couldn&apos;t determine your email address. Please contact the
          school for assistance.
        </p>
      </div>
    );
  }

  const result = await getApplicationStatusByEmail(ctx.tenantId, email);
  const applications = result.data ?? [];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Applications</h1>
        <p className="mt-1 text-sm text-gray-500">
          Track the status of your enrollment applications.
        </p>
      </div>

      {applications.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white px-6 py-12 text-center">
          <p className="text-sm text-gray-500">
            No enrollment applications found for{" "}
            <span className="font-medium">{email}</span>.
          </p>
          <p className="mt-1 text-xs text-gray-400">
            If you&apos;ve recently submitted an application, it may take a
            moment to appear.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {applications.map((app) => (
            <ApplicationStatusCard key={app.id} application={app} />
          ))}
        </div>
      )}
    </div>
  );
}
