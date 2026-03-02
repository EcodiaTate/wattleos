"use client";

import Link from "next/link";
import type { TransitionStatementWithStudent } from "@/types/domain";
import { TRANSITION_STATUS_CONFIG } from "@/lib/constants/ilp";

function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

interface TransitionStatementCardProps {
  statement: TransitionStatementWithStudent;
}

export function TransitionStatementCard({
  statement,
}: TransitionStatementCardProps) {
  const student = statement.student;
  const displayName = student.preferred_name
    ? `${student.preferred_name} ${student.last_name}`
    : `${student.first_name} ${student.last_name}`;

  const statusCfg = TRANSITION_STATUS_CONFIG[statement.transition_status];

  const familyShared = statement.shared_with_family_at !== null;
  const schoolShared = statement.shared_with_school_at !== null;

  return (
    <Link
      href={`/admin/learning-plans/transitions/${statement.id}`}
      className="card-interactive block rounded-[var(--radius-lg)] border border-border p-[var(--density-card-padding)]"
      style={{ background: "var(--card)" }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {student.photo_url ? (
            <img
              src={student.photo_url}
              alt={displayName}
              className="h-10 w-10 rounded-full object-cover"
            />
          ) : (
            <div
              className="flex h-10 w-10 items-center justify-center rounded-full text-xs font-semibold"
              style={{
                background: "var(--muted)",
                color: "var(--muted-foreground)",
              }}
            >
              {getInitials(student.first_name, student.last_name)}
            </div>
          )}
          <div>
            <p
              className="text-sm font-semibold"
              style={{ color: "var(--foreground)" }}
            >
              {displayName}
            </p>
            <p
              className="text-xs"
              style={{ color: "var(--muted-foreground)" }}
            >
              Transition Statement {statement.statement_year}
            </p>
          </div>
        </div>

        <span
          className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
          style={{
            background: statusCfg.cssVar,
            color: statusCfg.cssVarFg,
          }}
        >
          {statusCfg.label}
        </span>
      </div>

      {/* Linked plan */}
      {statement.plan !== null && (
        <p
          className="mt-2 text-xs"
          style={{ color: "var(--muted-foreground)" }}
        >
          Linked plan: {statement.plan.plan_title}
        </p>
      )}

      {/* Sharing indicators */}
      <div className="mt-2 flex items-center gap-3 text-xs">
        <span
          className="flex items-center gap-1"
          style={{
            color: familyShared
              ? "var(--ilp-completed)"
              : "var(--muted-foreground)",
          }}
        >
          {familyShared ? "\u2713" : "\u2013"} Family
          {familyShared && statement.shared_with_family_at && (
            <span className="opacity-70">
              {" "}
              ({new Date(statement.shared_with_family_at).toLocaleDateString(
                "en-AU",
                { day: "numeric", month: "short" },
              )})
            </span>
          )}
        </span>
        <span
          className="flex items-center gap-1"
          style={{
            color: schoolShared
              ? "var(--ilp-completed)"
              : "var(--muted-foreground)",
          }}
        >
          {schoolShared ? "\u2713" : "\u2013"} School
          {schoolShared && statement.shared_with_school_at && (
            <span className="opacity-70">
              {" "}
              ({new Date(statement.shared_with_school_at).toLocaleDateString(
                "en-AU",
                { day: "numeric", month: "short" },
              )})
            </span>
          )}
        </span>
        {statement.family_approved && (
          <span
            className="flex items-center gap-1"
            style={{ color: "var(--ilp-completed)" }}
          >
            \u2713 Family Approved
          </span>
        )}
      </div>

      {/* Receiving school */}
      {statement.receiving_school_name && (
        <p
          className="mt-1 text-xs"
          style={{ color: "var(--muted-foreground)" }}
        >
          Receiving: {statement.receiving_school_name}
        </p>
      )}
    </Link>
  );
}
