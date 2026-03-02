import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { getDailyCareLogConfig } from "@/lib/actions/daily-care-config";
import { getClass } from "@/lib/actions/classes";
import { FieldConfigBuilder } from "@/components/domain/daily-care-log/field-config-builder";

export const metadata = { title: "Configure Care Log Fields - WattleOS" };

interface PageProps {
  params: Promise<{ classId: string }>;
}

export default async function DailyCareLogFieldConfigPage({
  params,
}: PageProps) {
  const { classId } = await params;

  const context = await getTenantContext();

  if (!hasPermission(context, Permissions.MANAGE_DAILY_CARE_LOGS)) {
    redirect("/admin/daily-care-log");
  }

  const [classResult, configResult] = await Promise.all([
    getClass(classId),
    getDailyCareLogConfig(classId),
  ]);

  if (!classResult.data || classResult.error) {
    notFound();
  }

  if (configResult.error || !configResult.data) {
    return (
      <div className="p-4 sm:p-6">
        <p style={{ color: "var(--destructive)" }}>
          {configResult.error?.message ?? "Failed to load field configuration."}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4 sm:p-6">
      {/* Breadcrumb */}
      <nav
        className="flex items-center gap-2 text-sm"
        style={{ color: "var(--muted-foreground)" }}
      >
        <Link
          href="/admin/daily-care-log"
          className="hover:underline"
          style={{ color: "var(--muted-foreground)" }}
        >
          Daily Care Log
        </Link>
        <span>/</span>
        <span style={{ color: "var(--foreground)" }}>Configure Fields</span>
      </nav>

      {/* Page heading */}
      <div>
        <h1
          className="text-xl font-bold sm:text-2xl"
          style={{ color: "var(--foreground)" }}
        >
          Field Configuration
        </h1>
        <p
          className="mt-1 text-sm"
          style={{ color: "var(--muted-foreground)" }}
        >
          Control which care entry types are recorded for this room (Reg 162)
        </p>
      </div>

      {/* Config builder */}
      <div
        className="rounded-xl border p-4 sm:p-6"
        style={{ borderColor: "var(--border)" }}
      >
        <FieldConfigBuilder
          classId={classId}
          className={classResult.data.name}
          initialConfigs={configResult.data}
        />
      </div>

      {/* Guidance */}
      <div
        className="rounded-xl border p-4 text-sm"
        style={{
          borderColor: "var(--border)",
          color: "var(--muted-foreground)",
        }}
      >
        <p className="font-medium" style={{ color: "var(--foreground)" }}>
          Reg 162 guidance
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-4">
          <li>
            Records must be kept for each child under preschool age (under 3
            years).
          </li>
          <li>
            You may disable fields not relevant to your room - e.g. preschool
            rooms may not need nappy tracking.
          </li>
          <li>
            Disabling a field only affects new entries; existing records are
            preserved.
          </li>
          <li>
            Changes are audit-logged and take effect immediately for all
            educators in this room.
          </li>
        </ul>
      </div>
    </div>
  );
}
