// src/app/(app)/classes/[id]/page.tsx
import { ClassRosterActions } from "@/components/domain/sis/ClassRosterActions";
import { getClass, getClassRoster } from "@/lib/actions/classes";
import { getTenantContext } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { calculateAge, formatDate, formatStudentName } from "@/lib/utils";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, BookOpen, DoorOpen, Users, UserPlus, Edit3 } from "lucide-react";

interface ClassDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ClassDetailPage({ params }: ClassDetailPageProps) {
  const { id } = await params;
  const context = await getTenantContext();

  const [classResult, rosterResult] = await Promise.all([
    getClass(id),
    getClassRoster(id),
  ]);

  if (classResult.error || !classResult.data) notFound();

  const classData = classResult.data;
  const roster = rosterResult.data ?? [];
  const canManageEnrollment = context.permissions.includes(Permissions.MANAGE_ENROLLMENT);
  const canManageStudents = context.permissions.includes(Permissions.MANAGE_STUDENTS);

  return (
    <div className="space-y-[var(--density-section-gap)] animate-fade-in">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/classes" className="hover:text-primary transition-colors">Classes</Link>
        <ChevronRight className="h-3 w-3 opacity-50" />
        <span className="text-foreground font-medium">{classData.name}</span>
      </nav>

      {/* ── Class Header ─────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card p-[var(--density-card-padding)] shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground">
                {classData.name}
              </h1>
              <span
                className="status-badge"
                style={{
                  '--badge-bg': classData.is_active ? 'var(--attendance-present)' : 'var(--muted)',
                  '--badge-fg': classData.is_active ? 'var(--attendance-present-fg)' : 'var(--muted-foreground)',
                } as React.CSSProperties}
              >
                {classData.is_active ? "Active" : "Inactive"}
              </span>
            </div>

            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
              {classData.cycle_level && (
                <span className="flex items-center gap-1.5">
                  <BookOpen className="h-4 w-4 text-primary" />
                  Ages {classData.cycle_level}
                </span>
              )}
              {classData.room && (
                <span className="flex items-center gap-1.5">
                  <DoorOpen className="h-4 w-4 text-primary" />
                  {classData.room}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Users className="h-4 w-4 text-primary" />
                <span className="tabular-nums font-medium text-foreground">{roster.length}</span> student{roster.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>

          {(canManageEnrollment || canManageStudents) && (
            <Link
              href={`/classes/${id}/edit`}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground transition-all hover:bg-muted"
            >
              <Edit3 className="h-4 w-4" />
              Edit Class
            </Link>
          )}
        </div>
      </div>

      {/* ── Student Roster ───────────────────────────────── */}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b border-border bg-muted/30 px-6 py-4">
          <h2 className="text-lg font-bold text-foreground">Student Roster</h2>
          {canManageEnrollment && (
            <Link
              href={`/classes/${id}/enroll`}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow-sm transition-all hover:opacity-90"
            >
              <UserPlus className="h-4 w-4" />
              Enroll Student
            </Link>
          )}
        </div>

        {roster.length === 0 ? (
          <div className="py-20 text-center animate-scale-in">
            <Users className="mx-auto h-12 w-12 text-[var(--empty-state-icon)] opacity-20" />
            <p className="mt-4 text-sm text-[var(--empty-state-fg)]">
              No students enrolled in this class yet.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {roster.map((enrollment, idx) => {
              const student = enrollment.student;
              const displayName = formatStudentName(student.first_name, student.last_name, student.preferred_name);
              const age = calculateAge(student.dob);
              // Deterministic avatar index based on name hash (logic assumed in utils or manual)
              const avatarIdx = (student.first_name.length + student.last_name.length) % 8;

              return (
                <div
                  key={enrollment.id}
                  className="group flex items-center justify-between px-6 py-4 transition-colors hover:bg-muted/30"
                >
                  <div className="flex items-center gap-4">
                    <div 
                      className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white shadow-sm"
                      style={{ backgroundColor: `var(--avatar-${avatarIdx})` }}
                    >
                      {student.first_name[0]}{student.last_name[0]}
                    </div>
                    <div>
                      <Link
                        href={`/students/${student.id}`}
                        className="text-sm font-bold text-foreground hover:text-primary transition-colors"
                      >
                        {displayName}
                      </Link>
                      <div className="flex gap-3 text-xs text-muted-foreground tabular-nums">
                        {age !== null && <span>Age {age}</span>}
                        <span className="opacity-60">•</span>
                        <span>Enrolled {formatDate(enrollment.start_date)}</span>
                      </div>
                    </div>
                  </div>

                  {canManageEnrollment && (
                    <ClassRosterActions
                      studentId={student.id}
                      studentName={displayName}
                      classId={id}
                      enrollmentId={enrollment.id}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}