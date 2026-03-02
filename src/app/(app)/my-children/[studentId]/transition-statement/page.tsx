import { getTenantContext } from "@/lib/auth/tenant-context";
import { listTransitionStatements } from "@/lib/actions/ilp";
import { TransitionStatementParentView } from "@/components/domain/learning-plans/transition-statement-parent-view";

export const metadata = { title: "Transition Statement - WattleOS" };

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function ParentTransitionStatementPage(props: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId } = await props.params;

  // getTenantContext still needed for auth - RLS enforces guardian access
  await getTenantContext();

  const currentYear = new Date().getFullYear();
  const result = await listTransitionStatements(currentYear);

  if (result.error) {
    return (
      <div className="p-4 sm:p-6">
        <p style={{ color: "var(--destructive)" }}>
          {result.error.message ?? "Failed to load transition statement."}
        </p>
      </div>
    );
  }

  const allStatements = result.data ?? [];
  const statement = allStatements.find((s) => s.student_id === studentId);

  if (!statement) {
    return (
      <div className="space-y-6 p-4 sm:p-6">
        <div>
          <h1
            className="text-xl font-bold sm:text-2xl"
            style={{ color: "var(--foreground)" }}
          >
            Transition Statement
          </h1>
          <p
            className="mt-1 text-sm"
            style={{ color: "var(--muted-foreground)" }}
          >
            Transition-to-school statement
          </p>
        </div>
        <div
          className="rounded-xl border border-border p-8 text-center"
          style={{ backgroundColor: "var(--card)" }}
        >
          <div
            className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full"
            style={{ backgroundColor: "var(--muted)" }}
          >
            <svg
              className="h-6 w-6"
              style={{ color: "var(--empty-state-icon)" }}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4.26 10.147a60.438 60.438 0 00-.491 6.347A48.62 48.62 0 0112 20.904a48.62 48.62 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.636 50.636 0 00-2.658-.813A59.906 59.906 0 0112 3.493a59.903 59.903 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5"
              />
            </svg>
          </div>
          <p
            className="text-sm font-medium"
            style={{ color: "var(--foreground)" }}
          >
            No Transition Statement
          </p>
          <p
            className="mt-1 text-sm"
            style={{ color: "var(--muted-foreground)" }}
          >
            A transition-to-school statement has not been prepared for your
            child yet. Your child&apos;s educator will create one when the time
            comes.
          </p>
        </div>
      </div>
    );
  }

  const studentName = statement.student
    ? (statement.student.preferred_name ?? statement.student.first_name ?? "") +
      " " +
      (statement.student.last_name ?? "")
    : "Your Child";

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <h1
          className="text-xl font-bold sm:text-2xl"
          style={{ color: "var(--foreground)" }}
        >
          Transition Statement
        </h1>
        <p
          className="mt-1 text-sm"
          style={{ color: "var(--muted-foreground)" }}
        >
          {studentName.trim()}&apos;s transition-to-school statement
        </p>
      </div>

      {/* Statement status banner */}
      {statement.transition_status === "ready_for_family" &&
        !statement.family_approved && (
          <div
            className="rounded-xl border border-border p-4"
            style={{
              backgroundColor: "var(--ilp-review-due-bg)",
              borderColor: "var(--ilp-review-due)",
            }}
          >
            <p
              className="text-sm font-medium"
              style={{ color: "var(--ilp-review-due)" }}
            >
              This statement is ready for your review and approval.
            </p>
            <p
              className="mt-1 text-sm"
              style={{ color: "var(--muted-foreground)" }}
            >
              Please review the details below and approve if you are satisfied
              with the content.
            </p>
          </div>
        )}

      {statement.family_approved && (
        <div
          className="rounded-xl border border-border p-4"
          style={{
            backgroundColor: "var(--ilp-on-track-bg)",
            borderColor: "var(--ilp-on-track)",
          }}
        >
          <p
            className="text-sm font-medium"
            style={{ color: "var(--ilp-on-track)" }}
          >
            You have approved this transition statement.
          </p>
          {statement.family_approved_at && (
            <p
              className="mt-1 text-sm"
              style={{ color: "var(--muted-foreground)" }}
            >
              Approved on {formatDate(statement.family_approved_at)}
            </p>
          )}
        </div>
      )}

      {/* Statement content */}
      <div
        className="rounded-xl border border-border p-5"
        style={{ backgroundColor: "var(--card)" }}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {statement.statement_year && (
            <div>
              <p
                className="text-xs font-medium"
                style={{ color: "var(--muted-foreground)" }}
              >
                Transition Year
              </p>
              <p
                className="mt-0.5 text-sm"
                style={{ color: "var(--foreground)" }}
              >
                {statement.statement_year}
              </p>
            </div>
          )}
          {statement.receiving_school_name && (
            <div>
              <p
                className="text-xs font-medium"
                style={{ color: "var(--muted-foreground)" }}
              >
                Receiving School
              </p>
              <p
                className="mt-0.5 text-sm"
                style={{ color: "var(--foreground)" }}
              >
                {statement.receiving_school_name}
              </p>
            </div>
          )}
          {statement.identity_summary && (
            <div className="sm:col-span-2">
              <p
                className="text-xs font-medium"
                style={{ color: "var(--muted-foreground)" }}
              >
                Identity
              </p>
              <p
                className="mt-0.5 whitespace-pre-wrap text-sm"
                style={{ color: "var(--foreground)" }}
              >
                {statement.identity_summary}
              </p>
            </div>
          )}
          {statement.community_summary && (
            <div className="sm:col-span-2">
              <p
                className="text-xs font-medium"
                style={{ color: "var(--muted-foreground)" }}
              >
                Community
              </p>
              <p
                className="mt-0.5 whitespace-pre-wrap text-sm"
                style={{ color: "var(--foreground)" }}
              >
                {statement.community_summary}
              </p>
            </div>
          )}
          {statement.wellbeing_summary && (
            <div className="sm:col-span-2">
              <p
                className="text-xs font-medium"
                style={{ color: "var(--muted-foreground)" }}
              >
                Wellbeing
              </p>
              <p
                className="mt-0.5 whitespace-pre-wrap text-sm"
                style={{ color: "var(--foreground)" }}
              >
                {statement.wellbeing_summary}
              </p>
            </div>
          )}
          {statement.learning_summary && (
            <div className="sm:col-span-2">
              <p
                className="text-xs font-medium"
                style={{ color: "var(--muted-foreground)" }}
              >
                Learning
              </p>
              <p
                className="mt-0.5 whitespace-pre-wrap text-sm"
                style={{ color: "var(--foreground)" }}
              >
                {statement.learning_summary}
              </p>
            </div>
          )}
          {statement.communication_summary && (
            <div className="sm:col-span-2">
              <p
                className="text-xs font-medium"
                style={{ color: "var(--muted-foreground)" }}
              >
                Communication
              </p>
              <p
                className="mt-0.5 whitespace-pre-wrap text-sm"
                style={{ color: "var(--foreground)" }}
              >
                {statement.communication_summary}
              </p>
            </div>
          )}
          {(statement.strengths_summary || statement.interests_summary) && (
            <div className="sm:col-span-2">
              <p
                className="text-xs font-medium"
                style={{ color: "var(--muted-foreground)" }}
              >
                Strengths & Interests
              </p>
              <p
                className="mt-0.5 whitespace-pre-wrap text-sm"
                style={{ color: "var(--foreground)" }}
              >
                {[statement.strengths_summary, statement.interests_summary]
                  .filter(Boolean)
                  .join("\n\n")}
              </p>
            </div>
          )}
          {statement.approaches_to_learning && (
            <div className="sm:col-span-2">
              <p
                className="text-xs font-medium"
                style={{ color: "var(--muted-foreground)" }}
              >
                Approaches to Learning
              </p>
              <p
                className="mt-0.5 whitespace-pre-wrap text-sm"
                style={{ color: "var(--foreground)" }}
              >
                {statement.approaches_to_learning}
              </p>
            </div>
          )}
          {statement.additional_needs_summary && (
            <div className="sm:col-span-2">
              <p
                className="text-xs font-medium"
                style={{ color: "var(--muted-foreground)" }}
              >
                Additional Needs
              </p>
              <p
                className="mt-0.5 whitespace-pre-wrap text-sm"
                style={{ color: "var(--foreground)" }}
              >
                {statement.additional_needs_summary}
              </p>
            </div>
          )}
          {statement.educator_recommendations && (
            <div className="sm:col-span-2">
              <p
                className="text-xs font-medium"
                style={{ color: "var(--muted-foreground)" }}
              >
                Educator Recommendations
              </p>
              <p
                className="mt-0.5 whitespace-pre-wrap text-sm"
                style={{ color: "var(--foreground)" }}
              >
                {statement.educator_recommendations}
              </p>
            </div>
          )}
          {statement.family_input && (
            <div className="sm:col-span-2">
              <p
                className="text-xs font-medium"
                style={{ color: "var(--muted-foreground)" }}
              >
                Family Input
              </p>
              <p
                className="mt-0.5 whitespace-pre-wrap text-sm"
                style={{ color: "var(--foreground)" }}
              >
                {statement.family_input}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Approve button for parents */}
      {statement.transition_status === "ready_for_family" &&
        !statement.family_approved && (
          <TransitionStatementParentView
            statementId={statement.id}
            studentName={studentName.trim()}
          />
        )}
    </div>
  );
}
