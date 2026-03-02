"use client";

// ============================================================
// WattleOS V2 - Session Detail Client (Module R)
// ============================================================
// Orchestrates the bulk upload → matching → confirmation workflow.
// ============================================================

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useHaptics } from "@/lib/hooks/use-haptics";
import { SessionStatusBadge } from "@/components/domain/school-photos/session-status-badge";
import { BulkUploadZone } from "@/components/domain/school-photos/bulk-upload-zone";
import { FilenameMatcherClient } from "@/components/domain/school-photos/filename-matcher-client";
import {
  closePhotoSession,
  archivePhotoSession,
} from "@/lib/actions/school-photos";
import type { PhotoSessionWithDetails, PersonPhoto } from "@/types/domain";

interface SessionDetailClientProps {
  session: PhotoSessionWithDetails;
  photos: PersonPhoto[];
  roster: Array<{
    id: string;
    first_name: string;
    last_name: string;
    preferred_name: string | null;
  }>;
  personType: "student" | "staff";
  tenantId: string;
}

type WorkflowStep = "overview" | "uploading" | "matching";

export function SessionDetailClient({
  session,
  photos: initialPhotos,
  roster,
  personType,
  tenantId,
}: SessionDetailClientProps) {
  const router = useRouter();
  const haptics = useHaptics();
  const [step, setStep] = useState<WorkflowStep>("overview");
  const [uploadedPhotos, setUploadedPhotos] = useState<
    Array<{ id: string; photo_url: string; original_filename: string }>
  >([]);
  const [actionLoading, setActionLoading] = useState(false);

  const unmatchedPhotos = initialPhotos.filter((p) => !p.person_id);
  const matchedPhotos = initialPhotos.filter((p) => p.person_id);

  const handleUploadComplete = useCallback(
    (
      photos: Array<{
        id: string;
        photo_url: string;
        original_filename: string;
      }>,
    ) => {
      setUploadedPhotos(photos);
      if (photos.length > 0) {
        setStep("matching");
      }
    },
    [],
  );

  const handleMatchComplete = useCallback(() => {
    haptics.impact("heavy");
    router.refresh();
    setStep("overview");
    setUploadedPhotos([]);
  }, [haptics, router]);

  const handleClose = useCallback(async () => {
    setActionLoading(true);
    haptics.impact("medium");
    await closePhotoSession(session.id);
    router.refresh();
    setActionLoading(false);
  }, [session.id, haptics, router]);

  const handleArchive = useCallback(async () => {
    setActionLoading(true);
    haptics.impact("medium");
    await archivePhotoSession(session.id);
    router.refresh();
    setActionLoading(false);
  }, [session.id, haptics, router]);

  return (
    <div className="space-y-6">
      {/* Session Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1
              className="text-2xl font-bold"
              style={{ color: "var(--foreground)" }}
            >
              {session.name}
            </h1>
            <SessionStatusBadge status={session.status} />
          </div>
          {session.description ? (
            <p
              className="mt-1 text-sm"
              style={{ color: "var(--muted-foreground)" }}
            >
              {session.description}
            </p>
          ) : null}
          <p
            className="mt-1 text-sm"
            style={{ color: "var(--muted-foreground)" }}
          >
            {new Date(session.session_date).toLocaleDateString("en-AU", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
            {session.created_by_user
              ? ` · Created by ${session.created_by_user.first_name} ${session.created_by_user.last_name}`
              : null}
          </p>
        </div>

        {session.status === "open" ? (
          <div className="flex items-center gap-2">
            <button
              onClick={handleClose}
              disabled={actionLoading}
              className="rounded-lg border border-border px-3 py-2 text-sm font-medium active-push touch-target disabled:opacity-50"
              style={{ color: "var(--foreground)" }}
            >
              Close Session
            </button>
          </div>
        ) : session.status === "closed" ? (
          <button
            onClick={handleArchive}
            disabled={actionLoading}
            className="rounded-lg border border-border px-3 py-2 text-sm font-medium active-push touch-target disabled:opacity-50"
            style={{ color: "var(--muted-foreground)" }}
          >
            Archive
          </button>
        ) : null}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div
          className="rounded-lg border border-border p-4"
          style={{ backgroundColor: "var(--card)" }}
        >
          <div
            className="text-2xl font-bold"
            style={{ color: "var(--foreground)" }}
          >
            {session.photos_by_status.total}
          </div>
          <div className="text-sm" style={{ color: "var(--muted-foreground)" }}>
            Total Photos
          </div>
        </div>
        <div
          className="rounded-lg border border-border p-4"
          style={{ backgroundColor: "var(--card)" }}
        >
          <div
            className="text-2xl font-bold"
            style={{ color: "var(--photo-matched)" }}
          >
            {session.photos_by_status.matched}
          </div>
          <div className="text-sm" style={{ color: "var(--muted-foreground)" }}>
            Matched
          </div>
        </div>
        <div
          className="rounded-lg border border-border p-4"
          style={{ backgroundColor: "var(--card)" }}
        >
          <div
            className="text-2xl font-bold"
            style={{
              color:
                session.photos_by_status.unmatched > 0
                  ? "var(--photo-unmatched)"
                  : "var(--photo-matched)",
            }}
          >
            {session.photos_by_status.unmatched}
          </div>
          <div className="text-sm" style={{ color: "var(--muted-foreground)" }}>
            Unmatched
          </div>
        </div>
      </div>

      {/* Workflow */}
      {session.status === "open" ? (
        <>
          {step === "overview" || step === "uploading" ? (
            <div className="space-y-4">
              <h2
                className="text-lg font-semibold"
                style={{ color: "var(--foreground)" }}
              >
                Upload Photos
              </h2>
              <BulkUploadZone
                sessionId={session.id}
                personType={personType}
                tenantId={tenantId}
                onUploadComplete={handleUploadComplete}
              />
            </div>
          ) : null}

          {step === "matching" && uploadedPhotos.length > 0 ? (
            <div className="space-y-4">
              <h2
                className="text-lg font-semibold"
                style={{ color: "var(--foreground)" }}
              >
                Match Photos to Profiles
              </h2>
              <FilenameMatcherClient
                sessionId={session.id}
                photos={uploadedPhotos}
                roster={roster}
                personType={personType}
                onMatchComplete={handleMatchComplete}
              />
            </div>
          ) : null}

          {/* Show unmatched from previous uploads */}
          {step === "overview" && unmatchedPhotos.length > 0 ? (
            <div className="space-y-4">
              <h2
                className="text-lg font-semibold"
                style={{ color: "var(--foreground)" }}
              >
                Unmatched Photos ({unmatchedPhotos.length})
              </h2>
              <p
                className="text-sm"
                style={{ color: "var(--muted-foreground)" }}
              >
                These photos from previous uploads have not been matched to a
                person yet.
              </p>
              <button
                onClick={() => {
                  setUploadedPhotos(
                    unmatchedPhotos.map((p) => ({
                      id: p.id,
                      photo_url: p.photo_url,
                      original_filename: p.original_filename ?? "unknown",
                    })),
                  );
                  setStep("matching");
                }}
                className="rounded-lg px-4 py-2 text-sm font-medium active-push touch-target"
                style={{
                  backgroundColor: "var(--photo-unmatched)",
                  color: "var(--photo-unmatched-fg)",
                }}
              >
                Match Now
              </button>
            </div>
          ) : null}
        </>
      ) : (
        <div className="space-y-4">
          <h2
            className="text-lg font-semibold"
            style={{ color: "var(--foreground)" }}
          >
            Photos ({matchedPhotos.length} matched)
          </h2>
          {matchedPhotos.length > 0 ? (
            <div className="grid grid-cols-4 gap-3 sm:grid-cols-6 md:grid-cols-8">
              {matchedPhotos.map((photo) => (
                <div
                  key={photo.id}
                  className="aspect-[3/4] overflow-hidden rounded-lg"
                >
                  <img
                    src={photo.photo_url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: "var(--muted-foreground)" }}>
              No matched photos in this session.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
