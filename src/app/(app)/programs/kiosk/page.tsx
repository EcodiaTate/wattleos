// src/app/(app)/programs/kiosk/page.tsx
//
// ============================================================
// WattleOS V2 - OSHC Kiosk Check-in/Check-out View
// ============================================================
// Server Component wrapper that loads kiosk data, then renders
// the interactive KioskClient. Designed for a tablet at the
// OSHC desk - big tap targets, minimal chrome, medical alerts.
//
// WHY full page not component: The kiosk is a dedicated
// full-screen experience. Staff navigate here, leave the
// tablet on this page, and tap children in/out all day.
// ============================================================

import { KioskClient } from "@/components/domain/programs/kiosk-client";
import { getKioskData } from "@/lib/actions/programs/session-bookings";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { redirect } from "next/navigation";

export default async function KioskPage() {
  const context = await getTenantContext();

  if (!hasPermission(context, Permissions.CHECKIN_CHECKOUT)) {
    redirect("/dashboard");
  }

  const result = await getKioskData();
  const sessions = result.data ?? [];

  return <KioskClient initialSessions={sessions} />;
}
