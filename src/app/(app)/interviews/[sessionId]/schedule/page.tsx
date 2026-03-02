// src/app/(app)/interviews/[sessionId]/schedule/page.tsx
// Staff: their own schedule for a given session

import { redirect, notFound } from "next/navigation";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { getMyInterviewSchedule } from "@/lib/actions/interviews";
import { StaffScheduleClient } from "@/components/domain/interviews/staff-schedule-client";

interface Props {
  params: Promise<{ sessionId: string }>;
}

export default async function StaffSchedulePage({ params }: Props) {
  const { sessionId } = await params;
  const context = await getTenantContext();
  if (!context) redirect("/auth/login");

  const canView = hasPermission(context, Permissions.VIEW_INTERVIEW_SCHEDULE);
  if (!canView) redirect("/interviews");

  const result = await getMyInterviewSchedule(sessionId);
  if (result.error || !result.data) notFound();

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-tab-bar">
      <div className="mb-6">
        <h1 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>
          My Interview Schedule
        </h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--muted-foreground)" }}>
          {result.data.session.title}
        </p>
      </div>
      <StaffScheduleClient schedule={result.data} />
    </div>
  );
}
