// src/app/(app)/admin/grant-tracking/[id]/edit/page.tsx
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getGrant } from "@/lib/actions/grant-tracking";
import { GrantForm } from "@/components/domain/grant-tracking/grant-form";

export const metadata = { title: "Edit Grant - WattleOS" };

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditGrantPage({ params }: Props) {
  const { id } = await params;
  const context = await getTenantContext();

  if (!hasPermission(context, Permissions.MANAGE_GRANT_TRACKING)) {
    redirect("/admin/grant-tracking");
  }

  const grantResult = await getGrant(id);
  if (grantResult.error || !grantResult.data) {
    notFound();
  }

  // Fetch staff for managed_by_user_id selector
  const supabase = await createSupabaseServerClient();
  const { data: staffData } = await supabase
    .from("tenant_users")
    .select("user_id, profiles!inner(first_name, last_name)")
    .eq("tenant_id", context.tenant.id)
    .is("left_at", null);

  const staff = (staffData ?? []).map((tu) => {
    const profile = tu.profiles as unknown as {
      first_name: string;
      last_name: string;
    };
    return {
      id: tu.user_id,
      name: `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim(),
    };
  });

  return (
    <div className="space-y-6 p-4 sm:p-6" style={{ maxWidth: 800, margin: "0 auto" }}>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <Link
          href="/admin/grant-tracking"
          className="underline-offset-2 hover:underline"
          style={{ color: "var(--primary)" }}
        >
          Grant Tracking
        </Link>
        <span style={{ color: "var(--muted-foreground)" }}>/</span>
        <Link
          href={`/admin/grant-tracking/${id}`}
          className="underline-offset-2 hover:underline"
          style={{ color: "var(--primary)" }}
        >
          {grantResult.data.name}
        </Link>
        <span style={{ color: "var(--muted-foreground)" }}>/</span>
        <span style={{ color: "var(--foreground)" }}>Edit</span>
      </div>

      <div>
        <h1
          className="text-xl font-bold sm:text-2xl"
          style={{ color: "var(--foreground)" }}
        >
          Edit Grant
        </h1>
        <p
          className="mt-1 text-sm"
          style={{ color: "var(--muted-foreground)" }}
        >
          Update grant details, funding information, and status
        </p>
      </div>

      <div
        className="rounded-xl border border-border p-5"
        style={{ backgroundColor: "var(--card)" }}
      >
        <GrantForm grant={grantResult.data} staff={staff} />
      </div>
    </div>
  );
}
