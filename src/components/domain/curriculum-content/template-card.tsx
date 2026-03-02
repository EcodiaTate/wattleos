// src/components/domain/curriculum-content/template-card.tsx
import type { EnhancedCurriculumTemplate } from "@/lib/actions/curriculum-content";
import Link from "next/link";

interface TemplateCardProps {
  template: EnhancedCurriculumTemplate;
  tenant?: string;
}

const FRAMEWORK_COLORS: Record<string, string> = {
  AMI: "text-primary bg-primary/10 border-primary/30",
  EYLF: "text-[var(--framework-eylf)] bg-[var(--framework-eylf-bg)] border-[var(--framework-eylf)]/20",
  ACARA:
    "text-info bg-info/10 border-info/20",
};

export function TemplateCard({ template }: TemplateCardProps) {
  const framework = template.framework ?? "Other";
  const colors =
    FRAMEWORK_COLORS[framework] ||
    "text-muted-foreground bg-muted/50 border-border";

  return (
    <Link
      href={`/pedagogy/content-library/template/${template.id}`}
      className="group block rounded-xl border border-border bg-card p-[var(--density-card-padding)] transition-all card-interactive shadow-sm"
    >
      <div className="flex items-start justify-between gap-2 mb-4">
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${colors}`}
        >
          {framework}
        </span>

        {template.is_compliance_framework && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-primary/15 text-primary border border-primary/30">
            <span className="text-sm">⚖</span> Compliance
          </span>
        )}
      </div>

      <h3 className="font-bold text-base group-hover:text-primary transition-colors mb-2 leading-tight">
        {template.name}
      </h3>

      {template.description && (
        <p className="text-xs text-muted-foreground line-clamp-2 mb-4 font-medium italic">
          {template.description}
        </p>
      )}

      <div className="flex flex-wrap gap-2 mt-auto">
        {template.age_range && (
          <MetaPill label="Ages" value={template.age_range} />
        )}
        {template.version && <MetaPill label="Ver" value={String(template.version)} />}
      </div>
    </Link>
  );
}

function MetaPill({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold bg-muted text-muted-foreground border border-border/50 uppercase tracking-tighter">
      <span className="opacity-70">{label}</span>
      <span className="text-foreground">{value}</span>
    </span>
  );
}
