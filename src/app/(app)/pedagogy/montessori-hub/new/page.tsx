// src/app/(app)/pedagogy/montessori-hub/new/page.tsx
// ============================================================
// Create new article (admin/guides only)
// ============================================================

import { redirect } from "next/navigation";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { HubArticleForm } from "@/components/domain/montessori-hub/hub-article-form";

export const metadata = { title: "New Hub Article - WattleOS" };

export default async function NewHubArticlePage() {
  const context = await getTenantContext();

  if (!hasPermission(context, Permissions.MANAGE_MONTESSORI_HUB)) {
    redirect("/pedagogy/montessori-hub");
  }

  return (
    <div className="py-4">
      <HubArticleForm />
    </div>
  );
}
