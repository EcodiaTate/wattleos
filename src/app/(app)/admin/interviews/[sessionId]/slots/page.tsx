// src/app/(app)/admin/interviews/[sessionId]/slots/page.tsx
// Admin: manage slots for a session + generate new slots

import { redirect, notFound } from "next/navigation";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import {
  getInterviewSessionDashboard,
  listSlotsForSession,
} from "@/lib/actions/interviews";
import { SlotGenerator } from "@/components/domain/interviews/slot-generator";
import { SlotAvailabilityBadge } from "@/components/domain/interviews/interview-status-badge";
import { createSupabaseServerClient } from "@/lib/supabase/server";

interface Props {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<{ staff?: string }>;
}

function formatTime(t: string) {
  const [h, m] = t.split(":");
  const hour = parseInt(h, 10);
  const suffix = hour >= 12 ? "pm" : "am";
  const h12 = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${h12}:${m}${suffix}`;
}

function formatDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export default async function ManageSlotsPage({ params, searchParams }: Props) {
  const { sessionId } = await params;
  const { staff: staffFilter } = await searchParams;

  const context = await getTenantContext();
  if (!context) redirect("/auth/login");

  const canManage = hasPermission(context, Permissions.MANAGE_INTERVIEW_SESSIONS);
  if (!canManage) redirect(`/admin/interviews/${sessionId}`);

  const [dashResult, slotsResult] = await Promise.all([
    getInterviewSessionDashboard(sessionId),
    listSlotsForSession({
      sessionId,
      staffUserId: staffFilter || undefined,
      availableOnly: false,
    }),
  ]);

  if (dashResult.error || !dashResult.data) notFound();

  // Fetch tenant staff for the slot generator
  const supabase = await createSupabaseServerClient();
  const { data: staffUsers } = await supabase
    .from("tenant_members")
    .select("user_id, users!user_id(id, first_name, last_name)")
    .eq("tenant_id", context.tenant.id)
    .eq("is_active", true);

  type StaffUserRow = {
    user_id: string;
    users: { id: string; first_name: string; last_name: string } | { id: string; first_name: string; last_name: string }[] | null;
  };
  const staff = (staffUsers ?? [])
    .map((m) => {
      const u = (m as unknown as StaffUserRow).users;
      return Array.isArray(u) ? (u[0] ?? null) : u;
    })
    .filter((u): u is { id: string; first_name: string; last_name: string } => u !== null);

  const slots = slotsResult.error || !slotsResult.data ? [] : slotsResult.data;

  // Group slots by date
  const byDate = slots.reduce<Record<string, typeof slots>>((acc, slot) => {
    if (!acc[slot.slot_date]) acc[slot.slot_date] = [];
    acc[slot.slot_date].push(slot);
    return acc;
  }, {});
  const dates = Object.keys(byDate).sort();

  const session = dashResult.data!.session;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 pb-tab-bar space-y-6">
      <div>
        <h1 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>
          Manage Slots
        </h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--muted-foreground)" }}>
          {session.title} · {session.slot_duration_mins}-min slots
        </p>
      </div>

      {/* Slot generator */}
      <div
        className="rounded-2xl p-5"
        style={{ background: "var(--muted)", border: "1px solid var(--border)" }}
      >
        <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--foreground)" }}>
          Generate slots
        </h2>
        <SlotGenerator
          sessionId={sessionId}
          staff={staff}
        />
      </div>

      {/* Slot list */}
      <div>
        <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--foreground)" }}>
          Existing slots ({slots.length})
        </h2>

        {dates.length === 0 ? (
          <div
            className="rounded-2xl p-10 text-center"
            style={{ background: "var(--muted)", border: "1px solid var(--border)" }}
          >
            <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
              No slots yet. Use the generator above to create them.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {dates.map((date) => (
              <div key={date}>
                <p className="text-xs font-semibold mb-2" style={{ color: "var(--muted-foreground)" }}>
                  {formatDate(date)}
                </p>
                <div className="space-y-2">
                  {byDate[date].map((slot) => {
                    const isBooked = !!slot.booking;
                    return (
                      <div
                        key={slot.id}
                        className="rounded-xl px-4 py-3 flex items-center justify-between"
                        style={{ background: "var(--muted)", border: "1px solid var(--border)" }}
                      >
                        <div>
                          <p className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
                            {formatTime(slot.start_time)} – {formatTime(slot.end_time)}
                          </p>
                          <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                            {slot.staff.first_name} {slot.staff.last_name}
                            {slot.location && ` · ${slot.location}`}
                          </p>
                          {isBooked && slot.booking && (
                            <p className="text-xs mt-0.5" style={{ color: "var(--foreground)" }}>
                              Booked: {slot.booking.student.first_name} {slot.booking.student.last_name}
                              {" · "}{slot.booking.guardian_name}
                            </p>
                          )}
                        </div>
                        <SlotAvailabilityBadge
                          isBlocked={slot.is_blocked}
                          isBooked={isBooked}
                          size="sm"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
