import { redirect } from "next/navigation";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import {
  getTuckshopDashboard,
  listMenuItems,
  listSuppliers,
} from "@/lib/actions/tuckshop";
import { CoordinatorDashboardClient } from "@/components/domain/tuckshop/coordinator-dashboard-client";
import { MenuManagerClient } from "@/components/domain/tuckshop/menu-manager-client";

export const metadata = { title: "Tuckshop - WattleOS" };

interface PageProps {
  searchParams: Promise<{ tab?: string }>;
}

export default async function TuckshopAdminPage({ searchParams }: PageProps) {
  const context = await getTenantContext();
  if (!hasPermission(context, Permissions.MANAGE_TUCKSHOP)) {
    redirect("/dashboard");
  }

  const sp = await searchParams;
  const activeTab = sp.tab === "menu" ? "menu" : "dashboard";

  const [dashboardResult, menuResult, suppliersResult] = await Promise.all([
    getTuckshopDashboard(),
    listMenuItems({ include_inactive: true }),
    listSuppliers(),
  ]);

  if (dashboardResult.error || !dashboardResult.data) {
    return (
      <div className="p-4 sm:p-6">
        <p style={{ color: "var(--destructive)" }}>
          {dashboardResult.error?.message ?? "Failed to load tuckshop."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1
            className="text-xl font-bold sm:text-2xl"
            style={{ color: "var(--foreground)" }}
          >
            Tuckshop
          </h1>
          <p
            className="mt-1 text-sm"
            style={{ color: "var(--muted-foreground)" }}
          >
            Manage orders, menu items, suppliers, and delivery weeks
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div
        className="flex gap-1 rounded-xl border border-border p-1"
        style={{ backgroundColor: "var(--muted)" }}
      >
        {[
          { value: "dashboard", label: "Dashboard" },
          { value: "menu", label: "Menu Items" },
        ].map((tab) => (
          <a
            key={tab.value}
            href={
              tab.value === "dashboard"
                ? "/admin/tuckshop"
                : `/admin/tuckshop?tab=${tab.value}`
            }
            className="flex-1 rounded-lg py-2 text-center text-sm font-medium transition-colors"
            style={{
              backgroundColor:
                activeTab === tab.value ? "var(--card)" : "transparent",
              color:
                activeTab === tab.value
                  ? "var(--foreground)"
                  : "var(--muted-foreground)",
            }}
          >
            {tab.label}
          </a>
        ))}
      </div>

      {activeTab === "dashboard" ? (
        <CoordinatorDashboardClient dashboard={dashboardResult.data} />
      ) : (
        <MenuManagerClient
          items={menuResult.data ?? []}
          suppliers={suppliersResult.data ?? []}
        />
      )}
    </div>
  );
}
