"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useHaptics } from "@/lib/hooks/use-haptics";
import { toggleCollaboratorActive } from "@/lib/actions/ilp";
import type { IlpCollaborator } from "@/types/domain";
import { COLLABORATOR_ROLE_CONFIG } from "@/lib/constants/ilp";
import { CollaboratorForm } from "./collaborator-form";

interface CollaboratorListProps {
  collaborators: IlpCollaborator[];
  canManage: boolean;
  planId: string;
}

export function CollaboratorList({
  collaborators,
  canManage,
  planId,
}: CollaboratorListProps) {
  const router = useRouter();
  const haptics = useHaptics();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleToggleActive(collaboratorId: string, currentActive: boolean) {
    startTransition(async () => {
      const result = await toggleCollaboratorActive(
        collaboratorId,
        !currentActive,
      );
      if (result.error) {
        haptics.error();
        return;
      }
      haptics.light();
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {/* Add button */}
      {canManage && !showForm && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => {
              haptics.light();
              setShowForm(true);
              setEditingId(null);
            }}
            className="active-push touch-target rounded-[var(--radius-md)] px-4 py-2 text-sm font-semibold"
            style={{
              background: "var(--primary)",
              color: "var(--primary-foreground)",
            }}
          >
            Add Collaborator
          </button>
        </div>
      )}

      {/* Inline add form */}
      {showForm && !editingId && (
        <CollaboratorForm
          planId={planId}
          onComplete={() => {
            setShowForm(false);
            router.refresh();
          }}
        />
      )}

      {/* Collaborator list */}
      {collaborators.length === 0 && !showForm ? (
        <div className="py-12 text-center">
          <svg
            className="mx-auto h-12 w-12"
            style={{ color: "var(--empty-state-icon)" }}
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
            />
          </svg>
          <p
            className="mt-2 text-sm"
            style={{ color: "var(--muted-foreground)" }}
          >
            No collaborators added yet.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {collaborators.map((collab) => {
            const roleCfg = COLLABORATOR_ROLE_CONFIG[collab.collaborator_role];

            if (editingId === collab.id) {
              return (
                <CollaboratorForm
                  key={collab.id}
                  planId={planId}
                  collaborator={collab}
                  onComplete={() => {
                    setEditingId(null);
                    router.refresh();
                  }}
                />
              );
            }

            return (
              <div
                key={collab.id}
                className="rounded-[var(--radius-lg)] border border-border p-4"
                style={{
                  background: "var(--card)",
                  opacity: collab.is_active ? 1 : 0.6,
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p
                        className="text-sm font-semibold"
                        style={{ color: "var(--foreground)" }}
                      >
                        {collab.collaborator_name}
                      </p>
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                        style={{
                          background: "var(--muted)",
                          color: "var(--muted-foreground)",
                        }}
                      >
                        {roleCfg.label}
                      </span>
                      {!collab.is_active && (
                        <span
                          className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                          style={{
                            background: "var(--muted)",
                            color: "var(--muted-foreground)",
                          }}
                        >
                          Inactive
                        </span>
                      )}
                    </div>
                    {collab.organisation && (
                      <p
                        className="mt-0.5 text-xs"
                        style={{ color: "var(--muted-foreground)" }}
                      >
                        {collab.organisation}
                      </p>
                    )}
                    <div className="mt-1 flex flex-wrap gap-3 text-xs" style={{ color: "var(--muted-foreground)" }}>
                      {collab.email && <span>{collab.email}</span>}
                      {collab.phone && <span>{collab.phone}</span>}
                    </div>
                  </div>

                  {canManage && (
                    <div className="flex flex-shrink-0 gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          haptics.light();
                          handleToggleActive(collab.id, collab.is_active);
                        }}
                        disabled={isPending}
                        className="active-push touch-target rounded-[var(--radius-md)] border border-border px-2 py-1 text-xs font-medium transition-opacity disabled:opacity-50"
                        style={{
                          background: "var(--card)",
                          color: "var(--foreground)",
                        }}
                      >
                        {collab.is_active ? "Deactivate" : "Activate"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          haptics.light();
                          setEditingId(collab.id);
                          setShowForm(false);
                        }}
                        className="active-push touch-target rounded-[var(--radius-md)] border border-border px-2 py-1 text-xs font-medium"
                        style={{
                          background: "var(--card)",
                          color: "var(--foreground)",
                        }}
                      >
                        Edit
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
