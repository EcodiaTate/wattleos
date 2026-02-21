// src/app/(app)/programs/kiosk/page.tsx
//
// ============================================================
// WattleOS V2 - OSHC Kiosk Check-in/Check-out View
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

  // Render without wrapping layout classes to allow the Kiosk
  // to be a true full-screen experience on tablets.
  return <KioskClient initialSessions={sessions} />;
}