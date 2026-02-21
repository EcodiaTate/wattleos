// src/lib/constants/communications.ts
//
// ============================================================
// WattleOS V2 - Communications Display Constants
// ============================================================
// Display config for thread types, announcement priorities,
// and other comms-specific UI constants.
//
// WHY separate file: Comms constants are only used by Module 12
// components. Keeping them out of the main constants barrel
// avoids bloating the shared bundle.
// ============================================================

// ============================================================
// Message Thread Types
// ============================================================

/** Union type for thread categories */
export type MessageThreadType = "class_broadcast" | "direct";

export const THREAD_TYPE_CONFIG: Record<
  MessageThreadType,
  { label: string; color: string; bgColor: string; icon: string }
> = {
  class_broadcast: {
    label: "Class",
    color: "text-blue-700",
    bgColor: "bg-blue-50",
    icon: "📚",
  },
  direct: {
    label: "Direct",
    color: "text-purple-700",
    bgColor: "bg-purple-50",
    icon: "💬",
  },
};

// ============================================================
// Announcement Priorities
// ============================================================

export type AnnouncementPriority = "low" | "normal" | "high" | "urgent";

export const ANNOUNCEMENT_PRIORITY_CONFIG: Record<
  AnnouncementPriority,
  { label: string; color: string; bgColor: string; icon: string }
> = {
  low: {
    label: "Low",
    color: "text-gray-600",
    bgColor: "bg-gray-100",
    icon: "ℹ️",
  },
  normal: {
    label: "Normal",
    color: "text-blue-700",
    bgColor: "bg-blue-50",
    icon: "📢",
  },
  high: {
    label: "High",
    color: "text-orange-700",
    bgColor: "bg-orange-100",
    icon: "⚠️",
  },
  urgent: {
    label: "Urgent",
    color: "text-red-700",
    bgColor: "bg-red-100",
    icon: "🚨",
  },
};

// ============================================================
// Event Type Display
// ============================================================

export const EVENT_TYPE_ICONS: Record<string, string> = {
  general: "📋",
  excursion: "🚌",
  parent_meeting: "👥",
  performance: "🎭",
  sports_day: "⚽",
  fundraiser: "💰",
  professional_development: "📚",
  public_holiday: "🏖️",
  pupil_free_day: "🏠",
  term_start: "🎒",
  term_end: "🎉",
};