// src/app/(app)/pedagogy/montessori-hub/[slug]/edit/page.tsx
// ============================================================
// Edit existing article (admin/guides only)
// ============================================================

import { redirect, notFound } from "next/navigation";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { getHubArticleBySlug } from "@/lib/actions/montessori-hub";
import { HubArticleForm } from "@/components/domain/montessori-hub/hub-article-form";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function HubArticleEditPage({ params }: Props) {
  const { slug } = await params;
  const context = await getTenantContext();

  if (!hasPermission(context, Permissions.MANAGE_MONTESSORI_HUB)) redirect("/pedagogy/montessori-hub");

  const result = await getHubArticleBySlug(slug);
  if (result.error || !result.data) notFound();

  return (
    <div className="py-4">
      <HubArticleForm article={result.data} />
    </div>
  );
}
