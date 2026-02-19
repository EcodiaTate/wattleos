import { PortfolioTimeline } from "@/components/domain/mastery/portfolio-timeline";
import { listCurriculumInstances } from "@/lib/actions/curriculum";
import {
  getStudentMasterySummary,
  getStudentPortfolioTimeline,
} from "@/lib/actions/mastery";
import { getStudent } from "@/lib/actions/students";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import {
  MASTERY_STATUS_CONFIG,
  MASTERY_STATUS_ORDER,
  masteryPercentage,
} from "@/lib/utils/mastery-status";
import Link from "next/link";
import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ studentId: string }>;
}

export default async function StudentPortfolioPage({ params }: PageProps) {
  const { studentId } = await params;
  const context = await getTenantContext();
  const canViewStudents = hasPermission(context, Permissions.VIEW_STUDENTS);

  // Get the student
  const studentResult = await getStudent(studentId);
  if (!studentResult.data) {
    redirect("/pedagogy/mastery");
  }
  const student = studentResult.data;
  const studentName = `${student.preferred_name ?? student.first_name} ${student.last_name}`;

  // Get curriculum instances for summary
  const instancesResult = await listCurriculumInstances();
  const instances = instancesResult.data ?? [];

  // Get mastery summary for each instance
  const summaries = await Promise.all(
    instances.map(async (inst) => {
      const result = await getStudentMasterySummary(studentId, inst.id);
      return {
        instance: inst,
        summary: result.data ?? {
          total: 0,
          not_started: 0,
          presented: 0,
          practicing: 0,
          mastered: 0,
        },
      };
    }),
  );

  // Get portfolio timeline
  const timelineResult = await getStudentPortfolioTimeline(studentId, 100);
  const timelineItems = timelineResult.data ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/pedagogy/mastery"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Mastery
            </Link>
            <span className="text-sm text-muted-foreground">/</span>
            <h1 className="text-2xl font-bold text-foreground">
              {studentName}&apos;s Portfolio
            </h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            A complete view of {student.preferred_name ?? student.first_name}
            &apos;s learning journey
          </p>
        </div>
        {canViewStudents && (
          <Link
            href={`/pedagogy/mastery?student=${studentId}`}
            className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-foreground hover:bg-background"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25a2.25 2.25 0 0 1-2.25-2.25v-2.25Z"
              />
            </svg>
            Mastery Grid
          </Link>
        )}
      </div>

      {/* Student info card */}
      <div className="rounded-lg borderborder-border bg-background p-[var(--density-card-padding)]">
        <div className="flex items-center gap-[var(--density-card-padding)]">
          {student.photo_url ? (
            <img
              src={student.photo_url}
              alt={studentName}
              className="h-16 w-16 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-xl font-bold text-amber-700">
              {student.first_name.charAt(0)}
              {student.last_name.charAt(0)}
            </div>
          )}
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              {studentName}
            </h2>
            {student.dob && (
              <p className="text-sm text-muted-foreground">
                Born{" "}
                {new Date(student.dob).toLocaleDateString("en-AU", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            )}
            <span
              className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                student.enrollment_status === "active"
                  ? "bg-green-100 text-green-700"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {student.enrollment_status.charAt(0).toUpperCase() +
                student.enrollment_status.slice(1)}
            </span>
          </div>
        </div>
      </div>

      {/* Mastery summaries per curriculum */}
      {summaries.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">
            Curriculum Progress
          </h2>
          <div className="grid gap-[var(--density-card-padding)] sm:grid-cols-2">
            {summaries.map(({ instance, summary }) => {
              const pct = masteryPercentage(summary);
              return (
                <div
                  key={instance.id}
                  className="rounded-lg borderborder-border bg-background p-[var(--density-card-padding)]"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-foreground">
                      {instance.name}
                    </h3>
                    <span className="text-lg font-bold text-primary">
                      {pct}%
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="mb-3 flex h-2.5 overflow-hidden rounded-full bg-muted">
                    {summary.total > 0 && (
                      <>
                        <div
                          className="bg-green-400 transition-all"
                          style={{
                            width: `${(summary.mastered / summary.total) * 100}%`,
                          }}
                        />
                        <div
                          className="bg-primary transition-all"
                          style={{
                            width: `${(summary.practicing / summary.total) * 100}%`,
                          }}
                        />
                        <div
                          className="bg-blue-400 transition-all"
                          style={{
                            width: `${(summary.presented / summary.total) * 100}%`,
                          }}
                        />
                      </>
                    )}
                  </div>

                  {/* Counts */}
                  <div className="flex flex-wrap gap-3">
                    {MASTERY_STATUS_ORDER.map((status) => {
                      const config = MASTERY_STATUS_CONFIG[status];
                      return (
                        <div key={status} className="flex items-center gap-1">
                          <span
                            className={`inline-block h-2 w-2 rounded-full ${config.dotColor}`}
                          />
                          <span className="text-[10px] text-muted-foreground">
                            {config.shortLabel}:{" "}
                            <span className="font-semibold">
                              {summary[status]}
                            </span>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">
          Learning Journey
        </h2>
        <PortfolioTimeline items={timelineItems} studentName={studentName} />
      </div>
    </div>
  );
}
