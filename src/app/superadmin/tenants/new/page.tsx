// src/app/(superadmin)/tenants/new/page.tsx

import { CreateTenantForm } from "./create-tenant-form";
import Link from "next/link";

export const metadata = { title: "Provision School - WattleOS Platform Admin" };

export default function NewTenantPage() {
  return (
    <div className="max-w-xl">
      <div className="mb-6">
        <Link
          href="/superadmin/tenants"
          className="mb-3 inline-block text-sm hover:underline"
          style={{ color: "var(--muted-foreground)" }}
        >
          ← Tenants
        </Link>
        <h1
          className="text-2xl font-bold"
          style={{ color: "var(--foreground)" }}
        >
          Provision New School
        </h1>
        <p
          className="mt-1 text-sm"
          style={{ color: "var(--muted-foreground)" }}
        >
          Creates the tenant, seeds system roles, and generates a one-time owner
          setup link.
        </p>
      </div>

      <div
        className="rounded-xl border p-6"
        style={{ borderColor: "var(--border)", background: "var(--card)" }}
      >
        <CreateTenantForm />
      </div>
    </div>
  );
}
