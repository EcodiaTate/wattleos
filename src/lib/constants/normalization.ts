// src/lib/constants/normalization.ts
//
// ============================================================
// Normalization Indicators - Constants & Configuration
// ============================================================
// Central config for the five Montessori normalization
// indicators: concentration, independence, order, coordination,
// social harmony. Used by actions, components, and validations.
// ============================================================

import type {
  NormalizationIndicator,
  WorkCycleEngagement,
  SelfDirectionLevel,
  NormalizationGoalStatus,
} from "@/types/domain";

// ============================================================
// Rating scale labels (1–5 Likert)
// ============================================================

export const RATING_LABELS: Record<number, string> = {
  1: "Rarely",
  2: "Sometimes",
  3: "Often",
  4: "Usually",
  5: "Consistently",
};

export const RATING_SHORT_LABELS: Record<number, string> = {
  1: "1",
  2: "2",
  3: "3",
  4: "4",
  5: "5",
};

// ============================================================
// Normalization level classification
// ============================================================
// Derived from the average of all five indicator ratings.
// Used for student cards and dashboard summaries.
// ============================================================

export type NormalizationLevel =
  | "emerging"
  | "developing"
  | "normalized"
  | "flourishing";

export const NORMALIZATION_LEVEL_THRESHOLDS: Record<
  NormalizationLevel,
  { min: number; max: number }
> = {
  emerging: { min: 1.0, max: 1.99 },
  developing: { min: 2.0, max: 3.49 },
  normalized: { min: 3.5, max: 4.49 },
  flourishing: { min: 4.5, max: 5.0 },
};

export function classifyNormalizationLevel(
  avgRating: number,
): NormalizationLevel {
  if (avgRating >= 4.5) return "flourishing";
  if (avgRating >= 3.5) return "normalized";
  if (avgRating >= 2.0) return "developing";
  return "emerging";
}

export const NORMALIZATION_LEVEL_CONFIG: Record<
  NormalizationLevel,
  { label: string; description: string; cssVar: string }
> = {
  emerging: {
    label: "Emerging",
    description: "Beginning stages - child is adjusting to the environment",
    cssVar: "--normalization-emerging",
  },
  developing: {
    label: "Developing",
    description:
      "Growing engagement - showing early signs of self-directed work",
    cssVar: "--normalization-developing",
  },
  normalized: {
    label: "Normalized",
    description: "Sustained concentration, independence, and social harmony",
    cssVar: "--normalization-normalized",
  },
  flourishing: {
    label: "Flourishing",
    description: "Deep, consistent engagement across all indicators",
    cssVar: "--normalization-flourishing",
  },
};

// ============================================================
// Indicator configuration
// ============================================================

export const INDICATOR_CONFIG: Record<
  NormalizationIndicator,
  {
    label: string;
    shortLabel: string;
    description: string;
    examples: string[];
    cssVar: string;
  }
> = {
  concentration: {
    label: "Concentration",
    shortLabel: "Conc.",
    description: "Deep, sustained focus on purposeful work",
    examples: [
      "Works uninterrupted for extended periods",
      "Resists distractions from peers",
      "Returns to work after interruption",
      "Repeats exercises for mastery",
    ],
    cssVar: "--normalization-concentration",
  },
  independence: {
    label: "Independence",
    shortLabel: "Indep.",
    description: "Self-directed choice of work and task completion",
    examples: [
      "Selects work without prompting",
      "Completes full work cycle independently",
      "Returns materials to shelf unprompted",
      "Solves problems before seeking help",
    ],
    cssVar: "--normalization-independence",
  },
  order: {
    label: "Order",
    shortLabel: "Order",
    description: "Internal sense of sequence, routine, and care of environment",
    examples: [
      "Follows classroom routines consistently",
      "Keeps workspace organized",
      "Returns materials to correct place",
      "Transitions smoothly between activities",
    ],
    cssVar: "--normalization-order",
  },
  coordination: {
    label: "Coordination",
    shortLabel: "Coord.",
    description: "Purposeful movement and self-control",
    examples: [
      "Moves carefully around classroom",
      "Handles materials with precision",
      "Controls body during group activities",
      "Fine motor control in practical life",
    ],
    cssVar: "--normalization-coordination",
  },
  social_harmony: {
    label: "Social Harmony",
    shortLabel: "Social",
    description: "Respectful interaction with peers and community",
    examples: [
      "Waits for turn with materials",
      "Offers help to younger children",
      "Resolves conflicts peacefully",
      "Respects others' work space",
    ],
    cssVar: "--normalization-social-harmony",
  },
};

export const ALL_INDICATORS: NormalizationIndicator[] = [
  "concentration",
  "independence",
  "order",
  "coordination",
  "social_harmony",
];

// ============================================================
// Work cycle engagement config
// ============================================================

export const WORK_CYCLE_ENGAGEMENT_CONFIG: Record<
  WorkCycleEngagement,
  {
    label: string;
    description: string;
    cssVar: string;
  }
> = {
  deep: {
    label: "Deep",
    description: "Fully immersed, extended concentration",
    cssVar: "--normalization-engagement-deep",
  },
  moderate: {
    label: "Moderate",
    description: "Engaged with occasional breaks",
    cssVar: "--normalization-engagement-moderate",
  },
  surface: {
    label: "Surface",
    description: "Brief engagement, frequent task-switching",
    cssVar: "--normalization-engagement-surface",
  },
  disengaged: {
    label: "Disengaged",
    description: "Unable to settle into work",
    cssVar: "--normalization-engagement-disengaged",
  },
};

// ============================================================
// Self-direction level config
// ============================================================

export const SELF_DIRECTION_CONFIG: Record<
  SelfDirectionLevel,
  {
    label: string;
    description: string;
  }
> = {
  fully_self_directed: {
    label: "Fully Self-Directed",
    description: "Chooses and completes work independently",
  },
  minimal_guidance: {
    label: "Minimal Guidance",
    description: "Occasional prompts to begin or stay on task",
  },
  frequent_guidance: {
    label: "Frequent Guidance",
    description: "Needs regular redirection and support",
  },
  constant_support: {
    label: "Constant Support",
    description: "Requires one-on-one guidance throughout",
  },
};

// ============================================================
// Goal status config
// ============================================================

export const GOAL_STATUS_CONFIG: Record<
  NormalizationGoalStatus,
  {
    label: string;
    cssVar: string;
  }
> = {
  active: {
    label: "Active",
    cssVar: "--normalization-goal-active",
  },
  achieved: {
    label: "Achieved",
    cssVar: "--normalization-goal-achieved",
  },
  deferred: {
    label: "Deferred",
    cssVar: "--normalization-goal-deferred",
  },
  archived: {
    label: "Archived",
    cssVar: "--normalization-goal-archived",
  },
};
