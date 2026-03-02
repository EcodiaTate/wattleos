import { redirect } from "next/navigation";
import Link from "next/link";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getExcursion } from "@/lib/actions/excursions";
import { getTransportBooking } from "@/lib/actions/transport-bookings";
import { ExcursionStatusBadge } from "@/components/domain/excursions/excursion-status-badge";
import { ExcursionTimeline } from "@/components/domain/excursions/excursion-timeline";
import { RiskAssessmentForm } from "@/components/domain/excursions/risk-assessment-form";
import { ConsentTracker } from "@/components/domain/excursions/consent-tracker";
import { HeadcountRecorder } from "@/components/domain/excursions/headcount-recorder";
import { TransportBookingPanel } from "@/components/domain/excursions/transport-booking-panel";
import { ExcursionDetailActions } from "./detail-actions";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Excursion Detail - WattleOS" };

interface Props {
  params: Promise<{ id: string }>;
}

const TRANSPORT_LABELS: Record<string, string> = {
  walking: "Walking",
  private_vehicle: "Private Vehicle",
  bus: "Bus",
  public_transport: "Public Transport",
  other: "Other",
};

export default async function ExcursionDetailPage({ params }: Props) {
  const { id } = await params;
  const context = await getTenantContext();

  const canView =
    hasPermission(context, Permissions.VIEW_EXCURSIONS) ||
    hasPermission(context, Permissions.MANAGE_EXCURSIONS);
  if (!canView) redirect("/dashboard");

  const canManage = hasPermission(context, Permissions.MANAGE_EXCURSIONS);

  const [result, transportResult] = await Promise.all([
    getExcursion(id),
    getTransportBooking(id),
  ]);

  if (result.error || !result.data) {
    return (
      <div className="p-4 sm:p-6">
        <p style={{ color: "var(--destructive)" }}>
          {result.error?.message ?? "Excursion not found."}
        </p>
        <Link
          href="/excursions"
          className="mt-2 inline-block text-sm underline"
          style={{ color: "var(--primary)" }}
        >
          Back to excursions
        </Link>
      </div>
    );
  }

  const excursion = result.data;

  // Fetch student and educator names for display
  const supabase = await createSupabaseServerClient();
  const [studentsResult, educatorsResult] = await Promise.all([
    excursion.attending_student_ids.length > 0
      ? supabase
          .from("students")
          .select("id, first_name, last_name")
          .in("id", excursion.attending_student_ids)
      : Promise.resolve({ data: [] }),
    excursion.supervising_educator_ids.length > 0
      ? supabase
          .from("tenant_users")
          .select("user_id, profiles!inner(first_name, last_name)")
          .in("user_id", excursion.supervising_educator_ids)
      : Promise.resolve({ data: [] }),
  ]);

  const studentMap: Record<string, string> = {};
  const studentList: { id: string; name: string }[] = [];
  for (const s of studentsResult.data ?? []) {
    const st = s as {
      id: string;
      first_name: string | null;
      last_name: string | null;
    };
    const name = `${st.first_name ?? ""} ${st.last_name ?? ""}`.trim();
    studentMap[st.id] = name;
    studentList.push({ id: st.id, name });
  }

  const educatorNames: string[] = [];
  for (const tu of educatorsResult.data ?? []) {
    const profile = (
      tu as unknown as { profiles: { first_name: string; last_name: string } }
    ).profiles;
    educatorNames.push(
      `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim(),
    );
  }

  const isEditable = ["planning", "risk_assessed", "consents_pending"].includes(
    excursion.status,
  );
  const isActive = excursion.status === "in_progress";

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <Link
          href="/excursions"
          className="underline-offset-2 hover:underline"
          style={{ color: "var(--primary)" }}
        >
          Excursions
        </Link>
        <span style={{ color: "var(--muted-foreground)" }}>/</span>
        <span className="truncate" style={{ color: "var(--foreground)" }}>
          {excursion.name}
        </span>
      </div>

      {/* Header */}
      <div
        className="rounded-xl border border-border p-5"
        style={{ backgroundColor: "var(--card)" }}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h1
              className="text-xl font-bold"
              style={{ color: "var(--foreground)" }}
            >
              {excursion.name}
            </h1>
            {excursion.description && (
              <p
                className="text-sm"
                style={{ color: "var(--muted-foreground)" }}
              >
                {excursion.description}
              </p>
            )}
            <div
              className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-sm"
              style={{ color: "var(--muted-foreground)" }}
            >
              <span>{formatDate(excursion.excursion_date)}</span>
              <span>{excursion.destination}</span>
              <span>
                {TRANSPORT_LABELS[excursion.transport_type] ??
                  excursion.transport_type}
              </span>
              {excursion.departure_time && (
                <span>Departs {excursion.departure_time}</span>
              )}
              {excursion.return_time && (
                <span>Returns {excursion.return_time}</span>
              )}
            </div>
            <div className="flex flex-wrap gap-1 pt-1">
              {educatorNames.map((name, i) => (
                <span
                  key={i}
                  className="rounded-full px-2 py-0.5 text-xs"
                  style={{
                    background: "var(--muted)",
                    color: "var(--muted-foreground)",
                  }}
                >
                  {name}
                </span>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ExcursionStatusBadge status={excursion.status} size="md" />
            {canManage && isEditable && (
              <Link
                href={`/excursions/${excursion.id}/edit`}
                className="active-push touch-target rounded-[var(--radius-md)] border border-border px-3 py-1.5 text-xs font-medium"
                style={{ color: "var(--foreground)" }}
              >
                Edit
              </Link>
            )}
          </div>
        </div>

        {/* Action buttons (depart, return, cancel) */}
        {canManage && <ExcursionDetailActions excursion={excursion} />}
      </div>

      {/* Content sections */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Timeline */}
        <div
          className="rounded-xl border border-border p-5 lg:col-span-1"
          style={{ backgroundColor: "var(--card)" }}
        >
          <h2
            className="mb-4 text-sm font-semibold"
            style={{ color: "var(--foreground)" }}
          >
            Timeline
          </h2>
          <ExcursionTimeline excursion={excursion} />
        </div>

        {/* Right: Tabs content */}
        <div className="space-y-6 lg:col-span-2">
          {/* Risk Assessment */}
          <div
            className="rounded-xl border border-border p-5"
            style={{ backgroundColor: "var(--card)" }}
          >
            <h2
              className="mb-4 text-sm font-semibold"
              style={{ color: "var(--foreground)" }}
            >
              Risk Assessment (Reg 100)
            </h2>
            <RiskAssessmentForm
              excursionId={excursion.id}
              existing={excursion.risk_assessment}
              canManage={canManage}
            />
          </div>

          {/* Consent Tracker */}
          <div
            className="rounded-xl border border-border p-5"
            style={{ backgroundColor: "var(--card)" }}
          >
            <h2
              className="mb-4 text-sm font-semibold"
              style={{ color: "var(--foreground)" }}
            >
              Parent Consents (Reg 101) - {excursion.consents.length} students
            </h2>
            <ConsentTracker
              consents={excursion.consents}
              studentNames={studentMap}
            />
          </div>

          {/* Transport Booking Notes */}
          {excursion.transport_type !== "walking" && (
            <div
              className="rounded-xl border border-border p-5"
              style={{ backgroundColor: "var(--card)" }}
            >
              <h2
                className="mb-4 text-sm font-semibold"
                style={{ color: "var(--foreground)" }}
              >
                Transport Booking
              </h2>
              <TransportBookingPanel
                excursionId={excursion.id}
                booking={transportResult.data ?? null}
                canManage={canManage}
              />
            </div>
          )}

          {/* Headcount Recorder */}
          {(isActive || excursion.headcounts.length > 0) && (
            <div
              className="rounded-xl border border-border p-5"
              style={{ backgroundColor: "var(--card)" }}
            >
              <h2
                className="mb-4 text-sm font-semibold"
                style={{ color: "var(--foreground)" }}
              >
                Headcounts (Reg 102)
              </h2>
              <HeadcountRecorder
                excursionId={excursion.id}
                students={studentList}
                headcounts={excursion.headcounts}
                canManage={canManage && isActive}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
