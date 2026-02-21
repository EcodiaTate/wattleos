// src/components/domain/curriculum-content/compliance-template-selector.tsx
"use client";

import type { EnhancedCurriculumTemplate } from "@/lib/actions/curriculum-content";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";

interface ComplianceTemplateSelectorProps {
  templates: EnhancedCurriculumTemplate[];
  currentTemplateId: string;
}

export function ComplianceTemplateSelector({
  templates,
  currentTemplateId,
}: ComplianceTemplateSelectorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const handleChange = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set("template", value);
      } else {
        params.delete("template");
      }
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`);
      });
    },
    [router, pathname, searchParams],
  );

  return (
    <div className="flex items-end gap-[var(--density-md)]">
      <div className="min-w-[280px]">
        <label
          htmlFor="compliance-template"
          className="text-xs font-bold text-muted-foreground mb-[var(--density-xs)] block uppercase tracking-wider"
        >
          Compliance Framework
        </label>
        <select
          id="compliance-template"
          value={currentTemplateId}
          onChange={(e) => handleChange(e.target.value)}
          className="w-full h-[var(--density-input-height)] rounded-lg border border-input bg-card px-[var(--density-input-padding-x)] text-sm
                     focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-[var(--transition-fast)]"
        >
          <option value="">Select a compliance framework...</option>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.framework ? `[${t.framework}] ` : ""}
              {t.name}
              {t.age_range ? ` (${t.age_range})` : ""}
            </option>
          ))}
        </select>
      </div>

      {isPending && (
        <div className="h-[var(--density-input-height)] flex items-center animate-fade-in">
          <svg
            className="w-4 h-4 text-primary animate-spin"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="ml-2 text-xs font-medium text-muted-foreground italic">
            Generating report...
          </span>
        </div>
      )}
    </div>
  );
}