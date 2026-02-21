// src/app/(app)/(app)/pedagogy/content-library/compliance/page.tsx
//
// ============================================================
// WattleOS V2 - Module 14: Compliance Report Generator
// ============================================================
// "Show all evidence for EYLF Outcome 3" - this is the page
// schools open when ACECQA assessors visit. It generates a
// compliance report showing observations and mastery records
// mapped to each outcome in a compliance framework.
//
// WHY a dedicated page: Compliance reporting is a high-stakes
// workflow. Schools need to demonstrate evidence coverage across
// every EYLF/NQS/QCAA outcome during assessment visits.
//
// FIX: Removed unused selectedTemplate variable.
// ============================================================

import { ComplianceTemplateSelector } from "@/components/domain/curriculum-content/compliance-template-selector";
import {
  generateComplianceReport,
  listTemplatesFiltered,
  type ComplianceEvidence,
  type ComplianceReport,
  type ComplianceReportItem,
} from "@/lib/actions/curriculum-content";
import Link from "next/link";

interface CompliancePageProps {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<{
    template?: string;
  }>;
}

export default async function CompliancePage({
  params,
  searchParams,
}: CompliancePageProps) {
  const { tenant } = await params;
  const sp = await searchParams;

  // Fetch compliance frameworks for the selector
  const templatesResult = await listTemplatesFiltered({
    is_compliance_framework: true,
  });
  const complianceTemplates = templatesResult.data ?? [];

  // Generate report if a template is selected
  let report: ComplianceReport | null = null;
  let error: string | null = null;

  if (sp.template) {
    const reportResult = await generateComplianceReport(sp.template);
    if (reportResult.error) {
      error = reportResult.error.message;
    } else {
      report = reportResult.data ?? null;
    }
  }

  return (
    <div className="space-y-6">
      {/* Template Selector */}
      <div className="flex flex-wrap items-end gap-4">
        <ComplianceTemplateSelector
          templates={complianceTemplates}
          currentTemplateId={sp.template ?? ""}
        />

        {report && (
          <p className="text-xs text-muted-foreground">
            Generated{" "}
            {new Date(report.generated_at).toLocaleString("en-AU", {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </p>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Report Content */}
      {report ? (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <SummaryCard
              label="Total Outcomes"
              value={report.outcomes.length}
              variant="default"
            />
            <SummaryCard
              label="With Evidence"
              value={report.outcomes_with_evidence}
              variant="success"
            />
            <SummaryCard
              label="No Evidence"
              value={report.outcomes_without_evidence}
              variant={
                report.outcomes_without_evidence > 0 ? "warning" : "success"
              }
            />
            <SummaryCard
              label="Total Evidence"
              value={report.total_evidence}
              variant="default"
            />
          </div>

          {/* Coverage Bar */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium">Evidence Coverage</span>
              <span className="text-sm text-muted-foreground">
                {report.outcomes.length > 0
                  ? Math.round(
                      (report.outcomes_with_evidence / report.outcomes.length) *
                        100,
                    )
                  : 0}
                %
              </span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                style={{
                  width: `${
                    report.outcomes.length > 0
                      ? (report.outcomes_with_evidence /
                          report.outcomes.length) *
                        100
                      : 0
                  }%`,
                }}
              />
            </div>
          </div>

          {/* Outcomes List */}
          <div className="space-y-3">
            {report.outcomes.map((outcome) => (
              <ComplianceOutcomeSection
                key={outcome.outcome_id}
                outcome={outcome}
                tenant={tenant}
              />
            ))}
          </div>
        </div>
      ) : !sp.template ? (
        /* No template selected */
        <div className="rounded-lg border border-dashed border-border p-12 text-center">
          <div className="text-4xl mb-3">📋</div>
          <h3 className="text-lg font-medium mb-1">
            Compliance Report Generator
          </h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Select a compliance framework above to generate an evidence report.
            The report shows all observations and mastery records mapped to each
            outcome - exactly what you need for ACECQA or QCAA assessment
            visits.
          </p>

          {complianceTemplates.length === 0 && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-4">
              No compliance frameworks have been imported yet. Import EYLF or
              ACARA templates to enable compliance reporting.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}

// ============================================================
// Sub-components
// ============================================================

function SummaryCard({
  label,
  value,
  variant,
}: {
  label: string;
  value: number;
  variant: "default" | "success" | "warning";
}) {
  const valueColors = {
    default: "text-foreground",
    success: "text-emerald-600 dark:text-emerald-400",
    warning: "text-amber-600 dark:text-amber-400",
  };

  return (
    <div className="rounded-lg border border-border p-4">
      <dt className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1">
        {label}
      </dt>
      <dd className={`text-2xl font-semibold ${valueColors[variant]}`}>
        {value}
      </dd>
    </div>
  );
}

function ComplianceOutcomeSection({
  outcome,
  tenant,
}: {
  outcome: ComplianceReportItem;
  tenant: string;
}) {
  const hasEvidence = outcome.evidence_count > 0;

  return (
    <div
      className={`rounded-lg border overflow-hidden ${
        hasEvidence ? "border-border" : "border-amber-200 dark:border-amber-800"
      }`}
    >
      {/* Outcome Header */}
      <div
        className={`flex items-center gap-3 px-4 py-3 ${
          hasEvidence ? "bg-muted/30" : "bg-amber-50/50 dark:bg-amber-950/20"
        }`}
      >
        <div
          className={`w-2 h-2 rounded-full shrink-0 ${
            hasEvidence ? "bg-emerald-500" : "bg-amber-500"
          }`}
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium truncate">
              {outcome.outcome_title}
            </span>
            {outcome.outcome_code && (
              <code className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">
                {outcome.outcome_code}
              </code>
            )}
          </div>
        </div>

        <span
          className={`text-xs font-medium shrink-0 ${
            hasEvidence
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-amber-600 dark:text-amber-400"
          }`}
        >
          {outcome.evidence_count} evidence item
          {outcome.evidence_count !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Evidence List */}
      {hasEvidence && (
        <div className="divide-y divide-border">
          {outcome.evidence.map((ev) => (
            <EvidenceRow key={ev.id} evidence={ev} />
          ))}
        </div>
      )}
    </div>
  );
}

function EvidenceRow({ evidence }: { evidence: ComplianceEvidence }) {
  const isObservation = evidence.type === "observation";
  const href = isObservation
    ? `/pedagogy/observations/${evidence.id}`
    : `/pedagogy/mastery`;

  return (
    <Link
      href={href}
      className="flex items-start gap-3 px-4 py-2.5 hover:bg-muted/10 transition-colors"
    >
      <span
        className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider shrink-0 mt-0.5
                    ${
                      isObservation
                        ? "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300"
                        : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                    }`}
      >
        {evidence.type}
      </span>

      <div className="flex-1 min-w-0">
        <p className="text-sm truncate">{evidence.summary}</p>
        <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
          <span>{evidence.student_name}</span>
          <span>·</span>
          <span>
            {new Date(evidence.date).toLocaleDateString("en-AU", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </span>
          {evidence.source_outcome && (
            <>
              <span>·</span>
              <span>via {evidence.source_outcome.title}</span>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}
