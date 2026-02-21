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
  if (!iso) return " - ";
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
    <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden animate-fade-in">
      <div className="border-b border-border bg-muted/10 px-5 py-3 flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
          Documents ({documents.length})
        </h2>
      </div>
      <div className="px-5 py-4">
        {documents.length === 0 ? (
          <p className="text-sm italic text-muted-foreground/50 py-4 text-center">
            No documents uploaded with this application.
          </p>
        ) : (
          <div className="space-y-3">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className={`rounded-lg border p-4 transition-all animate-slide-up ${
                  doc.verified
                    ? "border-success/30 bg-success/5"
                    : "border-border bg-muted/20"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-bold text-foreground">
                        <DocumentTypeLabel type={doc.document_type} />
                      </span>
                      {doc.verified && (
                        <span className="rounded-full bg-success text-success-foreground px-2 py-0.5 text-[9px] font-black uppercase tracking-tighter shadow-sm">
                          Verified
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] font-bold uppercase tracking-tight text-muted-foreground/60">
                      {doc.file_name} · {formatFileSize(doc.file_size_bytes)} · {formatDate(doc.created_at)}
                    </p>
                    {doc.verified_by && (
                      <p className="text-[10px] font-medium text-success mt-1 italic">
                        Verified {formatDate(doc.verified_at)}
                      </p>
                    )}

                    {/* Notes logic remains identical */}
                    {editingNotesId === doc.id ? (
                      <div className="mt-3 flex gap-2 animate-fade-in">
                        <input
                          type="text"
                          value={notesDraft}
                          onChange={(e) => setNotesDraft(e.target.value)}
                          placeholder="Add a note…"
                          className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                          autoFocus
                        />
                        <button
                          onClick={() => handleSaveNotes(doc.id)}
                          disabled={isPending}
                          className="rounded-md bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:opacity-90 transition-all"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingNotesId(null)}
                          className="rounded-md bg-muted px-3 py-1.5 text-xs font-medium text-foreground hover:bg-border"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : doc.notes ? (
                      <p className="mt-2 text-xs text-muted-foreground bg-card/50 p-2 rounded border border-border/50">
                        <span className="font-bold uppercase text-[9px] mr-1">Admin Note:</span> {doc.notes}{" "}
                        <button
                          onClick={() => startEditNotes(doc)}
                          className="ml-2 text-primary hover:underline font-bold"
                        >
                          edit
                        </button>
                      </p>
                    ) : null}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 ml-4">
                    {!doc.notes && editingNotesId !== doc.id && (
                      <button
                        onClick={() => startEditNotes(doc)}
                        className="rounded-md bg-muted/50 px-3 py-1.5 text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-border transition-colors"
                      >
                        Note
                      </button>
                    )}
                    <button
                      onClick={() => handleToggleVerify(doc)}
                      disabled={isPending}
                      className={`rounded-md px-3 py-1.5 text-xs font-bold transition-all disabled:opacity-50 active:scale-95 ${
                        doc.verified
                          ? "bg-muted text-muted-foreground hover:bg-border"
                          : "bg-primary text-primary-foreground shadow-primary hover:opacity-90"
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