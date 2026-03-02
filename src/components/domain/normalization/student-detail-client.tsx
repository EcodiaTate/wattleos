"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useHaptics } from "@/lib/hooks/use-haptics";
import { NormalizationLevelBadge } from "./normalization-level-badge";
import { RadarChart } from "./radar-chart";
import { IndicatorBar } from "./indicator-bar";
import { GoalCard } from "./goal-card";
import {
  ALL_INDICATORS,
  WORK_CYCLE_ENGAGEMENT_CONFIG,
  SELF_DIRECTION_CONFIG,
  classifyNormalizationLevel,
  NORMALIZATION_LEVEL_CONFIG,
} from "@/lib/constants/normalization";
import { deleteNormalizationObservation } from "@/lib/actions/normalization";
import type {
  StudentNormalizationDetail,
  NormalizationObservationWithDetails,
} from "@/types/domain";

interface StudentDetailClientProps {
  data: StudentNormalizationDetail;
  canManage: boolean;
}

export function StudentDetailClient({
  data,
  canManage,
}: StudentDetailClientProps) {
  const router = useRouter();
  const haptics = useHaptics();
  const [isPending, startTransition] = useTransition();
  const [showAllObs, setShowAllObs] = useState(false);

  const displayName = data.student.preferred_name || data.student.first_name;
  const latest = data.observations[0] ?? null;

  // Build radar chart ratings from latest observation
  const radarRatings: Record<string, number> = {};
  if (latest) {
    for (const ind of ALL_INDICATORS) {
      radarRatings[ind] = latest[
        `${ind}_rating` as keyof NormalizationObservationWithDetails
      ] as number;
    }
  }

  const visibleObs = showAllObs
    ? data.observations
    : data.observations.slice(0, 5);
  const activeGoals = data.goals.filter((g) => g.status === "active");
  const pastGoals = data.goals.filter((g) => g.status !== "active");

  function handleDeleteObservation(id: string) {
    if (!confirm("Delete this observation? This cannot be undone.")) return;
    startTransition(async () => {
      const result = await deleteNormalizationObservation(id);
      if (result.error) {
        haptics.error();
      } else {
        haptics.success();
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/pedagogy/normalization")}
            className="active-push touch-target text-sm"
            style={{ color: "var(--muted-foreground)" }}
          >
            ← Back
          </button>
          <div className="flex items-center gap-3">
            {data.student.photo_url ? (
              <img
                src={data.student.photo_url}
                alt=""
                className="h-12 w-12 rounded-full object-cover"
              />
            ) : (
              <div
                className="flex h-12 w-12 items-center justify-center rounded-full text-lg font-semibold"
                style={{
                  backgroundColor: "var(--muted)",
                  color: "var(--muted-foreground)",
                }}
              >
                {data.student.first_name[0]}
                {data.student.last_name[0]}
              </div>
            )}
            <div>
              <h1
                className="text-xl font-bold"
                style={{ color: "var(--foreground)" }}
              >
                {displayName} {data.student.last_name}
              </h1>
              <div className="flex items-center gap-2 mt-0.5">
                <NormalizationLevelBadge avgRating={data.latest_avg} />
                <span
                  className="text-xs"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  {data.observation_count} observation
                  {data.observation_count !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
          </div>
        </div>
        {canManage && (
          <div className="flex gap-2">
            <Link
              href={`/pedagogy/normalization/observe?student=${data.student.id}`}
              className="active-push touch-target rounded-lg px-4 py-2 text-sm font-semibold"
              style={{
                backgroundColor: "var(--primary)",
                color: "var(--primary-foreground)",
              }}
            >
              Record
            </Link>
            <Link
              href={`/pedagogy/normalization/goals?student=${data.student.id}`}
              className="active-push touch-target rounded-lg border border-border px-4 py-2 text-sm font-medium"
              style={{ color: "var(--foreground)" }}
            >
              Set Goal
            </Link>
          </div>
        )}
      </div>

      {/* Radar chart + latest ratings */}
      {latest ? (
        <div className="grid gap-6 md:grid-cols-2">
          <div
            className="rounded-xl border border-border p-4"
            style={{ backgroundColor: "var(--card)" }}
          >
            <p
              className="text-sm font-semibold mb-2"
              style={{ color: "var(--foreground)" }}
            >
              Latest Profile
            </p>
            <RadarChart ratings={radarRatings} size={220} />
          </div>
          <div
            className="rounded-xl border border-border p-4"
            style={{ backgroundColor: "var(--card)" }}
          >
            <p
              className="text-sm font-semibold mb-3"
              style={{ color: "var(--foreground)" }}
            >
              Latest Ratings
            </p>
            <div className="space-y-2.5">
              {ALL_INDICATORS.map((ind) => {
                const rating = latest[
                  `${ind}_rating` as keyof NormalizationObservationWithDetails
                ] as number;
                return (
                  <IndicatorBar key={ind} indicator={ind} rating={rating} />
                );
              })}
            </div>
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <span
                className="rounded-full px-2 py-0.5"
                style={{
                  backgroundColor: `var(${WORK_CYCLE_ENGAGEMENT_CONFIG[latest.work_cycle_engagement].cssVar}-bg)`,
                  color: `var(${WORK_CYCLE_ENGAGEMENT_CONFIG[latest.work_cycle_engagement].cssVar}-fg)`,
                }}
              >
                {
                  WORK_CYCLE_ENGAGEMENT_CONFIG[latest.work_cycle_engagement]
                    .label
                }
              </span>
              <span
                className="rounded-full border border-border px-2 py-0.5"
                style={{ color: "var(--muted-foreground)" }}
              >
                {SELF_DIRECTION_CONFIG[latest.self_direction].label}
              </span>
              {latest.joyful_engagement && (
                <span
                  className="rounded-full px-2 py-0.5"
                  style={{
                    backgroundColor: "var(--normalization-flourishing-bg)",
                    color: "var(--normalization-flourishing-fg)",
                  }}
                >
                  Joyful ✓
                </span>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div
          className="flex flex-col items-center justify-center rounded-xl border border-border py-12"
          style={{ backgroundColor: "var(--card)" }}
        >
          <div
            className="text-4xl mb-2"
            style={{ color: "var(--empty-state-icon)" }}
          >
            🧘
          </div>
          <p
            className="text-sm font-medium"
            style={{ color: "var(--foreground)" }}
          >
            No observations yet
          </p>
          {canManage && (
            <Link
              href={`/pedagogy/normalization/observe?student=${data.student.id}`}
              className="active-push touch-target mt-3 rounded-lg px-4 py-2 text-sm font-semibold"
              style={{
                backgroundColor: "var(--primary)",
                color: "var(--primary-foreground)",
              }}
            >
              Record First Observation
            </Link>
          )}
        </div>
      )}

      {/* Trend chart (text-based line representation) */}
      {data.trend.length >= 2 && (
        <div
          className="rounded-xl border border-border p-4"
          style={{ backgroundColor: "var(--card)" }}
        >
          <p
            className="text-sm font-semibold mb-3"
            style={{ color: "var(--foreground)" }}
          >
            Trend Over Time
          </p>
          <div className="overflow-x-auto">
            <div
              className="flex items-end gap-2 min-w-fit"
              style={{ height: "120px" }}
            >
              {data.trend.map((pt, idx) => (
                <div key={idx} className="flex flex-col items-center gap-1">
                  <div
                    className="w-8 rounded-t transition-all"
                    style={{
                      height: `${(pt.avg / 5) * 100}px`,
                      backgroundColor: `var(${NORMALIZATION_LEVEL_CONFIG[classifyNormalizationLevel(pt.avg)].cssVar})`,
                    }}
                    title={`${pt.date}: ${pt.avg.toFixed(1)}`}
                  />
                  <span
                    className="text-[9px] rotate-[-45deg] whitespace-nowrap"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    {new Date(pt.date).toLocaleDateString("en-AU", {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Active goals */}
      {activeGoals.length > 0 && (
        <div>
          <p
            className="text-sm font-semibold mb-3"
            style={{ color: "var(--foreground)" }}
          >
            Active Goals ({activeGoals.length})
          </p>
          <div className="space-y-3">
            {activeGoals.map((goal) => (
              <GoalCard key={goal.id} goal={goal} canManage={canManage} />
            ))}
          </div>
        </div>
      )}

      {/* Observation history */}
      {data.observations.length > 0 && (
        <div>
          <p
            className="text-sm font-semibold mb-3"
            style={{ color: "var(--foreground)" }}
          >
            Observation History
          </p>
          <div className="space-y-2">
            {visibleObs.map((obs) => (
              <div
                key={obs.id}
                className="rounded-xl border border-border p-3 flex items-center justify-between"
                style={{ backgroundColor: "var(--card)" }}
              >
                <div className="flex items-center gap-3">
                  <NormalizationLevelBadge
                    avgRating={obs.avg_rating}
                    size="sm"
                  />
                  <div>
                    <p
                      className="text-sm font-medium"
                      style={{ color: "var(--foreground)" }}
                    >
                      {new Date(obs.observation_date).toLocaleDateString(
                        "en-AU",
                        {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        },
                      )}
                    </p>
                    <p
                      className="text-xs"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      by {obs.observer.first_name} {obs.observer.last_name}
                      {obs.overall_notes &&
                        ` - ${obs.overall_notes.slice(0, 60)}${obs.overall_notes.length > 60 ? "…" : ""}`}
                    </p>
                  </div>
                </div>
                {canManage && (
                  <button
                    onClick={() => handleDeleteObservation(obs.id)}
                    disabled={isPending}
                    className="active-push touch-target text-xs px-2 py-1 rounded"
                    style={{ color: "var(--destructive)" }}
                  >
                    Delete
                  </button>
                )}
              </div>
            ))}
          </div>
          {data.observations.length > 5 && (
            <button
              onClick={() => setShowAllObs(!showAllObs)}
              className="mt-2 text-sm font-medium"
              style={{ color: "var(--primary)" }}
            >
              {showAllObs
                ? "Show less"
                : `Show all ${data.observations.length} observations`}
            </button>
          )}
        </div>
      )}

      {/* Past goals */}
      {pastGoals.length > 0 && (
        <details>
          <summary
            className="text-sm font-semibold cursor-pointer"
            style={{ color: "var(--muted-foreground)" }}
          >
            Past Goals ({pastGoals.length})
          </summary>
          <div className="space-y-3 mt-3">
            {pastGoals.map((goal) => (
              <GoalCard key={goal.id} goal={goal} canManage={canManage} />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
