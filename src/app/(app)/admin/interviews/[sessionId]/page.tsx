// src/app/(app)/admin/interviews/[sessionId]/page.tsx
// Admin: session detail dashboard

import { redirect, notFound } from "next/navigation";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { getInterviewSessionDashboard } from "@/lib/actions/interviews";
import { SessionDashboardClient } from "@/components/domain/interviews/session-dashboard-client";

interface Props {
  params: Promise<{ sessionId: string }>;
}

export default async function InterviewSessionPage({ params }: Props) {
  const { sessionId } = await params;
  const context = await getTenantContext();
  if (!context) redirect("/auth/login");

  const canView = hasPermission(context, Permissions.VIEW_INTERVIEW_SCHEDULE);
  if (!canView) redirect("/dashboard");

  const result = await getInterviewSessionDashboard(sessionId);
  if (result.error || !result.data) notFound();

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 pb-tab-bar">
      <SessionDashboardClient dashboard={result.data} />
    </div>
  );
}
