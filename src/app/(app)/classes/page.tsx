// src/app/(app)/classes/page.tsx
//
// ============================================================
// WattleOS V2 - Class Management Page
// ============================================================
// Server Component. Shows all Montessori classrooms/environments
// with their active enrollment counts.
//
// Fix: Removed `params.tenant` - the (app) route group has no
// [tenant] dynamic segment. All links now use absolute paths
// without a tenant prefix. Tenant isolation is handled by
// RLS + JWT, not URL segments.
// ============================================================

import { listClasses } from "@/lib/actions/classes";
import Link from "next/link";

export default async function ClassesPage() {
  const result = await listClasses();

  const classes = result.data ?? [];
  const activeClasses = classes.filter((c) => c.is_active);
  const inactiveClasses = classes.filter((c) => !c.is_active);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Classes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Montessori classrooms and environments
          </p>
        </div>
        <Link
          href="/classes/new"
          className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          + New Class
        </Link>
      </div>

      {result.error ? (
        <div className="rounded-md bg-red-50 p-[var(--density-card-padding)]">
          <p className="text-sm text-red-700">{result.error.message}</p>
        </div>
      ) : classes.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
          <p className="text-sm text-muted-foreground">
            No classes yet. Create your first classroom to start enrolling
            students.
          </p>
        </div>
      ) : (
        <>
          {/* Active Classes */}
          <div className="grid grid-cols-1 gap-[var(--density-card-padding)] sm:grid-cols-2 lg:grid-cols-3">
            {activeClasses.map((cls) => (
              <Link
                key={cls.id}
                href={`/classes/${cls.id}`}
                className="group rounded-lg borderborder-border bg-background p-[var(--density-card-padding)] shadow-sm transition hover:border-indigo-300 hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-foreground group-hover:text-indigo-600">
                      {cls.name}
                    </h3>
                    {cls.cycle_level && (
                      <span className="mt-1 inline-block rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
                        Ages {cls.cycle_level}
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-foreground">
                      {cls.active_enrollment_count}
                    </p>
                    <p className="text-xs text-muted-foreground">students</p>
                  </div>
                </div>
                {cls.room && (
                  <p className="mt-3 text-sm text-muted-foreground">
                    Room: {cls.room}
                  </p>
                )}
              </Link>
            ))}
          </div>

          {/* Inactive Classes */}
          {inactiveClasses.length > 0 && (
            <div>
              <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-muted-foreground">
                Inactive Classes
              </h2>
              <div className="grid grid-cols-1 gap-[var(--density-card-padding)] sm:grid-cols-2 lg:grid-cols-3">
                {inactiveClasses.map((cls) => (
                  <div
                    key={cls.id}
                    className="rounded-lg borderborder-border bg-background p-[var(--density-card-padding)] opacity-60"
                  >
                    <h3 className="text-base font-semibold text-foreground">
                      {cls.name}
                    </h3>
                    {cls.cycle_level && (
                      <span className="mt-1 inline-block rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                        Ages {cls.cycle_level}
                      </span>
                    )}
                    {cls.room && (
                      <p className="mt-3 text-sm text-muted-foreground">
                        Room: {cls.room}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
