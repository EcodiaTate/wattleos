// src/app/(app)/admin/debt/export/page.tsx
//
// Server action export endpoint - triggers CSV download.
// Called from dashboard "Export CSV" button via a form POST.

import { redirect } from "next/navigation";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { exportDebtRegister } from "@/lib/actions/debt";

export const metadata = { title: "Export Debt Register - WattleOS" };

export default async function DebtExportPage() {
  const context = await getTenantContext();

  if (!hasPermission(context, Permissions.MANAGE_DEBT_MANAGEMENT)) {
    redirect("/admin/debt");
  }

  const result = await exportDebtRegister({});

  if (result.error || !result.data) {
    redirect("/admin/debt?export_error=1");
  }

  // We can't return a Response from a page component in Next.js app router —
  // redirect the user back and expose the CSV via a route handler instead.
  // For now, show a simple download UI.
  const csvData = result.data;
  const encodedCsv = Buffer.from(csvData).toString("base64");

  return (
    <main style={{ padding: "1.5rem", maxWidth: 500, margin: "0 auto" }}>
      <h1
        style={{
          fontSize: "1.2rem",
          fontWeight: 700,
          color: "var(--foreground)",
          marginBottom: "0.75rem",
        }}
      >
        Debt Register Export
      </h1>
      <p
        style={{
          fontSize: "0.85rem",
          color: "var(--muted-foreground)",
          marginBottom: "1.5rem",
        }}
      >
        Your export is ready. Click below to download.
      </p>
      <DebtExportDownload csv={csvData} />
    </main>
  );
}

// Client component for the download button
function DebtExportDownload({ csv }: { csv: string }) {
  // This is a server component trick - we inline the download as a data URI
  // Ideally this would be a route handler, but this keeps it simple.
  return (
    <a
      href={`data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`}
      download={`debt-register-${new Date().toISOString().split("T")[0]}.csv`}
      style={{
        display: "inline-block",
        padding: "0.55rem 1.25rem",
        borderRadius: "var(--radius)",
        background: "var(--primary)",
        color: "var(--primary-foreground)",
        fontSize: "0.85rem",
        fontWeight: 600,
        textDecoration: "none",
      }}
    >
      Download CSV
    </a>
  );
}
