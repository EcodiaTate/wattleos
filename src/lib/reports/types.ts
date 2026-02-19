// src/lib/reports/types.ts
//
// ============================================================
// WattleOS V2 — Report Template & Content Types
// ============================================================
// Defines the JSONB structure stored in report_templates.content
// and student_reports.content. These types are the contract
// between the template builder UI, the report generator, and
// the report editor.
//
// WHY JSONB: Report templates are inherently flexible — every
// school wants different sections, orderings, and data pulls.
// A rigid relational schema would require migrations for every
// new section type. JSONB with TypeScript types gives us
// flexibility + type safety at the application layer.
// ============================================================

// ============================================================
// Template Section Types
// ============================================================
// Each section type determines:
//   1. What data gets auto-populated when generating a report
//   2. What's editable by the teacher
//   3. How it renders in the report viewer / PDF

export type TemplateSectionType =
  | 'student_info'           // Auto: student name, class, DOB, photo
  | 'narrative'              // Manual: teacher writes free-text prose
  | 'mastery_grid'           // Auto: mastery statuses for a curriculum area
  | 'mastery_summary'        // Auto: counts/percentages of mastery progress
  | 'attendance_summary'     // Auto: attendance stats for the reporting period
  | 'observation_highlights' // Semi-auto: recent observations, teacher can curate
  | 'custom_text'            // Manual: freeform section (e.g., goals, social development)
  | 'goals';                 // Manual: teacher sets goals for next term

// ============================================================
// Template Section
// ============================================================
// A single section within a report template. Schools build
// templates by composing these sections in order.

export interface TemplateSection {
  /** Stable UUID for this section — survives reordering */
  id: string;
  /** What kind of section this is */
  type: TemplateSectionType;
  /** Section heading displayed in the report */
  title: string;
  /** Display order (0-indexed) */
  order: number;
  /** Type-specific configuration */
  config: TemplateSectionConfig;
}

// ============================================================
// Section Config (type-specific settings)
// ============================================================

export interface TemplateSectionConfig {
  // ── mastery_grid / mastery_summary ──────────────────────
  /** Filter to a specific curriculum area title, or 'all' */
  curriculumAreaFilter?: string;
  /** Which curriculum instance to pull from */
  curriculumInstanceId?: string;
  /** For mastery_summary: show as percentage or counts */
  displayMode?: 'percentage' | 'counts' | 'both';

  // ── observation_highlights ─────────────────────────────
  /** Max observations to auto-include */
  maxObservations?: number;
  /** Only include published observations */
  publishedOnly?: boolean;

  // ── attendance_summary ─────────────────────────────────
  /** Show daily breakdown vs totals only */
  showDetails?: boolean;

  // ── narrative / custom_text / goals ────────────────────
  /** Hint text shown to the teacher when writing */
  placeholder?: string;
  /** Suggested minimum word count (guidance, not enforced) */
  suggestedMinWords?: number;
}

// ============================================================
// Template Content (stored in report_templates.content)
// ============================================================

export interface TemplateContent {
  /** Schema version for future migrations */
  version: 1;
  /** Ordered list of sections that compose this template */
  sections: TemplateSection[];
}

// ============================================================
// Default template for new templates
// ============================================================

export function createDefaultTemplateContent(): TemplateContent {
  return {
    version: 1,
    sections: [
      {
        id: crypto.randomUUID(),
        type: 'student_info',
        title: 'Student Information',
        order: 0,
        config: {},
      },
      {
        id: crypto.randomUUID(),
        type: 'attendance_summary',
        title: 'Attendance Summary',
        order: 1,
        config: { showDetails: false },
      },
      {
        id: crypto.randomUUID(),
        type: 'mastery_summary',
        title: 'Learning Progress',
        order: 2,
        config: { curriculumAreaFilter: 'all', displayMode: 'both' },
      },
      {
        id: crypto.randomUUID(),
        type: 'narrative',
        title: 'Teacher Comments',
        order: 3,
        config: {
          placeholder: 'Write about the student\'s progress, strengths, and areas for growth...',
          suggestedMinWords: 50,
        },
      },
      {
        id: crypto.randomUUID(),
        type: 'goals',
        title: 'Goals for Next Term',
        order: 4,
        config: {
          placeholder: 'Outline learning goals and focus areas for the upcoming term...',
        },
      },
    ],
  };
}

// ============================================================
// Report Section Content (stored in student_reports.content)
// ============================================================
// When a report is generated from a template, each template
// section becomes a report section. Auto sections get populated
// with data; manual sections start empty for the teacher to fill.

export interface ReportSectionContent {
  /** Links back to the template section this was generated from */
  templateSectionId: string;
  /** Section type (copied from template for rendering) */
  type: TemplateSectionType;
  /** Section title (copied from template, editable) */
  title: string;
  /** Display order */
  order: number;

  // ── Auto-populated data ────────────────────────────────
  /** Data pulled from the system at generation time */
  autoData?: ReportAutoData;

  // ── Teacher-editable content ───────────────────────────
  /** Free-text narrative written by the teacher */
  narrative?: string;

  // ── Workflow tracking ──────────────────────────────────
  /** Whether the teacher has reviewed/completed this section */
  completed: boolean;
}

// ============================================================
// Auto-populated data shapes
// ============================================================

export interface ReportAutoData {
  // ── student_info ───────────────────────────────────────
  studentInfo?: {
    firstName: string;
    lastName: string;
    preferredName: string | null;
    dob: string | null;
    photoUrl: string | null;
    className: string | null;
    cycleLevelName: string | null;
    enrollmentStatus: string;
  };

  // ── mastery_grid ───────────────────────────────────────
  masteryGrid?: Array<{
    nodeId: string;
    nodeTitle: string;
    nodeLevel: string;
    parentTitle: string | null;
    status: string;
  }>;

  // ── mastery_summary ────────────────────────────────────
  masterySummary?: {
    total: number;
    notStarted: number;
    presented: number;
    practicing: number;
    mastered: number;
    percentMastered: number;
  };

  // ── attendance_summary ─────────────────────────────────
  attendanceSummary?: {
    totalDays: number;
    present: number;
    absent: number;
    late: number;
    excused: number;
    halfDay: number;
    attendanceRate: number; // percentage
  };

  // ── observation_highlights ─────────────────────────────
  observationHighlights?: Array<{
    id: string;
    content: string | null;
    createdAt: string;
    authorName: string;
    outcomes: string[];
    mediaCount: number;
  }>;
}

// ============================================================
// Report Content (stored in student_reports.content)
// ============================================================

export interface ReportContent {
  /** Schema version */
  version: 1;
  /** Frozen snapshot of the template at generation time */
  templateSnapshot: TemplateContent;
  /** Generated/edited sections */
  sections: ReportSectionContent[];
  /** Metadata about the reporting period */
  reportingPeriod?: {
    startDate: string;
    endDate: string;
    termLabel: string;
  };
}

// ============================================================
// Section type metadata (used by the template builder UI)
// ============================================================

export interface SectionTypeInfo {
  type: TemplateSectionType;
  label: string;
  description: string;
  icon: string;
  /** Whether this section auto-populates data */
  isAutoPopulated: boolean;
  /** Whether the teacher writes content in this section */
  isEditable: boolean;
  /** Can this section appear multiple times in a template? */
  allowMultiple: boolean;
}

export const SECTION_TYPE_CATALOG: SectionTypeInfo[] = [
  {
    type: 'student_info',
    label: 'Student Information',
    description: 'Auto-populated student details: name, class, date of birth, photo',
    icon: 'user',
    isAutoPopulated: true,
    isEditable: false,
    allowMultiple: false,
  },
  {
    type: 'narrative',
    label: 'Narrative / Teacher Comments',
    description: 'Free-text area for the teacher to write about the student',
    icon: 'edit',
    isAutoPopulated: false,
    isEditable: true,
    allowMultiple: true,
  },
  {
    type: 'mastery_grid',
    label: 'Mastery Grid',
    description: 'Detailed mastery statuses for curriculum outcomes in an area',
    icon: 'grid',
    isAutoPopulated: true,
    isEditable: false,
    allowMultiple: true,
  },
  {
    type: 'mastery_summary',
    label: 'Mastery Summary',
    description: 'Progress counts and percentages across curriculum areas',
    icon: 'chart',
    isAutoPopulated: true,
    isEditable: false,
    allowMultiple: true,
  },
  {
    type: 'attendance_summary',
    label: 'Attendance Summary',
    description: 'Attendance statistics for the reporting period',
    icon: 'clipboard',
    isAutoPopulated: true,
    isEditable: false,
    allowMultiple: false,
  },
  {
    type: 'observation_highlights',
    label: 'Observation Highlights',
    description: 'Key observations from the term, auto-selected or teacher-curated',
    icon: 'eye',
    isAutoPopulated: true,
    isEditable: true,
    allowMultiple: false,
  },
  {
    type: 'custom_text',
    label: 'Custom Section',
    description: 'A freeform text section with a custom title',
    icon: 'file-text',
    isAutoPopulated: false,
    isEditable: true,
    allowMultiple: true,
  },
  {
    type: 'goals',
    label: 'Goals for Next Term',
    description: 'Teacher-set learning goals for the upcoming period',
    icon: 'target',
    isAutoPopulated: false,
    isEditable: true,
    allowMultiple: false,
  },
];

// ============================================================
// Helpers
// ============================================================

/** Get the catalog entry for a section type */
export function getSectionTypeInfo(type: TemplateSectionType): SectionTypeInfo | undefined {
  return SECTION_TYPE_CATALOG.find((s) => s.type === type);
}

/** Check if a template content object is valid */
export function validateTemplateContent(content: unknown): content is TemplateContent {
  if (!content || typeof content !== 'object') return false;
  const c = content as Record<string, unknown>;
  if (c.version !== 1) return false;
  if (!Array.isArray(c.sections)) return false;
  for (const section of c.sections as unknown[]) {
    if (!section || typeof section !== 'object') return false;
    const s = section as Record<string, unknown>;
    if (typeof s.id !== 'string') return false;
    if (typeof s.type !== 'string') return false;
    if (typeof s.title !== 'string') return false;
    if (typeof s.order !== 'number') return false;
  }
  return true;
}