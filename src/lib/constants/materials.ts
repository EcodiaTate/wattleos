// src/lib/constants/materials.ts
//
// ============================================================
// Material / Shelf Inventory - Constants
// ============================================================

import type {
  MaterialCondition,
  MaterialInventoryStatus,
  MontessoriArea,
} from "@/types/domain";

// ============================================================
// Condition config
// ============================================================

export const MATERIAL_CONDITION_CONFIG: Record<
  MaterialCondition,
  {
    label: string;
    description: string;
    cssVar: string;
    sortOrder: number;
    needsAttention: boolean;
  }
> = {
  excellent: {
    label: "Excellent",
    description: "Pristine condition - no visible wear",
    cssVar: "excellent",
    sortOrder: 0,
    needsAttention: false,
  },
  good: {
    label: "Good",
    description: "Minor wear - fully functional",
    cssVar: "good",
    sortOrder: 1,
    needsAttention: false,
  },
  fair: {
    label: "Fair",
    description:
      "Visible wear - still usable but should be scheduled for replacement",
    cssVar: "fair",
    sortOrder: 2,
    needsAttention: true,
  },
  damaged: {
    label: "Damaged",
    description: "Missing pieces or non-functional - requires immediate action",
    cssVar: "damaged",
    sortOrder: 3,
    needsAttention: true,
  },
} as const;

// ============================================================
// Status config
// ============================================================

export const MATERIAL_STATUS_CONFIG: Record<
  MaterialInventoryStatus,
  {
    label: string;
    description: string;
    cssVar: string;
    sortOrder: number;
    isActive: boolean; // counts toward available/in-use totals
  }
> = {
  available: {
    label: "Available",
    description: "On shelf and ready for use",
    cssVar: "available",
    sortOrder: 0,
    isActive: true,
  },
  in_use: {
    label: "In Use",
    description: "Currently being used by a student",
    cssVar: "in-use",
    sortOrder: 1,
    isActive: true,
  },
  being_repaired: {
    label: "Being Repaired",
    description: "With maintenance - temporarily unavailable",
    cssVar: "being-repaired",
    sortOrder: 2,
    isActive: false,
  },
  on_order: {
    label: "On Order",
    description: "Ordered but not yet received",
    cssVar: "on-order",
    sortOrder: 3,
    isActive: false,
  },
  retired: {
    label: "Retired",
    description: "Permanently removed from service",
    cssVar: "retired",
    sortOrder: 4,
    isActive: false,
  },
} as const;

// ============================================================
// Montessori area config (for area-tabs and filters)
// ============================================================

export const MONTESSORI_AREA_CONFIG: Record<
  MontessoriArea,
  { label: string; emoji: string; sortOrder: number }
> = {
  practical_life: { label: "Practical Life", emoji: "🧹", sortOrder: 0 },
  sensorial: { label: "Sensorial", emoji: "🎨", sortOrder: 1 },
  language: { label: "Language", emoji: "📖", sortOrder: 2 },
  mathematics: { label: "Mathematics", emoji: "🔢", sortOrder: 3 },
  cultural: { label: "Cultural", emoji: "🌍", sortOrder: 4 },
} as const;

// ============================================================
// Room type options (mirrors migration CHECK constraint)
// ============================================================

export const ROOM_TYPE_OPTIONS: Array<{
  value: MontessoriArea | "other";
  label: string;
}> = [
  { value: "practical_life", label: "Practical Life" },
  { value: "sensorial", label: "Sensorial" },
  { value: "language", label: "Language" },
  { value: "mathematics", label: "Mathematics" },
  { value: "cultural", label: "Cultural" },
  { value: "other", label: "Other / General" },
];

// ============================================================
// Inspection overdue threshold
// ============================================================

/** Items not inspected within this many days are flagged as overdue */
export const INSPECTION_OVERDUE_DAYS = 90;

// ============================================================
// Condition transition rules
// Defines which conditions can be set from which current state
// (prevents nonsensical transitions e.g. damaged → excellent)
// ============================================================

export const CONDITION_TRANSITIONS: Record<
  MaterialCondition,
  MaterialCondition[]
> = {
  excellent: ["excellent", "good", "fair", "damaged"],
  good: ["excellent", "good", "fair", "damaged"],
  fair: ["excellent", "good", "fair", "damaged"],
  damaged: ["good", "fair", "damaged"], // must go through repair first
};

// ============================================================
// Status transition rules
// ============================================================

export const STATUS_TRANSITIONS: Record<
  MaterialInventoryStatus,
  MaterialInventoryStatus[]
> = {
  on_order: ["available", "retired"],
  available: ["in_use", "being_repaired", "retired"],
  in_use: ["available", "being_repaired", "retired"],
  being_repaired: ["available", "retired"],
  retired: [], // terminal state
};
