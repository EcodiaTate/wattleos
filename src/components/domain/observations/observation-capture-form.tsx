// src/components/domain/observations/observation-capture-form.tsx
//
// ============================================================
// WattleOS V2 - Observation Capture Form (with Media)
// ============================================================
// Client component: text + student tags + outcome tags + photos.
//
// CHANGES from previous version:
// - Added image compression via compressImage() before upload
// - Added per-photo upload progress indicators
// - Added upload status feedback (compressing → uploading → done / error)
// - Added consent warning when publishing with media + tagged students
// ============================================================

"use client";

import {
  addObservationMedia,
  createObservation,
  publishObservation,
} from "@/lib/actions/observations";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { compressImage } from "@/lib/utils/image-compression";
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
  canPublish: boolean;
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
  canPublish,
}: ObservationCaptureFormProps) {
  // Form state
  const [content, setContent] = useState("");
  const [selectedStudents, setSelectedStudents] = useState<StudentOption[]>([]);
  const [selectedOutcomes, setSelectedOutcomes] = useState<OutcomeOption[]>([]);
  const [photoEntries, setPhotoEntries] = useState<PhotoEntry[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [consentWarning, setConsentWarning] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

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
    setSelectedStudents((prev) => [...prev, student]);
    setStudentQuery("");
    setShowStudentDropdown(false);
  }

  function removeStudent(id: string) {
    setSelectedStudents((prev) => prev.filter((s) => s.id !== id));
  }

  function addOutcome(outcome: OutcomeOption) {
    setSelectedOutcomes((prev) => [...prev, outcome]);
    setOutcomeQuery("");
    setShowOutcomeDropdown(false);
  }

  function removeOutcome(id: string) {
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
      setError("Please add some content or tag a student.");
      return;
    }

    // Consent check on publish only
    if (publish && photoEntries.length > 0) {
      const consentOk = checkMediaConsent();
      if (!consentOk && !consentWarning) {
        // First time - show warning, don't proceed yet.
        // The user will click Publish again after seeing the warning.
        return;
      }
    }

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
      setError(result.error?.message ?? "Failed to save observation");
      setIsSaving(false);
      setIsPublishing(false);
      return;
    }

    const observationId = result.data.id;

    // 2. Compress and upload photos
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
        updatePhotoStatus(i, "uploading");
        const ext = fileToUpload.name.split(".").pop() ?? "jpg";
        const path = `${observationId}/${crypto.randomUUID()}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("observation-media")
          .upload(path, fileToUpload, { contentType: fileToUpload.type });

        if (uploadError) {
          console.error("Photo upload failed:", uploadError.message);
          updatePhotoStatus(i, "error", uploadError.message);
          continue;
        }

        // 2c. Get public URL for thumbnail
        const { data: urlData } = supabase.storage
          .from("observation-media")
          .getPublicUrl(path);

        // 2d. Record the media attachment
        await addObservationMedia({
          observationId,
          mediaType: "image",
          storageProvider: "supabase",
          storagePath: path,
          thumbnailUrl: urlData?.publicUrl ?? null,
          fileName: entry.file.name,
          fileSizeBytes: fileToUpload.size,
        });

        updatePhotoStatus(i, "done");
      }
    }

    // 3. Publish if requested
    if (publish) {
      await publishObservation(observationId);
    }

    // 4. Redirect to feed
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
    <div className="space-y-6 rounded-lg border border-gray-200 bg-white p-6">
      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {consentWarning && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
          <div className="flex items-start gap-2">
            <svg
              className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600"
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
              <p className="text-sm font-medium text-amber-800">
                Media Consent Warning
              </p>
              <p className="mt-1 text-sm text-amber-700">{consentWarning}</p>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => handleSave(true)}
                  className="rounded-md bg-amber-600 px-3 py-1 text-xs font-medium text-white hover:bg-amber-700"
                >
                  Publish Anyway
                </button>
                <button
                  type="button"
                  onClick={dismissConsentWarning}
                  className="rounded-md border border-amber-300 px-3 py-1 text-xs font-medium text-amber-700 hover:bg-amber-100"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div>
        <label
          htmlFor="content"
          className="block text-sm font-medium text-gray-700"
        >
          What did you observe?
        </label>
        <textarea
          id="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Describe the learning moment..."
          rows={4}
          className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-3 text-sm placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      {/* Student tagger */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Students
        </label>

        {/* Selected students */}
        {selectedStudents.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {selectedStudents.map((student) => (
              <span
                key={student.id}
                className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700"
              >
                {student.photoUrl ? (
                  <img
                    src={student.photoUrl}
                    alt=""
                    className="h-5 w-5 rounded-full object-cover"
                  />
                ) : (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-200 text-xs font-bold">
                    {student.firstName.charAt(0)}
                  </span>
                )}
                {student.preferredName ?? student.firstName} {student.lastName}
                {!student.mediaConsent && photoEntries.length > 0 && (
                  <svg
                    className="h-3.5 w-3.5 text-amber-500"
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
                  className="ml-1 text-blue-400 hover:text-blue-700"
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
            onBlur={() => setTimeout(() => setShowStudentDropdown(false), 200)}
            placeholder="Search students..."
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
          />

          {/* Dropdown */}
          {showStudentDropdown && filteredStudents.length > 0 && (
            <div className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
              {filteredStudents.slice(0, 10).map((student) => (
                <button
                  key={student.id}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => addStudent(student)}
                  className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-amber-50"
                >
                  {student.photoUrl ? (
                    <img
                      src={student.photoUrl}
                      alt=""
                      className="h-7 w-7 rounded-full object-cover"
                    />
                  ) : (
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-200 text-xs font-bold text-gray-600">
                      {student.firstName.charAt(0)}
                    </span>
                  )}
                  <span>
                    {student.preferredName ?? student.firstName}{" "}
                    <span className="text-gray-500">{student.lastName}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Outcome tagger */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Curriculum Outcomes
        </label>

        {/* Selected outcomes */}
        {selectedOutcomes.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {selectedOutcomes.map((outcome) => (
              <span
                key={outcome.id}
                className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1.5 text-sm font-medium text-green-700"
              >
                {outcome.title}
                <button
                  onClick={() => removeOutcome(outcome.id)}
                  className="ml-1 text-green-400 hover:text-green-700"
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
            onBlur={() => setTimeout(() => setShowOutcomeDropdown(false), 200)}
            placeholder="Search curriculum outcomes..."
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
          />

          {showOutcomeDropdown && filteredOutcomes.length > 0 && (
            <div className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
              {filteredOutcomes.slice(0, 10).map((outcome) => (
                <button
                  key={outcome.id}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => addOutcome(outcome)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-amber-50"
                >
                  <span
                    className={`inline-flex rounded px-1 py-0.5 text-[10px] font-semibold uppercase ${
                      outcome.level === "outcome"
                        ? "bg-green-100 text-green-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {outcome.level}
                  </span>
                  <span className="flex-1 truncate">{outcome.title}</span>
                  <span className="flex-shrink-0 text-xs text-gray-400">
                    {outcome.instanceName}
                  </span>
                </button>
              ))}
            </div>
          )}

          {showOutcomeDropdown &&
            outcomeQuery.trim() &&
            filteredOutcomes.length === 0 && (
              <div className="absolute z-10 mt-1 w-full rounded-lg border border-gray-200 bg-white p-3 text-center text-sm text-gray-500 shadow-lg">
                No matching outcomes found
              </div>
            )}
        </div>
      </div>

      {/* Photo capture */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
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
                        ? "ring-2 ring-red-400"
                        : entry.status === "done"
                          ? "ring-2 ring-green-400"
                          : ""
                    }`}
                  />

                  {/* Status overlay */}
                  {entry.status !== "pending" && entry.status !== "done" && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/40">
                      {entry.status === "compressing" && (
                        <div className="flex flex-col items-center gap-1">
                          <SpinnerIcon />
                          <span className="text-[10px] font-medium text-white">
                            Compressing
                          </span>
                        </div>
                      )}
                      {entry.status === "uploading" && (
                        <div className="flex flex-col items-center gap-1">
                          <SpinnerIcon />
                          <span className="text-[10px] font-medium text-white">
                            Uploading
                          </span>
                        </div>
                      )}
                      {entry.status === "error" && (
                        <div className="flex flex-col items-center gap-1">
                          <svg
                            className="h-5 w-5 text-red-300"
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
                          <span className="text-[10px] font-medium text-red-300">
                            Failed
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Done checkmark */}
                  {entry.status === "done" && (
                    <div className="absolute bottom-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-green-500">
                      <svg
                        className="h-3 w-3 text-white"
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
                      className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white opacity-0 transition-opacity group-hover:opacity-100"
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
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isBusy}
            className="inline-flex items-center gap-2 rounded-lg border border-dashed border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:border-amber-400 hover:bg-amber-50 hover:text-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
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
      <div className="flex items-center gap-3 border-t border-gray-100 pt-4">
        <button
          onClick={() => handleSave(false)}
          disabled={isBusy}
          className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSaving ? "Saving..." : "Save as Draft"}
        </button>

        {canPublish && (
          <button
            onClick={() => handleSave(true)}
            disabled={isBusy}
            className="rounded-lg bg-green-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPublishing ? "Publishing..." : "Publish Now"}
          </button>
        )}

        <button
          onClick={() => router.back()}
          disabled={isBusy}
          className="ml-auto text-sm text-gray-500 hover:text-gray-700"
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
      className="h-5 w-5 animate-spin text-white"
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
