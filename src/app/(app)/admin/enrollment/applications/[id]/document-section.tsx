// src/app/(app)/admin/enrollment/applications/[id]/document-section.tsx
//
// ============================================================
// WattleOS V2 - Document Section (Module 10)
// ============================================================
// 'use client' - displays uploaded documents for an enrollment
// application. Admins can verify/unverify documents and add
// notes. Verification is a compliance requirement for
// immunization records and custody orders.
//
// WHY client: Verify/unverify toggles need immediate feedback
// without a full page reload.
// ============================================================

"use client";

import {
  unverifyDocument,
  updateDocumentNotes,
  verifyDocument,
} from "@/lib/actions/enroll";
import type { EnrollmentDocument } from "@/types/domain";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

interface DocumentSectionProps {
  documents: EnrollmentDocument[];
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function DocumentTypeLabel({ type }: { type: string }) {
  const labels: Record<string, string> = {
    immunization_record: "Immunization Record",
    birth_certificate: "Birth Certificate",
    custody_order: "Custody Order",
    medical_action_plan: "Medical Action Plan",
    previous_school_report: "Previous School Report",
    passport_copy: "Passport / ID Copy",
    other: "Other",
  };
  return <>{labels[type] ?? type.replace(/_/g, " ")}</>;
}

export function DocumentSection({ documents }: DocumentSectionProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState("");

  function handleToggleVerify(doc: EnrollmentDocument) {
    startTransition(async () => {
      if (doc.verified) {
        await unverifyDocument(doc.id);
      } else {
        await verifyDocument(doc.id);
      }
      router.refresh();
    });
  }

  function startEditNotes(doc: EnrollmentDocument) {
    setEditingNotesId(doc.id);
    setNotesDraft(doc.notes ?? "");
  }

  function handleSaveNotes(docId: string) {
    startTransition(async () => {
      await updateDocumentNotes(docId, notesDraft.trim() || null);
      setEditingNotesId(null);
      router.refresh();
    });
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <div className="border-b border-gray-100 px-5 py-3">
        <h2 className="text-sm font-semibold text-gray-900">
          Documents ({documents.length})
        </h2>
      </div>
      <div className="px-5 py-4">
        {documents.length === 0 ? (
          <p className="text-sm text-gray-400">
            No documents uploaded with this application.
          </p>
        ) : (
          <div className="space-y-3">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className={`rounded-lg border p-4 ${
                  doc.verified
                    ? "border-green-200 bg-green-50"
                    : "border-gray-100 bg-gray-50"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">
                        <DocumentTypeLabel type={doc.document_type} />
                      </span>
                      {doc.verified && (
                        <span className="rounded-full bg-green-200 px-2 py-0.5 text-xs font-medium text-green-800">
                          ✓ Verified
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {doc.file_name} · {formatFileSize(doc.file_size_bytes)} ·
                      Uploaded {formatDate(doc.created_at)}
                    </p>
                    {doc.verified_by && (
                      <p className="text-xs text-green-600">
                        Verified {formatDate(doc.verified_at)}
                      </p>
                    )}

                    {/* Notes */}
                    {editingNotesId === doc.id ? (
                      <div className="mt-2 flex gap-2">
                        <input
                          type="text"
                          value={notesDraft}
                          onChange={(e) => setNotesDraft(e.target.value)}
                          placeholder="Add a note…"
                          className="flex-1 rounded border border-gray-300 px-2 py-1 text-xs focus:border-amber-500 focus:outline-none"
                          autoFocus
                        />
                        <button
                          onClick={() => handleSaveNotes(doc.id)}
                          disabled={isPending}
                          className="rounded bg-amber-600 px-2 py-1 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-50"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingNotesId(null)}
                          className="rounded bg-gray-200 px-2 py-1 text-xs text-gray-700 hover:bg-gray-300"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : doc.notes ? (
                      <p className="mt-1 text-xs text-gray-600">
                        Note: {doc.notes}{" "}
                        <button
                          onClick={() => startEditNotes(doc)}
                          className="text-amber-600 hover:text-amber-700"
                        >
                          edit
                        </button>
                      </p>
                    ) : null}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    {!doc.notes && editingNotesId !== doc.id && (
                      <button
                        onClick={() => startEditNotes(doc)}
                        className="rounded bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-200"
                      >
                        Note
                      </button>
                    )}
                    <button
                      onClick={() => handleToggleVerify(doc)}
                      disabled={isPending}
                      className={`rounded px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
                        doc.verified
                          ? "bg-gray-200 text-gray-700 hover:bg-gray-300"
                          : "bg-green-600 text-white hover:bg-green-700"
                      }`}
                    >
                      {doc.verified ? "Unverify" : "Verify"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
