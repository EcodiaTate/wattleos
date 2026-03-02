// src/app/(app)/comms/newsletters/templates/page.tsx
//
// Newsletter template management page.

import Link from "next/link";
import { TemplateListClient } from "@/components/domain/newsletter/template-list-client";
import { listNewsletterTemplates } from "@/lib/actions/comms/newsletter";
import { hasPermission, getTenantContext } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";

export const metadata = { title: "Newsletter Templates - WattleOS" };

export default async function NewsletterTemplatesPage() {
  const ctx = await getTenantContext();
  const canManage = hasPermission(ctx, Permissions.MANAGE_NEWSLETTER);

  const result = await listNewsletterTemplates();

  return (
    <div className="space-y-4">
      <Link
        href="/comms/newsletters"
        className="text-sm"
        style={{ color: "var(--primary)" }}
      >
        &larr; Newsletter Dashboard
      </Link>

      <TemplateListClient
        templates={result.data ?? []}
        canManage={canManage}
      />
    </div>
  );
}
