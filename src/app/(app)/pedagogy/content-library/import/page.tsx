// src/app/(app)/(app)/pedagogy/content-library/import/page.tsx
//
// ============================================================
// WattleOS V2 - Module 14: Template Import Page
// ============================================================
// Admins upload JSON files matching the JsonTemplateImport spec.
// The page validates the JSON client-side, previews metadata,
// then calls importJsonTemplate() server action.
//
// WHY a dedicated page: JSON import is a destructive admin
// operation (creates global templates + cross-mappings). It
// deserves its own space with clear instructions, validation
// feedback, and a preview step before committing.
// ============================================================

import { JsonTemplateUploader } from "@/components/domain/curriculum-content/json-template-uploader";
import { listTemplatesFiltered } from "@/lib/actions/curriculum-content";
import { requirePermission } from "@/lib/auth/tenant-context";
import Link from "next/link";

interface ImportPageProps {
  params: Promise<{ tenant: string }>;
}

export default async function ImportPage({ params }: ImportPageProps) {
  const { tenant } = await params;

  // Gate: only users with manage_curriculum_templates can access
  await requirePermission("manage_curriculum_templates");

  // Fetch existing templates so we can show what's already imported
  const templatesResult = await listTemplatesFiltered({});
  const existingTemplates = templatesResult.data ?? [];
  const existingSlugs = existingTemplates.map((t) => t.name);

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Instructions */}
      <div className="rounded-lg border border-border p-6 space-y-4">
        <h2 className="text-lg font-medium">Import a Curriculum Template</h2>
        <p className="text-sm text-muted-foreground">
          Upload a JSON file matching the WattleOS template format. The file
          will be validated before import. Each template creates a global
          curriculum framework that schools can fork into their own editable
          instance.
        </p>

        <div className="rounded-md bg-muted/50 p-4 space-y-2">
          <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Required JSON Structure
          </h3>
          <pre className="text-xs text-muted-foreground overflow-x-auto">
            {`{
  "slug": "ami-primary-3-6",
  "name": "AMI Primary 3–6",
  "framework": "AMI",
  "age_range": "3-6",
  "country": "AU",
  "version": "2026.1",
  "is_compliance_framework": false,
  "nodes": [
    {
      "level": "area",
      "title": "Practical Life",
      "code": "PL",
      "children": [
        {
          "level": "strand",
          "title": "Preliminary Exercises",
          "code": "PL-PE",
          "children": [
            {
              "level": "outcome",
              "title": "Carrying a chair",
              "code": "PL-PE-001",
              "materials": ["Child-sized chair"],
              "direct_aims": ["Coordination of movement"],
              "indirect_aims": ["Independence"],
              "age_range": "2.5-4",
              "cross_mappings": [
                { "framework": "EYLF", "code": "EYLF-3.2", "type": "aligned" }
              ]
            }
          ]
        }
      ]
    }
  ]
}`}
          </pre>
        </div>

        {/* Download sample template link */}
        <p className="text-xs text-muted-foreground">
          Need help?{" "}
          <a
            href="/api/curriculum-template-sample"
            className="text-primary hover:underline"
          >
            Download a sample JSON template
          </a>{" "}
          to use as a starting point.
        </p>
      </div>

      {/* Uploader Component */}
      <JsonTemplateUploader />

      {/* Existing Templates */}
      {existingTemplates.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium">
            Already Imported ({existingTemplates.length})
          </h3>
          <div className="rounded-lg border border-border divide-y divide-border">
            {existingTemplates.map((t) => (
              <div
                key={t.id}
                className="flex items-center gap-3 px-4 py-3"
              >
                <FrameworkDot framework={t.framework ?? ""} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{t.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {t.framework} · {t.age_range ?? "All ages"} ·{" "}
                    {t.version ?? "v1"}
                    {t.is_compliance_framework && (
                      <span className="ml-1 text-orange-600 dark:text-orange-400">
                        · Compliance
                      </span>
                    )}
                  </p>
                </div>
                <Link
                  href={`/pedagogy/content-library/template/${t.id}`}
                  className="text-xs text-primary hover:underline shrink-0"
                >
                  View
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
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
