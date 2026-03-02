// src/app/(app)/admin/debt/reminders/page.tsx
import { redirect } from "next/navigation";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { listReminderSequences } from "@/lib/actions/debt";
import { ReminderSequencesClient } from "@/components/domain/debt/reminder-sequences-client";

export const metadata = { title: "Reminder Templates - WattleOS" };

export default async function ReminderSequencesPage() {
  const context = await getTenantContext();

  if (!hasPermission(context, Permissions.MANAGE_DEBT_MANAGEMENT)) {
    redirect("/admin/debt");
  }

  const result = await listReminderSequences();
  const sequences = result.data ?? [];

  return (
    <main style={{ padding: "1.5rem", maxWidth: 700, margin: "0 auto" }}>
      <ReminderSequencesClient sequences={sequences} />
    </main>
  );
}
