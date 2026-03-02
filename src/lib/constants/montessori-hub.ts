import type { HubArticleCategory, HubArticleAgeBand, HubArticleStatus } from "@/types/domain";

// ── Category config ───────────────────────────────────────────────────────────

export const HUB_CATEGORY_CONFIG: Record<
  HubArticleCategory,
  { label: string; description: string; cssVar: string; emoji: string }
> = {
  philosophy: {
    label: "Philosophy & Foundation",
    description: "Core Montessori beliefs, history, and principles",
    cssVar: "var(--hub-philosophy)",
    emoji: "🌱",
  },
  language: {
    label: "Language & Literacy",
    description: "Reading, writing, phonics, and the language sequence",
    cssVar: "var(--hub-language)",
    emoji: "📚",
  },
  mathematics: {
    label: "Mathematics",
    description: "Concrete maths materials and the journey to abstraction",
    cssVar: "var(--hub-mathematics)",
    emoji: "🔢",
  },
  practical_life: {
    label: "Practical Life",
    description: "Self-care, care of environment, grace and courtesy",
    cssVar: "var(--hub-practical-life)",
    emoji: "🫧",
  },
  sensorial: {
    label: "Sensorial",
    description: "Refining the senses and ordering the world through exploration",
    cssVar: "var(--hub-sensorial)",
    emoji: "🎨",
  },
  cultural: {
    label: "Cultural Studies",
    description: "Geography, history, science, art, and music",
    cssVar: "var(--hub-cultural)",
    emoji: "🌍",
  },
  cosmic_education: {
    label: "Cosmic Education",
    description: "The Great Lessons and integrated cultural studies (6–12)",
    cssVar: "var(--hub-philosophy)",
    emoji: "🌌",
  },
  child_development: {
    label: "Child Development",
    description: "Planes of development, brain development, and learning science",
    cssVar: "var(--hub-child-development)",
    emoji: "🧠",
  },
  home_connection: {
    label: "Montessori at Home",
    description: "Practical ideas for extending Montessori principles at home",
    cssVar: "var(--hub-home-connection)",
    emoji: "🏡",
  },
  three_period_lesson: {
    label: "The Three-Period Lesson",
    description: "How guides introduce, reinforce, and assess mastery",
    cssVar: "var(--hub-language)",
    emoji: "3️⃣",
  },
  sensitive_periods: {
    label: "Sensitive Periods",
    description: "Windows of heightened readiness and how to support them",
    cssVar: "var(--hub-sensorial)",
    emoji: "🔍",
  },
  work_cycle: {
    label: "The Work Cycle",
    description: "The three-hour uninterrupted block and why it matters",
    cssVar: "var(--hub-philosophy)",
    emoji: "⏱️",
  },
  normalization: {
    label: "Normalisation",
    description: "What it means, how it develops, and signs to watch for",
    cssVar: "var(--hub-child-development)",
    emoji: "🧘",
  },
  prepared_environment: {
    label: "Prepared Environment",
    description: "How the physical and social space is intentionally arranged",
    cssVar: "var(--hub-home-connection)",
    emoji: "🏛️",
  },
};

// ── Age band config ────────────────────────────────────────────────────────────

export const HUB_AGE_BAND_CONFIG: Record<
  HubArticleAgeBand,
  { label: string; shortLabel: string }
> = {
  birth_3:  { label: "Birth – 3 years",  shortLabel: "0–3" },
  three_6:  { label: "3–6 years",        shortLabel: "3–6" },
  six_9:    { label: "6–9 years",        shortLabel: "6–9" },
  nine_12:  { label: "9–12 years",       shortLabel: "9–12" },
  all_ages: { label: "All ages",         shortLabel: "All" },
};

// ── Status config ──────────────────────────────────────────────────────────────

export const HUB_STATUS_CONFIG: Record<
  HubArticleStatus,
  { label: string; fgVar: string; bgVar: string }
> = {
  draft:     { label: "Draft",     fgVar: "var(--hub-status-draft-fg)",     bgVar: "var(--hub-status-draft-bg)" },
  published: { label: "Published", fgVar: "var(--hub-status-published-fg)", bgVar: "var(--hub-status-published-bg)" },
  archived:  { label: "Archived",  fgVar: "var(--hub-status-archived-fg)",  bgVar: "var(--hub-status-archived-bg)" },
};

// ── Category display order for hub landing ────────────────────────────────────

export const HUB_CATEGORY_DISPLAY_ORDER: HubArticleCategory[] = [
  "philosophy",
  "prepared_environment",
  "sensitive_periods",
  "three_period_lesson",
  "work_cycle",
  "normalization",
  "language",
  "mathematics",
  "practical_life",
  "sensorial",
  "cultural",
  "cosmic_education",
  "child_development",
  "home_connection",
];
