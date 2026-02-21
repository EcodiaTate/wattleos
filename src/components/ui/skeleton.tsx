// src/components/ui/skeleton.tsx
//
// Reusable skeleton primitives for loading states.
// WHY a shared component: Every loading.tsx needs the same
// pulse blocks. Centralising avoids 15 copies of the same CSS.

function Skeleton({
  className = "",
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`animate-pulse rounded-md bg-muted/60 ${className}`}
      style={style}
    />
  );
}

// ────────────────────────────────────────────────────────────
// Pre-composed skeleton blocks
// ────────────────────────────────────────────────────────────

/** Page header: title line + subtitle line */
function SkeletonHeader() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-72" />
    </div>
  );
}

/** Page header with an action button on the right */
function SkeletonHeaderWithAction() {
  return (
    <div className="flex items-center justify-between">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <Skeleton className="h-10 w-36 rounded-lg" />
    </div>
  );
}

/** A single card placeholder */
function SkeletonCard({ height = "h-28" }: { height?: string }) {
  return (
    <div
      className={`rounded-xl border border-border bg-card p-[var(--density-card-padding)] shadow-sm ${height}`}
    >
      <div className="space-y-3">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-3 w-2/3" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
}

/** Grid of cards (e.g., dashboard quick actions, glance cards) */
function SkeletonCardGrid({
  count = 4,
  columns = "sm:grid-cols-2 lg:grid-cols-4",
}: {
  count?: number;
  columns?: string;
}) {
  return (
    <div className={`grid gap-[var(--density-card-padding)] ${columns}`}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

/** A table-like list of rows */
function SkeletonTable({ rows = 8 }: { rows?: number }) {
  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      {/* Header row */}
      <div className="flex gap-4 border-b border-border bg-muted/30 px-4 py-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-20 hidden sm:block" />
        <Skeleton className="h-4 w-16 hidden lg:block" />
        <Skeleton className="h-4 w-16 ml-auto" />
      </div>
      {/* Data rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 border-b border-border/50 px-4 py-3 last:border-0"
        >
          <Skeleton className="h-8 w-8 rounded-full shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}

/** Search bar placeholder */
function SkeletonSearch() {
  return <Skeleton className="h-10 w-full max-w-sm rounded-lg" />;
}

/** Filter bar with a few filter chips */
function SkeletonFilters({ count = 4 }: { count?: number }) {
  return (
    <div className="flex flex-wrap gap-2">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-8 w-20 rounded-full" />
      ))}
    </div>
  );
}

/** Feed of observation-style cards */
function SkeletonFeed({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-border bg-card p-[var(--density-card-padding)] shadow-sm"
        >
          <div className="flex items-start gap-3">
            <Skeleton className="h-10 w-10 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-4/5" />
              <div className="flex gap-2 pt-1">
                <Skeleton className="h-5 w-14 rounded-full" />
                <Skeleton className="h-5 w-14 rounded-full" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Pagination bar */
function SkeletonPagination() {
  return (
    <div className="flex items-center justify-between pt-4">
      <Skeleton className="h-4 w-32" />
      <div className="flex gap-1">
        <Skeleton className="h-8 w-8 rounded" />
        <Skeleton className="h-8 w-8 rounded" />
        <Skeleton className="h-8 w-8 rounded" />
      </div>
    </div>
  );
}

export {
  Skeleton,
  SkeletonCard,
  SkeletonCardGrid,
  SkeletonFeed,
  SkeletonFilters,
  SkeletonHeader,
  SkeletonHeaderWithAction,
  SkeletonPagination,
  SkeletonSearch,
  SkeletonTable,
};
