"use client";

import Link from "next/link";
import type { WellbeingFlagWithStudent } from "@/types/domain";
import { WellbeingSeverityBadge } from "./wellbeing-severity-badge";
import { WellbeingStatusBadge } from "./wellbeing-status-badge";
import { PastoralCategoryBadge } from "./pastoral-category-badge";
import { PASTORAL_CATEGORY_CONFIG } from "@/lib/constants/wellbeing";

interface Props {
  flag: WellbeingFlagWithStudent;
}

export function WellbeingFlagCard({ flag }: Props) {
  const student = flag.students;
  const studentName = student.preferred_name ?? student.first_name;
  const catCfg = PASTORAL_CATEGORY_CONFIG[flag.category];

  return (
    <Link href={`/admin/wellbeing/flags/${flag.id}`} className="block">
      <div className="card-interactive rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-sm text-foreground truncate">
                {studentName} {student.last_name}
              </span>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {flag.summary}
            </p>
          </div>
          <WellbeingSeverityBadge severity={flag.severity} size="sm" />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <WellbeingStatusBadge status={flag.status} size="sm" />
          <PastoralCategoryBadge category={flag.category} size="sm" showEmoji />
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {catCfg.emoji} {flag.category}
          </span>
          <span>
            {new Date(flag.created_at).toLocaleDateString("en-AU", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </span>
        </div>
      </div>
    </Link>
  );
}
