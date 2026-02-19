// src/lib/constants/communications.ts
//
// ============================================================
// WattleOS V2 — Communications Constants
// ============================================================
// Labels, options, and color config for announcements and
// messaging. Used by forms (select options) and display
// components (badges, indicators).
// ============================================================

// ============================================================
// Announcement Priority
// ============================================================

export const ANNOUNCEMENT_PRIORITIES = [
  { value: 'normal', label: 'Normal' },
  { value: 'urgent', label: 'Urgent' },
] as const;

export type AnnouncementPriority = 'normal' | 'urgent';

export const ANNOUNCEMENT_PRIORITY_CONFIG: Record<
  AnnouncementPriority,
  { label: string; color: string; bgColor: string; icon: string }
> = {
  normal: {
    label: 'Normal',
    color: 'text-gray-700',
    bgColor: 'bg-gray-100',
    icon: '📢',
  },
  urgent: {
    label: 'Urgent',
    color: 'text-red-700',
    bgColor: 'bg-red-100',
    icon: '🚨',
  },
};

// ============================================================
// Announcement Target Type
// ============================================================

export const ANNOUNCEMENT_TARGETS = [
  { value: 'school_wide', label: 'Entire School' },
  { value: 'class', label: 'Specific Class' },
] as const;

export type AnnouncementTargetType = 'school_wide' | 'class';

// ============================================================
// Message Thread Type
// ============================================================

export const MESSAGE_THREAD_TYPES = [
  { value: 'class_broadcast', label: 'Class Message' },
  { value: 'direct', label: 'Direct Message' },
] as const;

export type MessageThreadType = 'class_broadcast' | 'direct';

export const THREAD_TYPE_CONFIG: Record<
  MessageThreadType,
  { label: string; color: string; bgColor: string; icon: string }
> = {
  class_broadcast: {
    label: 'Class Message',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
    icon: '👥',
  },
  direct: {
    label: 'Direct Message',
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-100',
    icon: '💬',
  },
};