import { redirect } from "next/navigation";
import Link from "next/link";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { listDeliveryWeeks, listSuppliers } from "@/lib/actions/tuckshop";
import { DeliveryTrackerClient } from "@/components/domain/tuckshop/delivery-tracker-client";

export const metadata = { title: "Delivery Weeks - Tuckshop - WattleOS" };

interface PageProps {
  searchParams: Promise<{ week?: string }>;
}

export default async function TuckshopDeliveriesPage({
  searchParams,
}: PageProps) {
  const context = await getTenantContext();
  if (!hasPermission(context, Permissions.MANAGE_TUCKSHOP)) {
    redirect("/dashboard");
  }

  const sp = await searchParams;

  const [weeksResult, suppliersResult] = await Promise.all([
    listDeliveryWeeks(),
    listSuppliers(),
  ]);

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
          Delivery Weeks
        </h1>
        <p
          className="mt-1 text-sm"
          style={{ color: "var(--muted-foreground)" }}
        >
          Manage weekly order cycles - open, order from supplier, receive,
          finalize
        </p>
      </div>

      <DeliveryTrackerClient
        deliveryWeeks={weeksResult.data ?? []}
        suppliers={suppliersResult.data ?? []}
        focusWeekId={sp.week ?? null}
      />
    </div>
  );
}
