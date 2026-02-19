// src/app/(app)/parent/[studentId]/page.tsx
//
// ============================================================
// WattleOS V2 - Child Portfolio Page
// ============================================================
// Server Component. Shows published observations and mastery
// progress for a single child. This is the parent's primary
// window into their child's learning journey.
//
// WHY single page: Observations and mastery together tell the
// story of learning. Parents see "what happened" (observations)
// alongside "what's been achieved" (mastery).
// ============================================================

import {
  getChildMastery,
  getChildObservations,
  getMyChildren,
  isGuardianOf,
} from "@/lib/actions/parent";
import { getTenantContext } from "@/lib/auth/tenant-context";
import Link from "next/link";
import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ studentId: string }>;
  searchParams: Promise<{ page?: string }>;
}

export default async function ChildPortfolioPage({
  params,
  searchParams,
}: PageProps) {
  const { studentId } = await params;
  const query = await searchParams;
  await getTenantContext();

  const isGuardian = await isGuardianOf(studentId);
  if (!isGuardian) {
    redirect("/parent");
  }

  // Get child info
  const childrenResult = await getMyChildren();
  const child = (childrenResult.data ?? []).find((c) => c.id === studentId);
  if (!child) redirect("/parent");
  const displayName = child.preferredName ?? child.firstName;

  const page = parseInt(query.page ?? "1", 10);

  // Load observations and mastery in parallel
  const [obsResult, masteryResult] = await Promise.all([
    getChildObservations(studentId, { page, perPage: 10 }),
    getChildMastery(studentId),
  ]);

  const observations = obsResult.data ?? [];
  const obsPagination = obsResult.pagination;
  const masterySummaries = masteryResult.data ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/parent" className="hover:text-foreground">
            My Children
          </Link>
          <span className="text-muted-foreground">/</span>
          <span className="text-foreground">
            {displayName} {child.lastName}
          </span>
        </div>
        <div className="mt-2 flex items-center gap-[var(--density-card-padding)]">
          {child.photoUrl ? (
            <img
              src={child.photoUrl}
              alt=""
              className="h-[var(--density-button-height)] w-12 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-[var(--density-button-height)] w-12 items-center justify-center rounded-full bg-amber-100 text-lg font-bold text-amber-700">
              {child.firstName[0]}
              {child.lastName[0]}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {displayName}&apos;s Portfolio
            </h1>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              {child.className && <span>{child.className}</span>}
            </div>
          </div>
        </div>
        {/* Sub-nav */}
        <div className="mt-4 flex gap-[var(--density-card-padding)] border-bborder-border">
          <Link
            href={`/parent/${studentId}`}
            className="border-b-2 border-primary px-1 pb-3 text-sm font-medium text-amber-700"
          >
            Portfolio
          </Link>
          <Link
            href={`/parent/${studentId}/attendance`}
            className="border-b-2 border-transparent px-1 pb-3 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            Attendance
          </Link>
          <Link
            href={`/parent/${studentId}/reports`}
            className="border-b-2 border-transparent px-1 pb-3 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            Reports
          </Link>
        </div>
      </div>

      <div className="grid gap-[var(--density-card-padding)] lg:grid-cols-3">
        {/* Observations - 2/3 width */}
        <div className="space-y-4 lg:col-span-2">
          <h2 className="text-sm font-semibold text-foreground">
            Observations
          </h2>

          {observations.length === 0 ? (
            <div className="rounded-lg borderborder-border bg-background p-8 text-center">
              <p className="text-sm text-muted-foreground">
                No published observations yet for this period.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {observations.map((obs) => (
                <div
                  key={obs.id}
                  className="rounded-lg borderborder-border bg-background p-[var(--density-card-padding)]"
                >
                  {/* Media thumbnails */}
                  {obs.media.length > 0 && (
                    <div className="mb-3 flex gap-2 overflow-x-auto">
                      {obs.media.map((m) =>
                        m.mediaType === "image" ? (
                          <img
                            key={m.id}
                            src={m.thumbnailUrl ?? m.storageUrl}
                            alt={m.caption ?? "Observation photo"}
                            className="h-24 w-24 flex-shrink-0 rounded-md object-cover"
                          />
                        ) : (
                          <div
                            key={m.id}
                            className="flex h-24 w-24 flex-shrink-0 items-center justify-center rounded-md bg-muted text-xs text-muted-foreground"
                          >
                            🎥 Video
                          </div>
                        ),
                      )}
                    </div>
                  )}

                  {/* Content */}
                  {obs.content && (
                    <p className="text-sm leading-relaxed text-foreground">
                      {obs.content}
                    </p>
                  )}

                  {/* Outcomes */}
                  {obs.outcomes.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {obs.outcomes.map((o) => (
                        <span
                          key={o.nodeId}
                          className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700"
                        >
                          {o.title}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Meta */}
                  <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{obs.authorName}</span>
                    <span>&middot;</span>
                    <span>
                      {new Date(
                        obs.publishedAt ?? obs.createdAt,
                      ).toLocaleDateString("en-AU", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                    {obs.media.length > 0 && (
                      <>
                        <span>&middot;</span>
                        <span>
                          📷 {obs.media.length} photo
                          {obs.media.length !== 1 ? "s" : ""}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              ))}

              {/* Pagination */}
              {obsPagination && obsPagination.totalPages > 1 && (
                <div className="flex items-center justify-between pt-2">
                  <p className="text-xs text-muted-foreground">
                    Page {obsPagination.page} of {obsPagination.totalPages}
                  </p>
                  <div className="flex gap-2">
                    {obsPagination.page > 1 && (
                      <Link
                        href={`/parent/${studentId}?page=${obsPagination.page - 1}`}
                        className="rounded-md border border-gray-300 bg-background px-3 py-1 text-xs text-foreground hover:bg-background"
                      >
                        Previous
                      </Link>
                    )}
                    {obsPagination.page < obsPagination.totalPages && (
                      <Link
                        href={`/parent/${studentId}?page=${obsPagination.page + 1}`}
                        className="rounded-md border border-gray-300 bg-background px-3 py-1 text-xs text-foreground hover:bg-background"
                      >
                        Next
                      </Link>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Mastery sidebar - 1/3 width */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-foreground">
            Learning Progress
          </h2>

          {masterySummaries.length === 0 ? (
            <div className="rounded-lg borderborder-border bg-background p-[var(--density-card-padding)] text-center">
              <p className="text-sm text-muted-foreground">
                No mastery data recorded yet.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {masterySummaries.map((ms) => (
                <div
                  key={ms.instanceId}
                  className="rounded-lg borderborder-border bg-background p-[var(--density-card-padding)]"
                >
                  <p className="text-sm font-medium text-foreground">
                    {ms.instanceName}
                  </p>

                  {/* Progress bar */}
                  <div className="mt-3 flex items-center gap-2">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-[var(--mastery-mastered)] transition-all"
                        style={{ width: `${ms.percentMastered}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-foreground">
                      {ms.percentMastered}%
                    </span>
                  </div>

                  {/* Breakdown */}
                  <div className="mt-3 grid grid-cols-4 gap-2">
                    <div className="text-center">
                      <p className="text-sm font-bold text-green-600">
                        {ms.mastered}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        Mastered
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold text-primary">
                        {ms.practicing}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        Practicing
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold text-blue-600">
                        {ms.presented}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        Presented
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold text-muted-foreground">
                        {ms.notStarted}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        Not Started
                      </p>
                    </div>
                  </div>

                  <p className="mt-2 text-xs text-muted-foreground">
                    {ms.total} outcomes tracked
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
