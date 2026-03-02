"use client";

import type { HubArticleStatus } from "@/types/domain";
import { HUB_STATUS_CONFIG } from "@/lib/constants/montessori-hub";

export function HubStatusBadge({ status }: { status: HubArticleStatus }) {
  const cfg = HUB_STATUS_CONFIG[status];
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ color: cfg.fgVar, backgroundColor: cfg.bgVar }}
    >
      {cfg.label}
    </span>
  );
}
