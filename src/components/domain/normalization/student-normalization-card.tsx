"use client";

import Link from "next/link";
import { NormalizationLevelBadge } from "./normalization-level-badge";
import { IndicatorBar } from "./indicator-bar";
import { ALL_INDICATORS } from "@/lib/constants/normalization";
import type { StudentNormalizationSummary } from "@/types/domain";

interface StudentNormalizationCardProps {
  summary: StudentNormalizationSummary;
}

const TREND_ICON: Record<string, string> = {
  improving: "↗",
  stable: "→",
  declining: "↘",
  insufficient_data: "-",
};

const TREND_LABEL: Record<string, string> = {
  improving: "Improving",
  stable: "Stable",
  declining: "Declining",
  insufficient_data: "Not enough data",
};

export function StudentNormalizationCard({ summary }: StudentNormalizationCardProps) {
  const displayName = summary.student_preferred_name || summary.student_first_name;

  return (
    <Link
      href={`/pedagogy/normalization/${summary.student_id}`}
      className="card-interactive block rounded-xl border border-border p-4"
      style={{ backgroundColor: "var(--card)" }}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          {summary.student_photo_url ? (
            <img
              src={summary.student_photo_url}
              alt=""
              className="h-9 w-9 rounded-full object-cover shrink-0"
            />
          ) : (
            <div
              className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold shrink-0"
              style={{ backgroundColor: "var(--muted)", color: "var(--muted-foreground)" }}
            >
              {summary.student_first_name[0]}
              {summary.student_last_name[0]}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: "var(--foreground)" }}>
              {displayName} {summary.student_last_name}
            </p>
            <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
              {summary.observation_count} observation{summary.observation_count !== 1 ? "s" : ""}
              {summary.active_goals_count > 0 && ` · ${summary.active_goals_count} goal${summary.active_goals_count !== 1 ? "s" : ""}`}
            </p>
          </div>
        </div>
        <NormalizationLevelBadge avgRating={summary.avg_rating} />
      </div>

      {summary.latest_observation ? (
        <div className="space-y-1.5">
          {ALL_INDICATORS.map((ind) => {
            const key = `${ind}_rating` as keyof typeof summary.latest_observation;
            const rating = summary.latest_observation![key] as number;
            return <IndicatorBar key={ind} indicator={ind} rating={rating} />;
          })}
        </div>
      ) : (
        <div className="flex items-center justify-center py-4">
          <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
            No observations recorded yet
          </p>
        </div>
      )}

      {summary.trend !== "insufficient_data" && (
        <div className="mt-2 flex items-center gap-1 text-xs" style={{ color: "var(--muted-foreground)" }}>
          <span>{TREND_ICON[summary.trend]}</span>
          <span>{TREND_LABEL[summary.trend]}</span>
        </div>
      )}
    </Link>
  );
}
