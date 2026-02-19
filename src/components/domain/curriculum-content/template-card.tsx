// src/components/domain/curriculum-content/template-card.tsx
//
// ============================================================
// WattleOS V2 - Module 14: Template Card
// ============================================================
// Server component that renders a curriculum template as a card
// with framework badge, age range, version, and compliance status.
//
// WHY server: No interactivity needed - it's a display card
// with a link. Keeps the JS bundle minimal.
// ============================================================

import type { EnhancedCurriculumTemplate } from "@/lib/actions/curriculum-content";
import Link from "next/link";

interface TemplateCardProps {
  template: EnhancedCurriculumTemplate;
  tenant: string;
}

/** Maps framework names to descriptive labels */
const FRAMEWORK_DESCRIPTIONS: Record<string, string> = {
  AMI: "Association Montessori Internationale",
  AMS: "American Montessori Society",
  EYLF: "Early Years Learning Framework",
  ACARA: "Australian Curriculum (ACARA v9)",
  QCAA: "Queensland Curriculum & Assessment Authority",
  MAF: "Montessori Australia Foundation",
};

/** Framework → accent color classes */
const FRAMEWORK_COLORS: Record<
  string,
  { bg: string; text: string; border: string }
> = {
  AMI: {
    bg: "bg-amber-50 dark:bg-amber-950/30",
    text: "text-amber-700 dark:text-amber-400",
    border: "border-amber-200 dark:border-amber-800",
  },
  AMS: {
    bg: "bg-blue-50 dark:bg-blue-950/30",
    text: "text-blue-700 dark:text-blue-400",
    border: "border-blue-200 dark:border-blue-800",
  },
  EYLF: {
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    text: "text-emerald-700 dark:text-emerald-400",
    border: "border-emerald-200 dark:border-emerald-800",
  },
  ACARA: {
    bg: "bg-purple-50 dark:bg-purple-950/30",
    text: "text-purple-700 dark:text-purple-400",
    border: "border-purple-200 dark:border-purple-800",
  },
  QCAA: {
    bg: "bg-rose-50 dark:bg-rose-950/30",
    text: "text-rose-700 dark:text-rose-400",
    border: "border-rose-200 dark:border-rose-800",
  },
};

const DEFAULT_COLORS = {
  bg: "bg-gray-50 dark:bg-gray-900/30",
  text: "text-gray-700 dark:text-gray-400",
  border: "border-gray-200 dark:border-gray-700",
};

export function TemplateCard({ template, tenant }: TemplateCardProps) {
  const framework = template.framework ?? "Other";
  const colors = FRAMEWORK_COLORS[framework] ?? DEFAULT_COLORS;
  const description =
    FRAMEWORK_DESCRIPTIONS[framework] ?? template.description ?? "";

  return (
    <Link
      href={`/${tenant}/pedagogy/content-library/template/${template.id}`}
      className={`
        group block rounded-lg border p-4 transition-all
        hover:shadow-md hover:border-primary/30
        ${colors.border}
      `}
    >
      {/* Header row: framework badge + compliance indicator */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <span
          className={`
            inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium
            ${colors.bg} ${colors.text}
          `}
        >
          {framework}
        </span>

        {template.is_compliance_framework && (
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium
                       bg-orange-50 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400"
            title="Compliance framework - required for regulatory reporting"
          >
            <svg
              className="w-3 h-3"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
              />
            </svg>
            Compliance
          </span>
        )}
      </div>

      {/* Template name */}
      <h3 className="font-medium text-sm group-hover:text-primary transition-colors mb-1">
        {template.name}
      </h3>

      {/* Description / framework full name */}
      {description && (
        <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
          {description}
        </p>
      )}

      {/* Metadata pills */}
      <div className="flex flex-wrap gap-1.5 mt-auto">
        {template.age_range && (
          <MetaPill label="Ages" value={template.age_range} />
        )}
        {template.country && (
          <MetaPill label="Country" value={template.country} />
        )}
        {template.state && <MetaPill label="State" value={template.state} />}
        {template.version && <MetaPill label="v" value={template.version} />}
      </div>
    </Link>
  );
}

function MetaPill({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] bg-muted text-muted-foreground">
      <span className="font-medium">{label}</span>
      {value}
    </span>
  );
}
