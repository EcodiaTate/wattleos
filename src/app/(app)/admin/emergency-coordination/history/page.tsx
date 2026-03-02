import { redirect } from "next/navigation";
import Link from "next/link";
import {
  getTenantContext,
  hasPermission,
} from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { getEventHistory } from "@/lib/actions/emergency-coordination";
import { EmergencyStatusBadge } from "@/components/domain/emergency-coordination/emergency-status-badge";
import { SeverityBadge } from "@/components/domain/emergency-coordination/severity-badge";
import type { EmergencyEventStatus, EmergencyEventSeverity } from "@/types/domain";

const EVENT_TYPE_LABELS: Record<string, string> = {
  fire_evacuation: "Fire Evacuation",
  lockdown: "Lockdown",
  shelter_in_place: "Shelter in Place",
  medical_emergency: "Medical Emergency",
  other: "Other",
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-AU", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export const metadata = { title: "Event History - WattleOS" };

export default async function EmergencyHistoryPage() {
  const context = await getTenantContext();

  const canView =
    hasPermission(context, Permissions.VIEW_EMERGENCY_COORDINATION) ||
    hasPermission(context, Permissions.COORDINATE_EMERGENCY) ||
    hasPermission(context, Permissions.ACTIVATE_EMERGENCY);
  if (!canView) redirect("/dashboard");

  const result = await getEventHistory();

  if (result.error || !result.data) {
    return (
      <div className="p-4 sm:p-6">
        <p style={{ color: "var(--destructive)" }}>
          {result.error?.message ?? "Failed to load event history."}
        </p>
      </div>
    );
  }

  const events = result.data;

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
        <span style={{ color: "var(--foreground)" }}>History</span>
      </div>

      <div>
        <h1
          className="text-xl font-bold sm:text-2xl"
          style={{ color: "var(--foreground)" }}
        >
          Event History
        </h1>
        <p
          className="mt-1 text-sm"
          style={{ color: "var(--muted-foreground)" }}
        >
          Complete record of all emergency events
        </p>
      </div>

      {events.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12">
          <span
            className="text-3xl mb-3"
            style={{ color: "var(--empty-state-icon)" }}
          >
            📋
          </span>
          <p
            className="text-sm font-medium"
            style={{ color: "var(--foreground)" }}
          >
            No events recorded
          </p>
          <p
            className="text-xs mt-1"
            style={{ color: "var(--muted-foreground)" }}
          >
            Emergency events will appear here after activation.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {events.map((event) => (
            <Link
              key={event.id}
              href={`/admin/emergency-coordination/${event.id}`}
              className="active-push card-interactive flex items-center gap-3 rounded-[var(--radius-lg)] border border-border p-3"
              style={{ backgroundColor: "var(--card)" }}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p
                    className="text-sm font-medium truncate"
                    style={{ color: "var(--foreground)" }}
                  >
                    {EVENT_TYPE_LABELS[event.event_type] ?? event.event_type}
                  </p>
                  <SeverityBadge severity={event.severity as EmergencyEventSeverity} />
                </div>
                <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                  {formatDateTime(event.activated_at)}
                  {event.activated_by_user &&
                    ` · ${event.activated_by_user.first_name} ${event.activated_by_user.last_name}`}
                </p>
              </div>
              <EmergencyStatusBadge status={event.status as EmergencyEventStatus} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
