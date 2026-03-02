// src/app/(app)/attendance/dismissal/setup/page.tsx
//
// ============================================================
// WattleOS V2 - Dismissal Setup: Student Index
// ============================================================
// Admin: browse active students and click through to configure
// each student's dismissal method (bus, parent, OSHC, walker)
// and manage their pickup authorization list.
// ============================================================

import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";

export const metadata = { title: "Dismissal Setup - WattleOS" };

export default async function DismissalSetupIndexPage() {
  const context = await getTenantContext();

  if (!hasPermission(context, Permissions.MANAGE_DISMISSAL)) {
    redirect("/attendance/dismissal");
  }

  // Fetch active students
  const supabase = await createSupabaseServerClient();
  const { data: students } = await supabase
    .from("students")
    .select("id, first_name, last_name")
    .eq("tenant_id", context.tenant.id)
    .is("deleted_at", null)
    .order("last_name")
    .order("first_name");

  const allStudents = students ?? [];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* ── Page header ── */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Link
            href="/attendance/dismissal"
            className="text-sm"
            style={{ color: "var(--muted-foreground)" }}
          >
            ← Dismissal
          </Link>
        </div>
        <h1
          className="text-xl font-bold"
          style={{ color: "var(--foreground)" }}
        >
          Student Dismissal Setup
        </h1>
        <p
          className="mt-1 text-sm"
          style={{ color: "var(--muted-foreground)" }}
        >
          Configure dismissal method and pickup authorizations for each student.
        </p>
      </div>

      {/* ── Student list ── */}
      {allStudents.length === 0 ? (
        <div
          className="text-center py-16"
          style={{ color: "var(--muted-foreground)" }}
        >
          <p>No active students found.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {allStudents.map((student) => (
            <Link
              key={student.id}
              href={`/attendance/dismissal/setup/${student.id}`}
              className="card-interactive flex items-center justify-between gap-3 rounded-xl border border-border p-4 active-push touch-target"
              style={{ backgroundColor: "var(--background)" }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0"
                  style={{
                    backgroundColor: "var(--muted)",
                    color: "var(--muted-foreground)",
                  }}
                >
                  {student.first_name[0]}
                  {student.last_name[0]}
                </div>
                <span
                  className="font-medium"
                  style={{ color: "var(--foreground)" }}
                >
                  {student.last_name}, {student.first_name}
                </span>
              </div>
              <span style={{ color: "var(--muted-foreground)" }}>→</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
