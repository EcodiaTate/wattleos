// src/app/(app)/pedagogy/materials/inventory/page.tsx
import { redirect } from "next/navigation";
import Link from "next/link";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { listInventoryItems, listShelfLocations } from "@/lib/actions/materials";
import { InventoryListClient } from "@/components/domain/materials/inventory-list-client";

export const metadata = { title: "Inventory List - WattleOS" };

export default async function InventoryListPage() {
  const context = await getTenantContext();

  const canView = hasPermission(context, Permissions.VIEW_MATERIAL_INVENTORY) ||
                  hasPermission(context, Permissions.MANAGE_MATERIAL_INVENTORY);
  if (!canView) redirect("/dashboard");

  const canManage = hasPermission(context, Permissions.MANAGE_MATERIAL_INVENTORY);

  const [itemsResult, locationsResult] = await Promise.all([
    listInventoryItems({ per_page: 100 }),
    listShelfLocations(),
  ]);

  const items     = !itemsResult.error     ? itemsResult.data!.items  : [];
  const locations = !locationsResult.error ? locationsResult.data!    : [];

  return (
    <main className="p-4 sm:p-6 scroll-native">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs mb-5" style={{ color: "var(--text-tertiary)" }}>
        <Link href="/pedagogy/materials" className="hover:underline">Materials</Link>
        <span>/</span>
        <span style={{ color: "var(--text-primary)" }}>All Inventory</span>
      </div>

      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>All Inventory Items</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>
            Every physical material recorded in your environment
          </p>
        </div>
      </div>

      <InventoryListClient
        initialItems={items}
        locations={locations}
        canManage={canManage}
      />
    </main>
  );
}
