// src/app/(app)/attendance/dismissal/setup/[studentId]/page.tsx
//
// ============================================================
// WattleOS V2 - Student Dismissal Setup Detail
// ============================================================
// Configure dismissal method by day-of-week and manage the
// pickup authorization list for a specific student.
// ============================================================

import {
  getBusRoutes,
  getStudentDismissalSetup,
} from "@/lib/actions/dismissal";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { DismissalSetupClient } from "@/components/domain/dismissal/dismissal-setup-client";

export const metadata = { title: "Student Dismissal Setup - WattleOS" };

interface Props {
  params: Promise<{ studentId: string }>;
}

export default async function StudentDismissalSetupPage({ params }: Props) {
  const context = await getTenantContext();

  if (!hasPermission(context, Permissions.MANAGE_DISMISSAL)) {
    redirect("/attendance/dismissal");
  }

  const { studentId } = await params;

  const [setupResult, routesResult] = await Promise.all([
    getStudentDismissalSetup(studentId),
    getBusRoutes(),
  ]);

  if (setupResult.error) {
    return (
      <div
        className="mx-auto max-w-3xl py-12 text-center"
        style={{ color: "var(--destructive)" }}
      >
        <p>Failed to load student: {setupResult.error.message}</p>
        <Link
          href="/attendance/dismissal/setup"
          className="mt-3 block text-sm underline"
          style={{ color: "var(--muted-foreground)" }}
        >
          ← Back to student list
        </Link>
      </div>
    );
  }

  const setup = setupResult.data;
  if (!setup) notFound();
  const routes = routesResult.data ?? [];

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-tab-bar">
      {/* Breadcrumb */}
      <div
        className="flex items-center gap-2 text-sm"
        style={{ color: "var(--muted-foreground)" }}
      >
        <Link href="/attendance/dismissal" className="hover:underline">
          Dismissal
        </Link>
        <span>/</span>
        <Link href="/attendance/dismissal/setup" className="hover:underline">
          Setup
        </Link>
        <span>/</span>
        <span style={{ color: "var(--foreground)" }}>
          {setup.student.first_name} {setup.student.last_name}
        </span>
      </div>

      {/* ── Setup client ── */}
      <DismissalSetupClient setup={setup} busRoutes={routes} canManage={true} />
    </div>
  );
}
