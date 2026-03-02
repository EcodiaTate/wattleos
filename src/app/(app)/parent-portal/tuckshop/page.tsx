import { redirect } from "next/navigation";
import { getTenantContext, hasPermission } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import {
  listMenuItemsPublic,
  getStudentOrders,
  listDeliveryWeeks,
} from "@/lib/actions/tuckshop";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ParentOrderClient } from "@/components/domain/tuckshop/parent-order-client";

export const metadata = { title: "Tuckshop - WattleOS" };

interface PageProps {
  searchParams: Promise<{ student?: string }>;
}

export default async function ParentTuckshopPage({ searchParams }: PageProps) {
  const context = await getTenantContext();
  if (!hasPermission(context, Permissions.PLACE_TUCKSHOP_ORDER)) {
    redirect("/dashboard");
  }

  const sp = await searchParams;
  const supabase = await createSupabaseServerClient();

  // Fetch students linked to this parent/guardian
  const { data: guardianLinks } = await supabase
    .from("student_guardians")
    .select(
      "student_id, students!inner(id, first_name, last_name, enrollment_status)",
    )
    .eq("user_id", context.user.id)
    .eq("students.enrollment_status", "active");

  type StudentRow = { id: string; first_name: string; last_name: string };
  const students: StudentRow[] = (guardianLinks ?? []).map(
    (g: Record<string, unknown>) => {
      const s = g.students as Record<string, unknown>;
      return {
        id: s.id as string,
        first_name: s.first_name as string,
        last_name: s.last_name as string,
      };
    },
  );

  // If staff placing on behalf of student - just use their own children
  // Pick first student if no query param, or use the one requested
  const selectedStudentId =
    sp.student && students.find((s) => s.id === sp.student)
      ? sp.student
      : (students[0]?.id ?? null);

  const selectedStudent = students.find((s) => s.id === selectedStudentId);

  const [menuResult, ordersResult, weeksResult] = await Promise.all([
    listMenuItemsPublic(),
    selectedStudentId
      ? getStudentOrders(selectedStudentId)
      : Promise.resolve({ data: [], error: null }),
    listDeliveryWeeks({ status: "open" }),
  ]);

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <h1
          className="text-xl font-bold sm:text-2xl"
          style={{ color: "var(--foreground)" }}
        >
          Tuckshop
        </h1>
        <p
          className="mt-1 text-sm"
          style={{ color: "var(--muted-foreground)" }}
        >
          Browse the menu and place orders for your children
        </p>
      </div>

      {students.length === 0 ? (
        <div
          className="rounded-xl border border-border py-12 text-center"
          style={{ backgroundColor: "var(--card)" }}
        >
          <p className="font-medium" style={{ color: "var(--foreground)" }}>
            No enrolled children linked to your account
          </p>
          <p
            className="mt-1 text-sm"
            style={{ color: "var(--muted-foreground)" }}
          >
            Contact the school office if you believe this is an error.
          </p>
        </div>
      ) : (
        <>
          {/* Student selector */}
          {students.length > 1 && (
            <div className="flex gap-2 overflow-x-auto scroll-native pb-1">
              {students.map((student) => (
                <a
                  key={student.id}
                  href={`/parent-portal/tuckshop?student=${student.id}`}
                  className="touch-target flex-shrink-0 rounded-full px-4 py-1.5 text-sm font-medium"
                  style={{
                    backgroundColor:
                      selectedStudentId === student.id
                        ? "var(--primary)"
                        : "var(--secondary)",
                    color:
                      selectedStudentId === student.id
                        ? "var(--primary-foreground)"
                        : "var(--secondary-foreground)",
                  }}
                >
                  {student.first_name} {student.last_name}
                </a>
              ))}
            </div>
          )}

          {selectedStudent && selectedStudentId ? (
            <ParentOrderClient
              studentId={selectedStudentId}
              studentName={`${selectedStudent.first_name} ${selectedStudent.last_name}`}
              menuItems={menuResult.data ?? []}
              pastOrders={ordersResult.data ?? []}
              openDeliveryWeeks={weeksResult.data ?? []}
            />
          ) : (
            <div
              className="rounded-xl border border-border py-10 text-center"
              style={{ backgroundColor: "var(--card)" }}
            >
              <p className="font-medium" style={{ color: "var(--foreground)" }}>
                Select a student
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
