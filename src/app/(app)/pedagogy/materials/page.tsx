// src/app/(app)/pedagogy/materials/page.tsx
import { redirect } from "next/navigation";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { getMaterialInventoryDashboard } from "@/lib/actions/materials";
import { InventoryDashboardClient } from "@/components/domain/materials/inventory-dashboard-client";

export const metadata = { title: "Material Inventory - WattleOS" };

export default async function MaterialInventoryPage() {
  const context = await getTenantContext();

  const canView = hasPermission(context, Permissions.VIEW_MATERIAL_INVENTORY) ||
                  hasPermission(context, Permissions.MANAGE_MATERIAL_INVENTORY);
  if (!canView) redirect("/dashboard");

  const canManage = hasPermission(context, Permissions.MANAGE_MATERIAL_INVENTORY);

  const dashResult = await getMaterialInventoryDashboard();

  if (dashResult.error) {
    return (
      <main className="p-6">
        <p className="text-sm" style={{ color: "var(--color-error)" }}>
          Failed to load inventory data.
        </p>
      </main>
    );
  }

  return (
    <main className="p-4 sm:p-6 scroll-native">
      <InventoryDashboardClient data={dashResult.data!} canManage={canManage} />
    </main>
  );
}
