// src/app/(app)/admin/nccd/register/page.tsx
//
// NCCD Register - full list of all students.

import { NccdRegisterClient } from "@/components/domain/nccd/nccd-register-client";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { listNccdEntries } from "@/lib/actions/nccd";
import { currentNccdYear } from "@/lib/constants/nccd";
import Link from "next/link";
import { redirect } from "next/navigation";

export const metadata = {
  title: "NCCD Register - All Students",
};

export default async function NccdRegisterPage() {
  const ctx = await getTenantContext();

  if (!hasPermission(ctx, Permissions.VIEW_NCCD)) {
    redirect("/dashboard");
  }

  const canManage = hasPermission(ctx, Permissions.MANAGE_NCCD);

  // Fetch all entries across the last 3 years so filters work client-side
  const [currentResult, priorResult, prior2Result] = await Promise.all([
    listNccdEntries({ collection_year: currentNccdYear() }),
    listNccdEntries({ collection_year: currentNccdYear() - 1 }),
    listNccdEntries({ collection_year: currentNccdYear() - 2 }),
  ]);

  const allEntries = [
    ...(currentResult.data ?? []),
    ...(priorResult.data ?? []),
    ...(prior2Result.data ?? []),
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-5 p-4 sm:p-6 pb-tab-bar">
      {/* Breadcrumb */}
      <nav
        className="flex items-center gap-2 text-sm"
        style={{ color: "var(--muted-foreground)" }}
      >
        <Link href="/admin/nccd" className="hover:underline">
          NCCD
        </Link>
        <span>/</span>
        <span style={{ color: "var(--foreground)" }}>Register</span>
      </nav>

      <div>
        <h1
          className="text-2xl font-bold"
          style={{ color: "var(--foreground)" }}
        >
          NCCD Register
        </h1>
        <p
          className="text-sm mt-1"
          style={{ color: "var(--muted-foreground)" }}
        >
          {
            allEntries.filter((e) => e.collection_year === currentNccdYear())
              .length
          }{" "}
          students in {currentNccdYear()} collection
        </p>
      </div>

      <NccdRegisterClient entries={allEntries} canManage={canManage} />
    </div>
  );
}
