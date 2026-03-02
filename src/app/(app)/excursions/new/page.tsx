import { redirect } from "next/navigation";
import Link from "next/link";
import {
  getTenantContext,
  hasPermission,
} from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ExcursionForm } from "@/components/domain/excursions/excursion-form";

export const metadata = { title: "New Excursion - WattleOS" };

export default async function NewExcursionPage() {
  const context = await getTenantContext();

  if (!hasPermission(context, Permissions.MANAGE_EXCURSIONS)) {
    redirect("/excursions");
  }

  const supabase = await createSupabaseServerClient();

  // Fetch educators and students in parallel
  const [educatorsResult, studentsResult] = await Promise.all([
    supabase
      .from("tenant_users")
      .select("user_id, profiles!inner(first_name, last_name)")
      .eq("tenant_id", context.tenant.id)
      .is("left_at", null),
    supabase
      .from("students")
      .select("id, first_name, last_name")
      .eq("tenant_id", context.tenant.id)
      .eq("enrollment_status", "enrolled")
      .is("deleted_at", null)
      .order("first_name"),
  ]);

  const educators = (educatorsResult.data ?? []).map((tu) => {
    const profile = tu.profiles as unknown as { first_name: string; last_name: string };
    return {
      id: tu.user_id,
      name: `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim(),
    };
  });

  const students = (studentsResult.data ?? []).map((s) => ({
    id: s.id,
    name: `${s.first_name ?? ""} ${s.last_name ?? ""}`.trim(),
  }));

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
        <span style={{ color: "var(--foreground)" }}>New Excursion</span>
      </div>

      <div>
        <h1
          className="text-xl font-bold sm:text-2xl"
          style={{ color: "var(--foreground)" }}
        >
          Plan New Excursion
        </h1>
        <p
          className="mt-1 text-sm"
          style={{ color: "var(--muted-foreground)" }}
        >
          Create an excursion record with destination, transport, and attending students
        </p>
      </div>

      <div
        className="rounded-xl border border-border p-5"
        style={{ backgroundColor: "var(--card)" }}
      >
        <ExcursionForm educators={educators} students={students} />
      </div>
    </div>
  );
}
