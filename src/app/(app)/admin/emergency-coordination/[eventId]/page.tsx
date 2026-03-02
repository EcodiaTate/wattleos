import { redirect } from "next/navigation";
import Link from "next/link";
import {
  getTenantContext,
  hasPermission,
} from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { getEventDetail } from "@/lib/actions/emergency-coordination";
import { EventSummaryClient } from "@/components/domain/emergency-coordination/event-summary-client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  return { title: `Event ${eventId.slice(0, 8)} - WattleOS` };
}

export default async function EmergencyEventDetailPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const context = await getTenantContext();

  const canView =
    hasPermission(context, Permissions.VIEW_EMERGENCY_COORDINATION) ||
    hasPermission(context, Permissions.COORDINATE_EMERGENCY) ||
    hasPermission(context, Permissions.ACTIVATE_EMERGENCY);
  if (!canView) redirect("/dashboard");

  const result = await getEventDetail(eventId);

  if (result.error || !result.data) {
    return (
      <div className="p-4 sm:p-6">
        <p style={{ color: "var(--destructive)" }}>
          {result.error?.message ?? "Event not found."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <Link
          href="/admin/emergency-coordination"
          className="underline-offset-2 hover:underline"
          style={{ color: "var(--primary)" }}
        >
          Emergency Coordination
        </Link>
        <span style={{ color: "var(--muted-foreground)" }}>/</span>
        <Link
          href="/admin/emergency-coordination/history"
          className="underline-offset-2 hover:underline"
          style={{ color: "var(--primary)" }}
        >
          History
        </Link>
        <span style={{ color: "var(--muted-foreground)" }}>/</span>
        <span style={{ color: "var(--foreground)" }}>
          {eventId.slice(0, 8)}
        </span>
      </div>

      <EventSummaryClient data={result.data} />
    </div>
  );
}
