// src/app/(app)/pedagogy/montessori-hub/[slug]/page.tsx
// ============================================================
// Article reader page
// ============================================================

import { redirect, notFound } from "next/navigation";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { getHubArticleBySlug } from "@/lib/actions/montessori-hub";
import { HubArticleViewer } from "@/components/domain/montessori-hub/hub-article-viewer";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function HubArticlePage({ params }: Props) {
  const { slug } = await params;
  const context = await getTenantContext();

  const canView =
    hasPermission(context, Permissions.VIEW_MONTESSORI_HUB) ||
    hasPermission(context, Permissions.MANAGE_MONTESSORI_HUB);

  if (!canView) redirect("/dashboard");

  const canManage = hasPermission(context, Permissions.MANAGE_MONTESSORI_HUB);

  const result = await getHubArticleBySlug(slug);
  if (result.error || !result.data) notFound();

  return <HubArticleViewer article={result.data} canManage={canManage} />;
}
