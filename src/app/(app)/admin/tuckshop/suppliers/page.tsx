import { redirect } from "next/navigation";
import Link from "next/link";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { listSuppliers } from "@/lib/actions/tuckshop";
import { SupplierManagerClient } from "@/components/domain/tuckshop/supplier-manager-client";

export const metadata = { title: "Tuckshop Suppliers - WattleOS" };

export default async function TuckshopSuppliersPage() {
  const context = await getTenantContext();
  if (!hasPermission(context, Permissions.MANAGE_TUCKSHOP)) {
    redirect("/dashboard");
  }

  const result = await listSuppliers();

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/tuckshop"
          className="text-sm underline-offset-2 hover:underline"
          style={{ color: "var(--muted-foreground)" }}
        >
          ← Tuckshop
        </Link>
      </div>

      <div>
        <h1
          className="text-xl font-bold sm:text-2xl"
          style={{ color: "var(--foreground)" }}
        >
          Suppliers
        </h1>
        <p
          className="mt-1 text-sm"
          style={{ color: "var(--muted-foreground)" }}
        >
          Manage tuckshop vendors and their delivery schedules
        </p>
      </div>

      <SupplierManagerClient suppliers={result.data ?? []} />
    </div>
  );
}
