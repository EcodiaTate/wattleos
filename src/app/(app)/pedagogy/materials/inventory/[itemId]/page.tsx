// src/app/(app)/pedagogy/materials/inventory/[itemId]/page.tsx
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { getInventoryItem } from "@/lib/actions/materials";
import { InventoryDetailClient } from "@/components/domain/materials/inventory-detail-client";

export const metadata = { title: "Inventory Item - WattleOS" };

export default async function InventoryItemDetailPage({
  params,
}: {
  params: Promise<{ itemId: string }>;
}) {
  const context = await getTenantContext();

  const canView = hasPermission(context, Permissions.VIEW_MATERIAL_INVENTORY) ||
                  hasPermission(context, Permissions.MANAGE_MATERIAL_INVENTORY);
  if (!canView) redirect("/dashboard");

  const canManage = hasPermission(context, Permissions.MANAGE_MATERIAL_INVENTORY);
  const { itemId } = await params;

  const result = await getInventoryItem(itemId);
  if (result.error) notFound();

  const { item, student_introductions } = result.data!;

  return (
    <main className="p-4 sm:p-6 scroll-native">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs mb-5" style={{ color: "var(--text-tertiary)" }}>
        <Link href="/pedagogy/materials" className="hover:underline">Materials</Link>
        <span>/</span>
        <Link href="/pedagogy/materials/inventory" className="hover:underline">Inventory</Link>
        <span>/</span>
        <span style={{ color: "var(--text-primary)" }}>{item.material?.name ?? "Item"}</span>
      </div>

      <InventoryDetailClient
        item={item}
        studentIntroductions={student_introductions}
        canManage={canManage}
      />
    </main>
  );
}
