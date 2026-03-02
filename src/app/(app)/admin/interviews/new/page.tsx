// src/app/(app)/admin/interviews/new/page.tsx
// Admin: create a new interview session

import { redirect } from "next/navigation";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { SessionForm } from "@/components/domain/interviews/session-form";

export default async function NewInterviewSessionPage() {
  const context = await getTenantContext();
  if (!context) redirect("/auth/login");

  const canManage = hasPermission(context, Permissions.MANAGE_INTERVIEW_SESSIONS);
  if (!canManage) redirect("/admin/interviews");

  return (
    <div className="max-w-xl mx-auto px-4 py-6 pb-tab-bar">
      <div className="mb-6">
        <h1 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>
          New Interview Session
        </h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--muted-foreground)" }}>
          Set up a booking period for parent-teacher interviews.
        </p>
      </div>
      <SessionForm />
    </div>
  );
}
