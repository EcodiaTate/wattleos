// src/app/(app)/admin/interviews/[sessionId]/edit/page.tsx
// Admin: edit an existing session

import { redirect, notFound } from "next/navigation";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { getInterviewSessionDashboard } from "@/lib/actions/interviews";
import { SessionForm } from "@/components/domain/interviews/session-form";

interface Props {
  params: Promise<{ sessionId: string }>;
}

export default async function EditInterviewSessionPage({ params }: Props) {
  const { sessionId } = await params;
  const context = await getTenantContext();
  if (!context) redirect("/auth/login");

  const canManage = hasPermission(context, Permissions.MANAGE_INTERVIEW_SESSIONS);
  if (!canManage) redirect(`/admin/interviews/${sessionId}`);

  const result = await getInterviewSessionDashboard(sessionId);
  if (result.error || !result.data) notFound();

  return (
    <div className="max-w-xl mx-auto px-4 py-6 pb-tab-bar">
      <div className="mb-6">
        <h1 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>
          Edit Session
        </h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--muted-foreground)" }}>
          {result.data.session.title}
        </p>
      </div>
      <SessionForm session={result.data.session} />
    </div>
  );
}
