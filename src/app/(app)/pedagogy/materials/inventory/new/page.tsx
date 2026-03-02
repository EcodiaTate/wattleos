// src/app/(app)/pedagogy/materials/inventory/new/page.tsx
import { redirect } from "next/navigation";
import Link from "next/link";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { listShelfLocations } from "@/lib/actions/materials";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { InventoryItemForm } from "@/components/domain/materials/inventory-item-form";
import type { MontessoriMaterial } from "@/types/domain";

export const metadata = { title: "Add Inventory Item - WattleOS" };

export default async function NewInventoryItemPage({
  searchParams,
}: {
  searchParams: Promise<{ material_id?: string }>;
}) {
  const context = await getTenantContext();

  if (!hasPermission(context, Permissions.MANAGE_MATERIAL_INVENTORY)) {
    redirect("/pedagogy/materials");
  }

  const params = await searchParams;

  const db = await createSupabaseServerClient();
  const [locationsResult, materialsRes] = await Promise.all([
    listShelfLocations(),
    db
      .from("montessori_materials")
      .select("id, name, area, age_level")
      .or(`tenant_id.eq.${context.tenant.id},tenant_id.is.null`)
      .eq("is_active", true)
      .order("area")
      .order("sequence_order"),
  ]);

  const locations = !locationsResult.error ? locationsResult.data! : [];
  const materials = (materialsRes.data ?? []) as Pick<MontessoriMaterial, "id" | "name" | "area" | "age_level">[];

  return (
    <main className="p-4 sm:p-6 scroll-native">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs mb-5" style={{ color: "var(--text-tertiary)" }}>
        <Link href="/pedagogy/materials" className="hover:underline">Materials</Link>
        <span>/</span>
        <Link href="/pedagogy/materials/inventory" className="hover:underline">Inventory</Link>
        <span>/</span>
        <span style={{ color: "var(--text-primary)" }}>Add Item</span>
      </div>

      <h1 className="text-xl font-bold mb-6" style={{ color: "var(--text-primary)" }}>
        Add Inventory Item
      </h1>

      <InventoryItemForm
        materials={materials}
        locations={locations}
        defaultMaterialId={params.material_id}
      />
    </main>
  );
}
