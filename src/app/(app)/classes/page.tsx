// src/app/(app)/classes/page.tsx
import { listClasses } from "@/lib/actions/classes";
import Link from "next/link";
import { Plus } from "lucide-react";

export default async function ClassesPage() {
  const result = await listClasses();

  const classes = result.data ?? [];
  const activeClasses = classes.filter((c) => c.is_active);
  const inactiveClasses = classes.filter((c) => !c.is_active);

  return (
    <div className="space-y-[var(--density-section-gap)] animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between animate-fade-in-down">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Classes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Montessori classrooms and environments
          </p>
        </div>
        <Link
          href="/classes/new"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:opacity-90 hover:shadow-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <Plus className="h-[var(--density-icon-sm)] w-[var(--density-icon-sm)]" />
          New Class
        </Link>
      </div>

      {result.error ? (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-[var(--density-card-padding)] animate-shake">
          <p className="text-sm font-medium text-destructive">{result.error.message}</p>
        </div>
      ) : classes.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-border p-12 text-center animate-scale-in">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Plus className="h-6 w-6 text-[var(--empty-state-icon)]" />
          </div>
          <p className="text-sm text-[var(--empty-state-fg)]">
            No classes yet. Create your first classroom to start enrolling students.
          </p>
        </div>
      ) : (
        <>
          {/* Active Classes */}
          <div className="grid grid-cols-1 gap-[var(--density-card-padding)] sm:grid-cols-2 lg:grid-cols-3">
            {activeClasses.map((cls, idx) => (
              <Link
                key={cls.id}
                href={`/classes/${cls.id}`}
                style={{ '--stagger': idx } as React.CSSProperties}
                className="card-interactive group block rounded-xl border border-border bg-card p-[var(--density-card-padding)] animate-fade-in-up stagger-1"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-base font-bold text-foreground transition-colors group-hover:text-primary">
                      {cls.name}
                    </h3>
                    {cls.cycle_level && (
                      <span 
                        className="status-badge status-badge-plain mt-2"
                        style={{
                          '--badge-bg': 'var(--primary-100)',
                          '--badge-fg': 'var(--primary-700)',
                        } as React.CSSProperties}
                      >
                        Ages {cls.cycle_level}
                      </span>
                    )}
                  </div>
                  <div className="text-right tabular-nums">
                    <p className="text-2xl font-black text-foreground">
                      {cls.active_enrollment_count}
                    </p>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">students</p>
                  </div>
                </div>
                {cls.room && (
                  <div className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="font-medium">Room:</span>
                    <span className="rounded bg-muted px-1.5 py-0.5">{cls.room}</span>
                  </div>
                )}
              </Link>
            ))}
          </div>

          {/* Inactive Classes */}
          {inactiveClasses.length > 0 && (
            <div className="mt-8 animate-fade-in">
              <h2 className="mb-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                Inactive Classes
              </h2>
              <div className="grid grid-cols-1 gap-[var(--density-card-padding)] sm:grid-cols-2 lg:grid-cols-3">
                {inactiveClasses.map((cls) => (
                  <div
                    key={cls.id}
                    className="rounded-xl border border-border bg-muted/40 p-[var(--density-card-padding)] opacity-70 grayscale-[0.5]"
                  >
                    <h3 className="text-base font-semibold text-muted-foreground">
                      {cls.name}
                    </h3>
                    {cls.cycle_level && (
                      <span className="status-badge status-badge-plain mt-2 bg-muted text-muted-foreground">
                        Ages {cls.cycle_level}
                      </span>
                    )}
                    {cls.room && (
                      <p className="mt-3 text-xs text-muted-foreground/80">
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