// src/lib/constants/work-cycle.ts
//
// ============================================================
// Work Cycle Integrity Tracking - Constants
// ============================================================

import type {
  WorkCycleInterruptionSource,
  WorkCycleInterruptionSeverity,
} from "@/types/domain";

// ============================================================
// Interruption source config
// ============================================================

export interface InterruptionSourceConfig {
  label: string;
  description: string;
  defaultPreventable: boolean;
  fgVar: string;
  bgVar: string;
}

export const INTERRUPTION_SOURCE_CONFIG: Record<
  WorkCycleInterruptionSource,
  InterruptionSourceConfig
> = {
  pa_announcement: {
    label: "PA / Tannoy",
    description: "Public address or intercom announcement",
    defaultPreventable: true,
    fgVar: "var(--wc-source-pa-fg)",
    bgVar: "var(--wc-source-pa-bg)",
  },
  specialist_pullout: {
    label: "Specialist Pull-out",
    description: "Child removed for music, sport, language, etc.",
    defaultPreventable: true,
    fgVar: "var(--wc-source-specialist-fg)",
    bgVar: "var(--wc-source-specialist-bg)",
  },
  fire_drill: {
    label: "Fire / Emergency Drill",
    description: "Scheduled or unscheduled evacuation drill",
    defaultPreventable: false,
    fgVar: "var(--wc-source-drill-fg)",
    bgVar: "var(--wc-source-drill-bg)",
  },
  visitor: {
    label: "Visitor / Observer",
    description: "Classroom visitor or observer arriving mid-cycle",
    defaultPreventable: true,
    fgVar: "var(--wc-source-visitor-fg)",
    bgVar: "var(--wc-source-visitor-bg)",
  },
  admin_request: {
    label: "Admin Request",
    description: "Administration calling child or guide from the room",
    defaultPreventable: true,
    fgVar: "var(--wc-source-admin-fg)",
    bgVar: "var(--wc-source-admin-bg)",
  },
  peer_disruption: {
    label: "Peer Disruption",
    description: "Another child significantly disrupting the environment",
    defaultPreventable: false,
    fgVar: "var(--wc-source-peer-fg)",
    bgVar: "var(--wc-source-peer-bg)",
  },
  staff_interruption: {
    label: "Staff Interruption",
    description: "Guide or support staff interrupted work unnecessarily",
    defaultPreventable: true,
    fgVar: "var(--wc-source-staff-fg)",
    bgVar: "var(--wc-source-staff-bg)",
  },
  technology: {
    label: "Technology Failure",
    description: "Device, projector, or network issue disrupting the class",
    defaultPreventable: false,
    fgVar: "var(--wc-source-tech-fg)",
    bgVar: "var(--wc-source-tech-bg)",
  },
  noise_external: {
    label: "External Noise",
    description: "Construction, grounds maintenance, or external noise",
    defaultPreventable: false,
    fgVar: "var(--wc-source-noise-fg)",
    bgVar: "var(--wc-source-noise-bg)",
  },
  other: {
    label: "Other",
    description: "Any other interruption source",
    defaultPreventable: false,
    fgVar: "var(--wc-source-other-fg)",
    bgVar: "var(--wc-source-other-bg)",
  },
};

// ============================================================
// Severity config
// ============================================================

export interface SeverityConfig {
  label: string;
  description: string;
  fgVar: string;
  bgVar: string;
}

export const INTERRUPTION_SEVERITY_CONFIG: Record<
  WorkCycleInterruptionSeverity,
  SeverityConfig
> = {
  minor: {
    label: "Minor",
    description: "Brief pause; class recovers within minutes",
    fgVar: "var(--wc-severity-minor-fg)",
    bgVar: "var(--wc-severity-minor-bg)",
  },
  moderate: {
    label: "Moderate",
    description: "Noticeable disruption; recovery takes time",
    fgVar: "var(--wc-severity-moderate-fg)",
    bgVar: "var(--wc-severity-moderate-bg)",
  },
  severe: {
    label: "Severe",
    description: "Work cycle effectively ended",
    fgVar: "var(--wc-severity-severe-fg)",
    bgVar: "var(--wc-severity-severe-bg)",
  },
};

// ============================================================
// Quality rating labels
// ============================================================

export const QUALITY_RATING_LABELS: Record<
  number,
  { label: string; description: string }
> = {
  1: {
    label: "Poor",
    description: "Constant disruption; no sustained work possible",
  },
  2: {
    label: "Below Average",
    description: "Frequent interruptions; concentration rarely achieved",
  },
  3: {
    label: "Average",
    description: "Some sustained work despite interruptions",
  },
  4: {
    label: "Good",
    description: "Mostly uninterrupted; concentration well achieved",
  },
  5: {
    label: "Excellent",
    description: "Fully uninterrupted 3-hour work cycle",
  },
};

// ============================================================
// Thresholds for flagging
// ============================================================

/** Classes averaging more than this many interruptions per session are flagged */
export const FLAG_INTERRUPTIONS_THRESHOLD = 3;

/** 3-hour work cycle standard duration in minutes */
export const STANDARD_WORK_CYCLE_MINUTES = 180;

/** Minimum quality rating to consider a cycle "healthy" */
export const HEALTHY_QUALITY_THRESHOLD = 3.5;

// ============================================================
// Trend calculation - compare last 4 weeks vs prior 4 weeks
// ============================================================

export function calcInterruptionTrend(
  recentAvg: number,
  previousAvg: number,
): "improving" | "stable" | "worsening" | "insufficient_data" {
  if (previousAvg === 0 && recentAvg === 0) return "stable";
  if (previousAvg === 0) return "insufficient_data";
  const changePct = (recentAvg - previousAvg) / previousAvg;
  if (changePct < -0.15) return "improving";
  if (changePct > 0.15) return "worsening";
  return "stable";
}
