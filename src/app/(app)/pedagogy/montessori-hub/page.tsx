// src/app/(app)/pedagogy/montessori-hub/page.tsx
// ============================================================
// Parent Montessori Literacy Hub - Dashboard
// ============================================================

import { redirect } from "next/navigation";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { getHubDashboard } from "@/lib/actions/montessori-hub";
import { HubDashboardClient } from "@/components/domain/montessori-hub/hub-dashboard-client";

export const metadata = { title: "Montessori Hub - WattleOS" };

export default async function MontessoriHubPage() {
  const context = await getTenantContext();

  const canView =
    hasPermission(context, Permissions.VIEW_MONTESSORI_HUB) ||
    hasPermission(context, Permissions.MANAGE_MONTESSORI_HUB);

  if (!canView) redirect("/dashboard");

  const canManage = hasPermission(context, Permissions.MANAGE_MONTESSORI_HUB);

  const result = await getHubDashboard();
  const data = result.data ?? {
    total_articles: 0,
    published_articles: 0,
    articles_read_by_user: 0,
    bookmarked_by_user: 0,
    by_category: [],
    recent: [],
    bookmarks: [],
  };

  return <HubDashboardClient data={data} canManage={canManage} />;
}
