// src/components/domain/observations/observation-capture-form.tsx
//
// ============================================================
// WattleOS V2 - Observation Capture Form (with Media)
// ============================================================
// Client component: text + student tags + outcome tags + photos.
//
// SECURITY CHANGES (Storage Migration):
// - Upload path now includes tenantId: {tenantId}/{obsId}/{uuid}.ext
//   This matches the RLS policy on observation-media bucket.
// - No longer calls getPublicUrl (bucket is now private).
// - Stores only the storage_path; thumbnail_url is resolved
//   server-side via signed URLs when observations are read.
// ============================================================

"use client";

import {
  addObservationMedia,
  createObservation,
  publishObservation,
} from "@/lib/actions/observations";
import { tagObservationWithSensitivePeriods } from "@/lib/actions/three-period-lessons";
import {
  ObservationPeriodTagger,
  type ActivePeriodOption,
} from "@/components/domain/sensitive-periods/observation-period-tagger";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { compressImage } from "@/lib/utils/image-compression";
import { GlowTarget } from "@/components/domain/glow/glow-registry";
import { useHaptics } from "@/lib/hooks/use-haptics";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";

// ============================================================
// Types
// ============================================================

interface StudentOption {
  id: string;
  firstName: string;
  lastName: string;
  preferredName: string | null;
  photoUrl: string | null;
  mediaConsent: boolean;
}

interface OutcomeOption {
  id: string;
  title: string;
  level: string;
  instanceName: string;
}

interface ObservationCaptureFormProps {
  students: StudentOption[];
  outcomes: OutcomeOption[];
  /** Active sensitive periods for all students - filtered client-side to selected students. */
  activePeriods: ActivePeriodOption[];
  canPublish: boolean;
  /** Tenant ID for storage path scoping. Passed from server component. */
  tenantId: string;
}

type PhotoUploadStatus =
  | "pending"
  | "compressing"
  | "uploading"
  | "done"
  | "error";

interface PhotoEntry {
  file: File;
  previewUrl: string;
  status: PhotoUploadStatus;
  errorMessage: string | null;
}

// ============================================================
// Component
// ============================================================

export function ObservationCaptureForm({
  students,
  outcomes,
  activePeriods,
  canPublish,
  tenantId,
}: ObservationCaptureFormProps) {
  // Form state
  const [content, setContent] = useState("");
  const [selectedStudents, setSelectedStudents] = useState<StudentOption[]>([]);
  const [selectedOutcomes, setSelectedOutcomes] = useState<OutcomeOption[]>([]);
  const [selectedPeriodIds, setSelectedPeriodIds] = useState<string[]>([]);
  const [photoEntries, setPhotoEntries] = useState<PhotoEntry[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [consentWarning, setConsentWarning] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const haptics = useHaptics();

  // Student search
  const [studentQuery, setStudentQuery] = useState("");
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);
  const filteredStudents = studentQuery.trim()
    ? students.filter(
        (s) =>
          !selectedStudents.find((sel) => sel.id === s.id) &&
          (s.firstName.toLowerCase().includes(studentQuery.toLowerCase()) ||
            s.lastName.toLowerCase().includes(studentQuery.toLowerCase()) ||
            s.preferredName
              ?.toLowerCase()
              .includes(studentQuery.toLowerCase())),
      )
    : students.filter((s) => !selectedStudents.find((sel) => sel.id === s.id));

  // Outcome search
  const [outcomeQuery, setOutcomeQuery] = useState("");
  const [showOutcomeDropdown, setShowOutcomeDropdown] = useState(false);
  const filteredOutcomes = outcomeQuery.trim()
    ? outcomes.filter(
        (o) =>
          !selectedOutcomes.find((sel) => sel.id === o.id) &&
          o.title.toLowerCase().includes(outcomeQuery.toLowerCase()),
      )
    : [];

  // ============================================================
  // Student / Outcome handlers
  // ============================================================

  function addStudent(student: StudentOption) {
    haptics.selection();
    setSelectedStudents((prev) => [...prev, student]);
    setStudentQuery("");
    setShowStudentDropdown(false);
  }

  function removeStudent(id: string) {
    haptics.impact("light");
    setSelectedStudents((prev) => prev.filter((s) => s.id !== id));
  }

  function addOutcome(outcome: OutcomeOption) {
    haptics.selection();
    setSelectedOutcomes((prev) => [...prev, outcome]);
    setOutcomeQuery("");
    setShowOutcomeDropdown(false);
  }

  function removeOutcome(id: string) {
    haptics.impact("light");
    setSelectedOutcomes((prev) => prev.filter((o) => o.id !== id));
  }

  // ============================================================
  // Photo handlers
  // ============================================================

  const handlePhotoSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      if (files.length === 0) return;

      const newEntries: PhotoEntry[] = files.map((file) => ({
        file,
        previewUrl: URL.createObjectURL(file),
        status: "pending" as const,
        errorMessage: null,
      }));

      setPhotoEntries((prev) => [...prev, ...newEntries]);

      // Reset the input so the same file can be re-selected
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [],
  );

  function removePhoto(index: number) {
    setPhotoEntries((prev) => {
      URL.revokeObjectURL(prev[index].previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  }

  // ============================================================
  // Consent check
  // ============================================================

  function checkMediaConsent(): boolean {
    if (photoEntries.length === 0) return true; // No media, no issue

    const noConsentStudents = selectedStudents.filter((s) => !s.mediaConsent);
    if (noConsentStudents.length === 0) return true;

    const names = noConsentStudents
      .map((s) => s.preferredName ?? s.firstName)
      .join(", ");

    setConsentWarning(
      `Media consent has not been granted for: ${names}. Photos will still be saved, but may not be shared externally.`,
    );
    return false;
  }

  function dismissConsentWarning() {
    setConsentWarning(null);
  }

  // ============================================================
  // Save / Publish
  // ============================================================

  async function handleSave(publish: boolean) {
    if (!content.trim() && selectedStudents.length === 0) {
      haptics.warning();
      setError("Please add some content or tag a student.");
      return;
    }

    // Consent check on publish only
    if (publish && photoEntries.length > 0) {
      const consentOk = checkMediaConsent();
      if (!consentOk && !consentWarning) {
        // First time - show warning, don't proceed yet.
        haptics.warning();
        // The user will click Publish again after seeing the warning.
        return;
      }
    }

    // Publish is heavier than draft save - more significant feedback
    publish ? haptics.impact("heavy") : haptics.impact("medium");

    setError(null);
    setConsentWarning(null);
    publish ? setIsPublishing(true) : setIsSaving(true);

    // 1. Create the observation
    const result = await createObservation({
      content: content.trim(),
      studentIds: selectedStudents.map((s) => s.id),
      outcomeIds: selectedOutcomes.map((o) => o.id),
    });

    if (result.error || !result.data) {
      haptics.error();
      setError(result.error?.message ?? "Failed to save observation");
      setIsSaving(false);
      setIsPublishing(false);
      return;
    }

    const observationId = result.data.id;

    // 2. Tag sensitive periods (fire-and-forget on error - non-blocking)
    if (selectedPeriodIds.length > 0) {
      await tagObservationWithSensitivePeriods(
        observationId,
        selectedPeriodIds,
      );
    }

    // 3. Compress and upload photos
    if (photoEntries.length > 0) {
      const supabase = createSupabaseBrowserClient();

      for (let i = 0; i < photoEntries.length; i++) {
        const entry = photoEntries[i];

        // 2a. Compress
        updatePhotoStatus(i, "compressing");
        let fileToUpload: File;
        try {
          fileToUpload = await compressImage(entry.file);
        } catch (compressErr) {
          console.error("Compression failed, uploading original:", compressErr);
          fileToUpload = entry.file;
        }

        // 2b. Upload to Supabase Storage
        // PATH: {tenantId}/{observationId}/{uuid}.{ext}
        // WHY tenantId prefix: RLS policy on observation-media bucket
        // checks (storage.foldername(name))[1] = jwt.tenant_id.
        // Without this prefix, the upload is rejected by RLS.
        updatePhotoStatus(i, "uploading");
        const ext = fileToUpload.name.split(".").pop() ?? "jpg";
        const path = `${tenantId}/${observationId}/${crypto.randomUUID()}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("observation-media")
          .upload(path, fileToUpload, { contentType: fileToUpload.type });

        if (uploadError) {
          console.error("Photo upload failed:", uploadError.message);
          updatePhotoStatus(i, "error", uploadError.message);
          continue;
        }

        // 2c. Record the media attachment
        // WHY no thumbnailUrl: The bucket is now private. Public URLs
        // don't work. Signed URLs are generated server-side when
        // observations are read (see resolveSignedUrls utility).
        // We store only the storage_path.
        await addObservationMedia({
          observationId,
          mediaType: "image",
          storageProvider: "supabase",
          storagePath: path,
          fileName: entry.file.name,
          fileSizeBytes: fileToUpload.size,
        });

        updatePhotoStatus(i, "done");
      }
    }

    // 4. Publish if requested
    if (publish) {
      await publishObservation(observationId);
    }

    // 4. Redirect to feed
    haptics.success();
    router.push("/pedagogy/observations");
    router.refresh();
  }

  function updatePhotoStatus(
    index: number,
    status: PhotoUploadStatus,
    errorMessage?: string,
  ) {
    setPhotoEntries((prev) =>
      prev.map((entry, i) =>
        i === index
          ? { ...entry, status, errorMessage: errorMessage ?? null }
          : entry,
      ),
    );
  }

  // ============================================================
  // Render
  // ============================================================

  const isBusy = isSaving || isPublishing;
  const pendingPhotos = photoEntries.filter((p) => p.status === "pending");

  return (
    <div className="space-y-6 rounded-lg border border-border bg-background p-[var(--density-card-padding)]">
      {error && (
        <div
          className="rounded-[var(--radius-md)] p-3 text-sm"
          style={{
            background: "var(--form-error-bg)",
            color: "var(--form-error-fg)",
          }}
        >
          {error}
        </div>
      )}

      {consentWarning && (
        <div
          className="rounded-[var(--radius-md)] p-3"
          style={{
            background: "var(--primary-50)",
            border: "1px solid var(--primary-200)",
          }}
        >
          <div className="flex items-start gap-2">
            <svg
              className="mt-0.5 h-4 w-4 flex-shrink-0"
              style={{ color: "var(--warning)" }}
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
              />
            </svg>
            <div className="flex-1">
              <p
                className="text-sm font-medium"
                style={{ color: "var(--warning-foreground)" }}
              >
                Media Consent Warning
              </p>
              <p
                className="mt-1 text-sm"
                style={{ color: "var(--foreground)", opacity: 0.8 }}
              >
                {consentWarning}
              </p>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => handleSave(true)}
                  className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:bg-primary"
                >
                  Publish Anyway
                </button>
                <button
                  type="button"
                  onClick={dismissConsentWarning}
                  className="rounded-md border border-primary/30 px-3 py-1 text-xs font-medium text-primary hover:bg-primary/15"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <GlowTarget
        id="obs-input-content"
        category="input"
        label="Observation text"
      >
        <div>
          <label
            htmlFor="content"
            className="block text-sm font-medium text-foreground"
          >
            What did you observe?
          </label>
          <textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Describe the learning moment..."
            rows={4}
            className="mt-1 w-full rounded-lg border border-border px-4 py-3 text-sm placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      </GlowTarget>

      {/* Student tagger */}
      <GlowTarget
        id="obs-select-students"
        category="select"
        label="Student tags"
      >
        <div>
          <label className="block text-sm font-medium text-foreground">
            Students
          </label>

          {/* Selected students */}
          {selectedStudents.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {selectedStudents.map((student) => (
                <span
                  key={student.id}
                  className="inline-flex items-center gap-1.5 rounded-full bg-info/10 px-3 py-1.5 text-sm font-medium text-info"
                >
                  {student.photoUrl ? (
                    <img
                      src={student.photoUrl}
                      alt=""
                      className="h-5 w-5 rounded-full object-cover"
                    />
                  ) : (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-info/20 text-xs font-bold">
                      {student.firstName.charAt(0)}
                    </span>
                  )}
                  {student.preferredName ?? student.firstName}{" "}
                  {student.lastName}
                  {!student.mediaConsent && photoEntries.length > 0 && (
                    <svg
                      className="h-3.5 w-3.5 text-primary"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
                      />
                    </svg>
                  )}
                  <button
                    onClick={() => removeStudent(student.id)}
                    className="ml-1 text-info hover:text-info"
                  >
                    <svg
                      className="h-3.5 w-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6 18 18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Search input */}
          <div className="relative mt-2">
            <input
              type="text"
              value={studentQuery}
              onChange={(e) => {
                setStudentQuery(e.target.value);
                setShowStudentDropdown(true);
              }}
              onFocus={() => setShowStudentDropdown(true)}
              onBlur={() =>
                setTimeout(() => setShowStudentDropdown(false), 200)
              }
              placeholder="Search students..."
              className="w-full rounded-lg border border-border px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
            />

            {/* Dropdown */}
            {showStudentDropdown && filteredStudents.length > 0 && (
              <div className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-border bg-background shadow-lg">
                {filteredStudents.slice(0, 10).map((student) => (
                  <button
                    key={student.id}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => addStudent(student)}
                    className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-primary/10"
                  >
                    {student.photoUrl ? (
                      <img
                        src={student.photoUrl}
                        alt=""
                        className="h-7 w-7 rounded-full object-cover"
                      />
                    ) : (
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
                        {student.firstName.charAt(0)}
                      </span>
                    )}
                    <span>
                      {student.preferredName ?? student.firstName}{" "}
                      <span className="text-muted-foreground">
                        {student.lastName}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </GlowTarget>

      {/* Outcome tagger */}
      <GlowTarget
        id="obs-select-outcomes"
        category="select"
        label="Learning outcome tags"
      >
        <div>
          <label className="block text-sm font-medium text-foreground">
            Curriculum Outcomes
          </label>

          {/* Selected outcomes */}
          {selectedOutcomes.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {selectedOutcomes.map((outcome) => (
                <span
                  key={outcome.id}
                  className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1.5 text-sm font-medium text-success"
                >
                  {outcome.title}
                  <button
                    onClick={() => removeOutcome(outcome.id)}
                    className="ml-1 text-success hover:text-success"
                  >
                    <svg
                      className="h-3.5 w-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6 18 18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Outcome search */}
          <div className="relative mt-2">
            <input
              type="text"
              value={outcomeQuery}
              onChange={(e) => {
                setOutcomeQuery(e.target.value);
                setShowOutcomeDropdown(true);
              }}
              onFocus={() => {
                if (outcomeQuery.trim()) setShowOutcomeDropdown(true);
              }}
              onBlur={() =>
                setTimeout(() => setShowOutcomeDropdown(false), 200)
              }
              placeholder="Search curriculum outcomes..."
              className="w-full rounded-lg border border-border px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
            />

            {showOutcomeDropdown && filteredOutcomes.length > 0 && (
              <div className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-border bg-background shadow-lg">
                {filteredOutcomes.slice(0, 10).map((outcome) => (
                  <button
                    key={outcome.id}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => addOutcome(outcome)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-primary/10"
                  >
                    <span
                      className={`inline-flex rounded px-1 py-0.5 text-[10px] font-semibold uppercase ${
                        outcome.level === "outcome"
                          ? "bg-success/15 text-success"
                          : "bg-primary/15 text-primary"
                      }`}
                    >
                      {outcome.level}
                    </span>
                    <span className="flex-1 truncate">{outcome.title}</span>
                    <span className="flex-shrink-0 text-xs text-muted-foreground">
                      {outcome.instanceName}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {showOutcomeDropdown &&
              outcomeQuery.trim() &&
              filteredOutcomes.length === 0 && (
                <div className="absolute z-10 mt-1 w-full rounded-lg border border-border bg-background p-3 text-center text-sm text-muted-foreground shadow-lg">
                  No matching outcomes found
                </div>
              )}
          </div>
        </div>
      </GlowTarget>

      {/* Sensitive period tagger - shown when selected students have active periods */}
      {(() => {
        const selectedStudentIds = new Set(selectedStudents.map((s) => s.id));
        const relevantPeriods = activePeriods.filter((p) =>
          selectedStudentIds.has(p.studentId),
        );
        if (relevantPeriods.length === 0) return null;
        return (
          <ObservationPeriodTagger
            activePeriods={relevantPeriods}
            selectedIds={selectedPeriodIds}
            onChange={setSelectedPeriodIds}
          />
        );
      })()}

      {/* Photo capture */}
      <div>
        <label className="block text-sm font-medium text-foreground">
          Photos
        </label>
        <div className="mt-2">
          {/* Preview grid with upload status */}
          {photoEntries.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-3">
              {photoEntries.map((entry, index) => (
                <div key={index} className="group relative">
                  <img
                    src={entry.previewUrl}
                    alt=""
                    className={`h-20 w-20 rounded-lg object-cover ${
                      entry.status === "error"
                        ? "ring-2 ring-destructive"
                        : entry.status === "done"
                          ? "ring-2 ring-success"
                          : ""
                    }`}
                  />

                  {/* Status overlay */}
                  {entry.status !== "pending" && entry.status !== "done" && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/40">
                      {entry.status === "compressing" && (
                        <div className="flex flex-col items-center gap-1">
                          <SpinnerIcon />
                          <span className="text-[10px] font-medium text-primary-foreground">
                            Compressing
                          </span>
                        </div>
                      )}
                      {entry.status === "uploading" && (
                        <div className="flex flex-col items-center gap-1">
                          <SpinnerIcon />
                          <span className="text-[10px] font-medium text-primary-foreground">
                            Uploading
                          </span>
                        </div>
                      )}
                      {entry.status === "error" && (
                        <div className="flex flex-col items-center gap-1">
                          <svg
                            className="h-5 w-5 text-destructive/60"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={2}
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
                            />
                          </svg>
                          <span className="text-[10px] font-medium text-destructive/60">
                            Failed
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Done checkmark */}
                  {entry.status === "done" && (
                    <div className="absolute bottom-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--mastery-mastered)]">
                      <svg
                        className="h-3 w-3 text-primary-foreground"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={3}
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="m4.5 12.75 6 6 9-13.5"
                        />
                      </svg>
                    </div>
                  )}

                  {/* Remove button (only before upload starts) */}
                  {entry.status === "pending" && (
                    <button
                      onClick={() => removePhoto(index)}
                      className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--attendance-absent)] text-primary-foreground opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <svg
                        className="h-3 w-3"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M6 18 18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Add Photo button + hidden file input */}
          <GlowTarget
            id="obs-btn-add-photo"
            category="button"
            label="Add photo"
          >
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isBusy}
              className="inline-flex items-center gap-2 rounded-lg border border-dashed border-border px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:border-primary hover:bg-primary/10 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z"
                />
              </svg>
              Add Photo
            </button>
          </GlowTarget>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            capture="environment"
            onChange={handlePhotoSelect}
            className="hidden"
          />
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-3 border-t border-border pt-4">
        <GlowTarget
          id="obs-btn-save-draft"
          category="button"
          label="Save as draft"
        >
          <button
            onClick={() => handleSave(false)}
            disabled={isBusy}
            className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-background disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? "Saving..." : "Save as Draft"}
          </button>
        </GlowTarget>

        {canPublish && (
          <GlowTarget
            id="obs-btn-publish"
            category="button"
            label="Publish observation"
          >
            <button
              onClick={() => handleSave(true)}
              disabled={isBusy}
              className="rounded-lg bg-[var(--mastery-mastered)] px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-success disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPublishing ? "Publishing..." : "Publish Now"}
            </button>
          </GlowTarget>
        )}

        <button
          onClick={() => router.back()}
          disabled={isBusy}
          className="ml-auto text-sm text-muted-foreground hover:text-foreground"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ============================================================
// Sub-components
// ============================================================

function SpinnerIcon() {
  return (
    <svg
      className="h-5 w-5 animate-spin text-primary-foreground"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}
