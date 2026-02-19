// src/app/(app)/reports/templates/new/page.tsx
//
// ============================================================
// WattleOS V2 - Create New Report Template
// ============================================================
// Simple form: name + optional cycle level. On submit, creates
// the template with default sections and redirects to the
// builder for customization.
//
// WHY separate page: Gives schools a clean entry point rather
// than dumping them directly into the builder with an unnamed
// template. The name is required upfront.
// ============================================================

import { NewTemplateForm } from "@/components/domain/reports/NewTemplateForm";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function NewTemplatePage() {
  const context = await getTenantContext();

  if (!hasPermission(context, Permissions.MANAGE_REPORTS)) {
    redirect("/dashboard");
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/reports" className="hover:text-foreground">
            Reports
          </Link>
          <span className="text-muted-foreground">/</span>
          <Link href="/reports/templates" className="hover:text-foreground">
            Templates
          </Link>
          <span className="text-muted-foreground">/</span>
          <span className="text-foreground">New</span>
        </div>
        <h1 className="mt-2 text-2xl font-bold text-foreground">
          Create Report Template
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Name your template and choose a cycle level. You&apos;ll customize the
          sections next.
        </p>
      </div>

      <NewTemplateForm />
    </div>
  );
}
