"use client";

import Link from "next/link";
import type { Reg168ComplianceSummary } from "@/lib/actions/policies";

const CATEGORY_LABELS: Record<string, string> = {
  health_safety: "Health & Safety",
  child_protection: "Child Protection",
  families: "Families",
  governance: "Governance",
  staffing: "Staffing",
  curriculum: "Curriculum",
  inclusion: "Inclusion",
  administration: "Administration",
  environment: "Environment",
  other: "Other",
};

const STATUS_CONFIG: Record<
  string,
  { label: string; bgVar: string; fgVar: string }
> = {
  covered: {
    label: "Covered",
    bgVar: "var(--attendance-present-bg, hsl(142 71% 93%))",
    fgVar: "var(--attendance-present-fg, hsl(142 71% 29%))",
  },
  missing: {
    label: "Missing",
    bgVar: "var(--attendance-absent-bg, hsl(0 84% 93%))",
    fgVar: "var(--attendance-absent-fg, hsl(0 84% 32%))",
  },
  review_due: {
    label: "Review Due",
    bgVar: "var(--attendance-late-bg, hsl(32 95% 93%))",
    fgVar: "var(--attendance-late-fg, hsl(32 95% 34%))",
  },
};

export function Reg168ChecklistClient({
  data,
}: {
  data: Reg168ComplianceSummary;
}) {
  // Group items by category
  const grouped: Record<string, typeof data.items> = {};
  for (const item of data.items) {
    if (!grouped[item.category]) grouped[item.category] = [];
    grouped[item.category].push(item);
  }

  return (
    <div className="space-y-6">
      {/* Summary banner */}
      <div
        className="rounded-[var(--radius-lg)] border border-border p-4 sm:p-6"
        style={{ background: "var(--card)" }}
      >
        <div className="flex flex-wrap gap-4 sm:gap-8">
          <div className="text-center">
            <div
              className="text-3xl font-bold"
              style={{ color: "var(--foreground)" }}
            >
              {data.compliance_percent}%
            </div>
            <div
              className="text-xs"
              style={{ color: "var(--muted-foreground)" }}
            >
              Compliant
            </div>
          </div>
          <div className="text-center">
            <div
              className="text-3xl font-bold"
              style={{ color: STATUS_CONFIG.covered.fgVar }}
            >
              {data.covered}
            </div>
            <div
              className="text-xs"
              style={{ color: "var(--muted-foreground)" }}
            >
              Covered
            </div>
          </div>
          <div className="text-center">
            <div
              className="text-3xl font-bold"
              style={{ color: STATUS_CONFIG.missing.fgVar }}
            >
              {data.missing}
            </div>
            <div
              className="text-xs"
              style={{ color: "var(--muted-foreground)" }}
            >
              Missing
            </div>
          </div>
          <div className="text-center">
            <div
              className="text-3xl font-bold"
              style={{ color: STATUS_CONFIG.review_due.fgVar }}
            >
              {data.review_due}
            </div>
            <div
              className="text-xs"
              style={{ color: "var(--muted-foreground)" }}
            >
              Review Due
            </div>
          </div>
        </div>

        {data.critical_missing > 0 && (
          <div
            className="mt-4 rounded-[var(--radius-md)] p-3 text-sm font-medium"
            style={{
              background: STATUS_CONFIG.missing.bgVar,
              color: STATUS_CONFIG.missing.fgVar,
            }}
          >
            {data.critical_missing} critical polic
            {data.critical_missing === 1 ? "y is" : "ies are"} missing. These
            are required for Assessment &amp; Rating.
          </div>
        )}
      </div>

      {/* Grouped checklist */}
      {Object.entries(grouped).map(([category, items]) => (
        <div key={category}>
          <h2
            className="mb-3 text-lg font-semibold"
            style={{ color: "var(--foreground)" }}
          >
            {CATEGORY_LABELS[category] ?? category}
          </h2>

          <div className="space-y-2">
            {items.map((item) => {
              const cfg = STATUS_CONFIG[item.status];
              return (
                <div
                  key={item.key}
                  className="rounded-[var(--radius-md)] border border-border p-3 sm:p-4"
                  style={{ background: "var(--card)" }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className="font-medium text-sm"
                          style={{ color: "var(--foreground)" }}
                        >
                          {item.title}
                        </span>
                        {item.critical && (
                          <span
                            className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase"
                            style={{
                              background: STATUS_CONFIG.missing.bgVar,
                              color: STATUS_CONFIG.missing.fgVar,
                            }}
                          >
                            Critical
                          </span>
                        )}
                      </div>
                      <div
                        className="mt-0.5 text-xs"
                        style={{ color: "var(--muted-foreground)" }}
                      >
                        {item.regulation}
                      </div>
                      <p
                        className="mt-1 text-xs leading-relaxed"
                        style={{ color: "var(--muted-foreground)" }}
                      >
                        {item.guidance}
                      </p>

                      {item.matched_policy && (
                        <div className="mt-2">
                          <Link
                            href={`/admin/policies/${item.matched_policy.id}`}
                            className="text-xs underline"
                            style={{ color: "var(--primary)" }}
                          >
                            {item.matched_policy.title}
                          </Link>
                          {item.matched_policy.review_date && (
                            <span
                              className="ml-2 text-xs"
                              style={{ color: "var(--muted-foreground)" }}
                            >
                              Review: {item.matched_policy.review_date}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <span
                      className="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold"
                      style={{
                        background: cfg.bgVar,
                        color: cfg.fgVar,
                      }}
                    >
                      {cfg.label}
                    </span>
                  </div>

                  {item.status === "missing" && (
                    <div className="mt-2">
                      <Link
                        href={`/admin/policies/new?category=${item.category}&regulation=${encodeURIComponent(item.regulation)}&title=${encodeURIComponent(item.title)}`}
                        className="active-push touch-target inline-flex rounded-[var(--radius-md)] border border-border px-3 py-1.5 text-xs font-medium"
                        style={{ color: "var(--foreground)" }}
                      >
                        Create Policy
                      </Link>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
