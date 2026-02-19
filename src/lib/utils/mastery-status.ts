import type { MasteryStatus } from '@/types/domain';

// ============================================================
// MASTERY_STATUS_CONFIG
// ============================================================
// Display configuration for each mastery status.
// Used consistently across the mastery grid, heatmap, timeline,
// and any other UI that renders mastery status.
// ============================================================
export const MASTERY_STATUS_CONFIG: Record<
  MasteryStatus,
  {
    label: string;
    shortLabel: string;
    color: string;
    bgColor: string;
    borderColor: string;
    dotColor: string;
    heatmapColor: string;
    description: string;
  }
> = {
  not_started: {
    label: 'Not Started',
    shortLabel: 'NS',
    color: 'text-muted-foreground',
    bgColor: 'bg-muted',
    borderColor: 'border-border',
    dotColor: 'bg-gray-300',
    heatmapColor: '#e5e7eb', // gray-200
    description: 'Student has not been introduced to this material',
  },
  presented: {
    label: 'Presented',
    shortLabel: 'P',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
    borderColor: 'border-blue-200',
    dotColor: 'bg-blue-500',
    heatmapColor: '#93c5fd', // blue-300
    description: 'Guide has given the initial lesson/presentation',
  },
  practicing: {
    label: 'Practicing',
    shortLabel: 'Pr',
    color: 'text-amber-700',
    bgColor: 'bg-amber-100',
    borderColor: 'border-amber-200',
    dotColor: 'bg-primary',
    heatmapColor: '#fcd34d', // amber-300
    description: 'Student is working with the material independently',
  },
  mastered: {
    label: 'Mastered',
    shortLabel: 'M',
    color: 'text-green-700',
    bgColor: 'bg-green-100',
    borderColor: 'border-green-200',
    dotColor: 'bg-[var(--mastery-mastered)]',
    heatmapColor: '#86efac', // green-300
    description: 'Student demonstrates consistent, independent competence',
  },
};

// ============================================================
// Status progression order (used for cycling through statuses)
// ============================================================
export const MASTERY_STATUS_ORDER: MasteryStatus[] = [
  'not_started',
  'presented',
  'practicing',
  'mastered',
];

// ============================================================
// Get next status in the progression cycle
// ============================================================
export function getNextMasteryStatus(current: MasteryStatus): MasteryStatus {
  const index = MASTERY_STATUS_ORDER.indexOf(current);
  return MASTERY_STATUS_ORDER[(index + 1) % MASTERY_STATUS_ORDER.length];
}

// ============================================================
// Calculate mastery percentage (for progress bars)
// ============================================================
export function masteryPercentage(counts: {
  total: number;
  mastered: number;
  practicing: number;
  presented: number;
}): number {
  if (counts.total === 0) return 0;
  // Weighted: mastered = 100%, practicing = 66%, presented = 33%
  const weighted =
    counts.mastered * 1 + counts.practicing * 0.66 + counts.presented * 0.33;
  return Math.round((weighted / counts.total) * 100);
}
