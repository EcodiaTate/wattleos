import { redirect } from "next/navigation";
import {
  getTenantContext,
  hasPermission,
} from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import {
  getDailyCareLogByStudentDate,
  listEligibleChildren,
} from "@/lib/actions/daily-care";
import { StudentDayViewClient } from "@/components/domain/daily-care-log/student-day-view-client";

export const metadata = { title: "Child Daily Care - WattleOS" };

interface Props {
  params: Promise<{ studentId: string }>;
}

export default async function StudentDailyCareLogPage({ params }: Props) {
  const { studentId } = await params;
  const context = await getTenantContext();

  const canView =
    hasPermission(context, Permissions.VIEW_DAILY_CARE_LOGS) ||
    hasPermission(context, Permissions.MANAGE_DAILY_CARE_LOGS);
  if (!canView) redirect("/dashboard");

  const canManage = hasPermission(
    context,
    Permissions.MANAGE_DAILY_CARE_LOGS,
  );

  const todayStr = new Date().toISOString().split("T")[0];

  const [logResult, childrenResult] = await Promise.all([
    getDailyCareLogByStudentDate(studentId, todayStr),
    listEligibleChildren(),
  ]);

  if (logResult.error) {
    return (
      <div className="p-4 sm:p-6">
        <p style={{ color: "var(--destructive)" }}>
          {logResult.error.message}
        </p>
      </div>
    );
  }

  // Resolve the student name from the log data or from the eligible children list
  let studentName = "Unknown Child";
  const log = logResult.data ?? null;

  if (log !== null && log.student) {
    const preferred = log.student.preferred_name;
    const firstName = preferred ?? log.student.first_name;
    studentName = `${firstName} ${log.student.last_name}`;
  } else if (childrenResult.data) {
    const child = childrenResult.data.find((c) => c.id === studentId);
    if (child) {
      const preferred = child.preferred_name;
      const firstName = preferred ?? child.first_name;
      studentName = `${firstName} ${child.last_name}`;
    }
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <StudentDayViewClient
        log={log}
        studentId={studentId}
        studentName={studentName}
        logDate={todayStr}
        canManage={canManage}
      />
    </div>
  );
}
