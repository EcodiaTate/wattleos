// src/app/(app)/[tenant]/pedagogy/content-library/template/[templateId]/page.tsx
//
// ============================================================
// WattleOS V2 - Module 14: Template Detail Page
// ============================================================
// Deep view of a single curriculum template showing metadata,
// framework info, and the ability to browse its node tree or
// fork it into the school's curriculum instances.
//
// WHY a separate page from Module 2's instance view: Module 2
// shows forked instances. This shows the global template with
// Module 14 metadata (framework, compliance status, age range)
// and links to the cross-mapping and compliance views.
// ============================================================

import { listTemplatesFiltered } from "@/lib/actions/curriculum-content";
import Link from "next/link";

interface TemplateDetailPageProps {
  params: Promise<{ tenant: string; templateId: string }>;
}

export default async function TemplateDetailPage({
  params,
}: TemplateDetailPageProps) {
  const { tenant, templateId } = await params;

  // Fetch the template (using listTemplatesFiltered with a known ID approach)
  // We fetch all templates and filter - this is cached server-side and the list is small
  const templatesResult = await listTemplatesFiltered({});
  const templates = templatesResult.data ?? [];
  const template = templates.find((t) => t.id === templateId);

  if (!template) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center">
        <h2 className="text-lg font-medium text-destructive mb-1">
          Template not found
        </h2>
        <p className="text-sm text-muted-foreground">
          The requested curriculum template could not be loaded.
        </p>
        <Link
          href={`/${tenant}/pedagogy/content-library`}
          className="inline-block mt-4 text-sm text-primary hover:underline"
        >
          Back to Content Library
        </Link>
      </div>
    );
  }

  // Find related templates for cross-mapping display
  const complianceTemplates = templates.filter(
    (t) => t.is_compliance_framework && t.id !== templateId,
  );

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link
          href={`/${tenant}/pedagogy/content-library`}
          className="hover:text-foreground transition-colors"
        >
          Content Library
        </Link>
        <ChevronRight />
        <span className="text-foreground font-medium truncate">
          {template.name}
        </span>
      </nav>

      {/* Template Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <FrameworkBadge framework={template.framework ?? "Other"} />
            {template.is_compliance_framework && <ComplianceBadge />}
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {template.name}
          </h1>
          {template.description && (
            <p className="text-sm text-muted-foreground mt-1">
              {template.description}
            </p>
          )}
        </div>

        {/* Fork to school button */}
        <Link
          href={`/${tenant}/pedagogy/curriculum?fork=${templateId}`}
          className="shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium
                     bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z"
            />
          </svg>
          Fork to School
        </Link>
      </div>

      {/* Metadata Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <MetadataCard label="Framework" value={template.framework ?? "—"} />
        <MetadataCard label="Age Range" value={template.age_range ?? "—"} />
        <MetadataCard
          label="Country"
          value={
            [template.country, template.state].filter(Boolean).join(" / ") ||
            "—"
          }
        />
        <MetadataCard label="Version" value={template.version ?? "—"} />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <ActionCard
          href={`/${tenant}/pedagogy/content-library/materials`}
          title="Search Materials"
          description="Find outcomes by material name within this framework"
          icon={<CubeIcon />}
        />
        {template.is_compliance_framework && (
          <ActionCard
            href={`/${tenant}/pedagogy/content-library/compliance?template=${templateId}`}
            title="Compliance Report"
            description="Generate evidence report for this compliance framework"
            icon={<ShieldIcon />}
          />
        )}
        <ActionCard
          href={`/${tenant}/pedagogy/content-library/cross-mappings?template=${templateId}`}
          title="Cross-Mappings"
          description="View how outcomes map to other frameworks"
          icon={<MappingIcon />}
        />
      </div>

      {/* Cross-mapping summary with compliance frameworks */}
      {complianceTemplates.length > 0 && !template.is_compliance_framework && (
        <section>
          <h2 className="text-sm font-medium mb-3">
            Compliance Framework Mappings
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {complianceTemplates.map((ct) => (
              <Link
                key={ct.id}
                href={`/${tenant}/pedagogy/content-library/cross-mappings?source=${templateId}&target=${ct.id}`}
                className="flex items-center gap-3 rounded-lg border border-border p-3
                           hover:bg-muted/30 transition-colors"
              >
                <FrameworkDot framework={ct.framework ?? "Other"} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{ct.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {ct.framework} · {ct.age_range ?? "All ages"}
                  </p>
                </div>
                <svg
                  className="w-4 h-4 text-muted-foreground shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8.25 4.5l7.5 7.5-7.5 7.5"
                  />
                </svg>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// ============================================================
// Sub-components
// ============================================================

function MetadataCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <dt className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1">
        {label}
      </dt>
      <dd className="text-sm font-medium">{value}</dd>
    </div>
  );
}

function ActionCard({
  href,
  title,
  description,
  icon,
}: {
  href: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-start gap-3 rounded-lg border border-border p-4
                 hover:bg-muted/30 hover:border-primary/30 transition-all group"
    >
      <div className="p-2 rounded-md bg-muted group-hover:bg-primary/10 transition-colors">
        {icon}
      </div>
      <div>
        <h3 className="text-sm font-medium group-hover:text-primary transition-colors">
          {title}
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
    </Link>
  );
}

function FrameworkBadge({ framework }: { framework: string }) {
  const colors: Record<string, string> = {
    AMI: "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
    AMS: "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300",
    EYLF: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
    ACARA:
      "bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300",
    QCAA: "bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300",
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                  ${colors[framework] ?? "bg-muted text-muted-foreground"}`}
    >
      {framework}
    </span>
  );
}

function ComplianceBadge() {
  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium
                     bg-orange-100 text-orange-800 dark:bg-orange-950/40 dark:text-orange-300"
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
  );
}

function FrameworkDot({ framework }: { framework: string }) {
  const colorMap: Record<string, string> = {
    AMI: "bg-amber-500",
    AMS: "bg-blue-500",
    EYLF: "bg-emerald-500",
    ACARA: "bg-purple-500",
    QCAA: "bg-rose-500",
  };
  return (
    <span
      className={`w-2.5 h-2.5 rounded-full shrink-0 ${colorMap[framework] ?? "bg-gray-400"}`}
    />
  );
}

// Icons
function ChevronRight() {
  return (
    <svg
      className="w-3.5 h-3.5"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8.25 4.5l7.5 7.5-7.5 7.5"
      />
    </svg>
  );
}

function CubeIcon() {
  return (
    <svg
      className="w-5 h-5 text-amber-600 dark:text-amber-400"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9"
      />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg
      className="w-5 h-5 text-orange-600 dark:text-orange-400"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
      />
    </svg>
  );
}

function MappingIcon() {
  return (
    <svg
      className="w-5 h-5 text-emerald-600 dark:text-emerald-400"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"
      />
    </svg>
  );
}
