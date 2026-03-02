// src/app/(app)/pedagogy/materials/locations/page.tsx
import { redirect } from "next/navigation";
import Link from "next/link";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { listShelfLocations } from "@/lib/actions/materials";
import { ShelfLocationListClient } from "@/components/domain/materials/shelf-location-list-client";

export const metadata = { title: "Shelf Locations - WattleOS" };

export default async function ShelfLocationsPage() {
  const context = await getTenantContext();

  const canView = hasPermission(context, Permissions.VIEW_MATERIAL_INVENTORY) ||
                  hasPermission(context, Permissions.MANAGE_MATERIAL_INVENTORY);
  if (!canView) redirect("/dashboard");

  const canManage = hasPermission(context, Permissions.MANAGE_MATERIAL_INVENTORY);

  const result = await listShelfLocations();
  const locations = !result.error ? result.data! : [];

  return (
    <main className="p-4 sm:p-6 scroll-native">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs mb-5" style={{ color: "var(--text-tertiary)" }}>
        <Link href="/pedagogy/materials" className="hover:underline">Materials</Link>
        <span>/</span>
        <span style={{ color: "var(--text-primary)" }}>Shelf Locations</span>
      </div>

      <div className="mb-6">
        <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>Shelf Locations</h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          Configure the rooms and shelves in your prepared environment.
          {" "}Locations are used to organise inventory items.
        </p>
      </div>

      <div className="max-w-2xl">
        <ShelfLocationListClient
          initialLocations={locations}
          canManage={canManage}
        />
      </div>
    </main>
  );
}
