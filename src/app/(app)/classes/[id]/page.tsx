// src/app/(app)/classes/[id]/page.tsx
//
// ============================================================
// WattleOS V2 - Class Detail Page
// ============================================================
// Server Component. Shows class information and the active
// student roster with enrollment management actions.
//
// Why this page matters: Without it, admins can see a list of
// classes but can't drill into one to see who's enrolled or
// manage the roster. This is the hub for enrollment operations.
// ============================================================

import { ClassRosterActions } from "@/components/domain/sis/ClassRosterActions";
import { getClass, getClassRoster } from "@/lib/actions/classes";
import { getTenantContext } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { calculateAge, formatDate, formatStudentName } from "@/lib/utils";
import Link from "next/link";
import { notFound } from "next/navigation";

interface ClassDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ClassDetailPage({
  params,
}: ClassDetailPageProps) {
  const { id } = await params;
  const context = await getTenantContext();

  const [classResult, rosterResult] = await Promise.all([
    getClass(id),
    getClassRoster(id),
  ]);

  if (classResult.error || !classResult.data) {
    notFound();
  }

  const classData = classResult.data;
  const roster = rosterResult.data ?? [];
  const canManageEnrollment = context.permissions.includes(
    Permissions.MANAGE_ENROLLMENT,
  );
  const canManageStudents = context.permissions.includes(
    Permissions.MANAGE_STUDENTS,
  );

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/classes" className="hover:text-gray-700">
          Classes
        </Link>
        <span>/</span>
        <span className="text-gray-900">{classData.name}</span>
      </nav>

      {/* ── Class Header ─────────────────────────────────── */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-gray-900">
                {classData.name}
              </h1>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  classData.is_active
                    ? "bg-green-50 text-green-700"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {classData.is_active ? "Active" : "Inactive"}
              </span>
            </div>

            <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-500">
              {classData.cycle_level && (
                <span className="flex items-center gap-1">
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                    />
                  </svg>
                  Ages {classData.cycle_level}
                </span>
              )}
              {classData.room && (
                <span className="flex items-center gap-1">
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                    />
                  </svg>
                  {classData.room}
                </span>
              )}
              <span className="flex items-center gap-1">
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                {roster.length} student{roster.length !== 1 ? "s" : ""} enrolled
              </span>
            </div>
          </div>

          {/* Edit button */}
          {(canManageEnrollment || canManageStudents) && (
            <Link
              href={`/classes/${id}/edit`}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              Edit Class
            </Link>
          )}
        </div>
      </div>

      {/* ── Student Roster ───────────────────────────────── */}
      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Student Roster
          </h2>
          {canManageEnrollment && (
            <Link
              href={`/classes/${id}/enroll`}
              className="inline-flex items-center rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              + Enroll Student
            </Link>
          )}
        </div>

        {roster.length === 0 ? (
          <div className="p-12 text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <p className="mt-3 text-sm text-gray-500">
              No students enrolled in this class yet.
            </p>
            {canManageEnrollment && (
              <Link
                href={`/classes/${id}/enroll`}
                className="mt-4 inline-flex items-center text-sm font-medium text-amber-600 hover:text-amber-700"
              >
                Enroll your first student →
              </Link>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {roster.map((enrollment) => {
              const student = enrollment.student;
              const displayName = formatStudentName(
                student.first_name,
                student.last_name,
                student.preferred_name,
              );
              const age = calculateAge(student.dob);

              return (
                <div
                  key={enrollment.id}
                  className="flex items-center justify-between px-6 py-4 hover:bg-gray-50"
                >
                  <div className="flex items-center gap-4">
                    {/* Avatar placeholder */}
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-sm font-medium text-amber-700">
                      {student.first_name[0]}
                      {student.last_name[0]}
                    </div>
                    <div>
                      <Link
                        href={`/students/${student.id}`}
                        className="text-sm font-medium text-gray-900 hover:text-amber-700"
                      >
                        {displayName}
                      </Link>
                      <div className="flex gap-3 text-xs text-gray-500">
                        {age !== null && <span>Age {age}</span>}
                        <span>
                          Enrolled {formatDate(enrollment.start_date)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Roster actions (withdraw/transfer) */}
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
