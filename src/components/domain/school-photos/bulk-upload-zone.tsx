"use client";

import { useState, useRef, useCallback } from "react";
import { useHaptics } from "@/lib/hooks/use-haptics";
import { compressImage } from "@/lib/utils/image-compression";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { registerPhoto } from "@/lib/actions/school-photos";
import { Capacitor } from "@capacitor/core";

// ============================================================
// Bulk Upload Zone (Module R)
// ============================================================
// THE KILLER FEATURE. Large drag-and-drop zone for bulk photo
// upload with per-file compression, progress tracking, and
// Capacitor camera integration for mobile.
// ============================================================

type FileStatus = "pending" | "compressing" | "uploading" | "done" | "error";

interface UploadFileEntry {
  id: string;
  file: File;
  status: FileStatus;
  errorMessage: string | null;
  photoId: string | null;
  photoUrl: string | null;
  originalFilename: string;
}

interface BulkUploadZoneProps {
  sessionId: string;
  personType: "student" | "staff";
  tenantId: string;
  onUploadComplete: (
    photos: Array<{
      id: string;
      photo_url: string;
      original_filename: string;
    }>,
  ) => void;
}

function generateFileId(): string {
  return `file-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function generateUuid(): string {
  return crypto.randomUUID();
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

export function BulkUploadZone({
  sessionId,
  personType,
  tenantId,
  onUploadComplete,
}: BulkUploadZoneProps) {
  const haptics = useHaptics();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<UploadFileEntry[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const isNative = typeof window !== "undefined" && Capacitor.isNativePlatform();

  const completedCount = files.filter((f) => f.status === "done").length;
  const errorCount = files.filter((f) => f.status === "error").length;
  const totalCount = files.length;
  const overallProgress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const totalSize = files.reduce((sum, f) => sum + f.file.size, 0);

  const filterImageFiles = useCallback((fileList: FileList | File[]): File[] => {
    const arr = Array.from(fileList);
    return arr.filter(
      (f) =>
        ACCEPTED_TYPES.includes(f.type) || f.name.match(/\.(jpg|jpeg|png|webp|heic|heif)$/i),
    );
  }, []);

  const addFiles = useCallback(
    (newFiles: File[]) => {
      const imageFiles = filterImageFiles(newFiles);
      if (imageFiles.length === 0) return;

      const entries: UploadFileEntry[] = imageFiles.map((file) => ({
        id: generateFileId(),
        file,
        status: "pending" as const,
        errorMessage: null,
        photoId: null,
        photoUrl: null,
        originalFilename: file.name,
      }));

      setFiles((prev) => [...prev, ...entries]);
    },
    [filterImageFiles],
  );

  const processUploads = useCallback(async () => {
    setIsUploading(true);
    const supabase = createSupabaseBrowserClient();
    const completedPhotos: Array<{
      id: string;
      photo_url: string;
      original_filename: string;
    }> = [];

    setFiles((prev) =>
      prev.map((f) => (f.status === "pending" ? { ...f, status: "pending" as const } : f)),
    );

    // Process files sequentially to avoid overwhelming the connection
    for (let i = 0; i < files.length; i++) {
      const entry = files[i];
      if (entry.status === "done" || entry.status === "error") continue;

      // Mark as compressing
      setFiles((prev) =>
        prev.map((f) =>
          f.id === entry.id ? { ...f, status: "compressing" as const } : f,
        ),
      );

      try {
        // Step 1: Compress
        const compressed = await compressImage(entry.file, {
          maxDimension: 1200,
          maxSizeBytes: 1_048_576, // 1MB for profile photos
        });

        // Mark as uploading
        setFiles((prev) =>
          prev.map((f) =>
            f.id === entry.id ? { ...f, status: "uploading" as const } : f,
          ),
        );

        // Step 2: Upload to Supabase Storage
        const uuid = generateUuid();
        const storagePath = `${tenantId}/${personType}/${uuid}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from("profile-photos")
          .upload(storagePath, compressed, {
            contentType: "image/jpeg",
            upsert: false,
          });

        if (uploadError) {
          throw new Error(uploadError.message);
        }

        // Step 3: Get public URL
        const { data: urlData } = supabase.storage
          .from("profile-photos")
          .getPublicUrl(storagePath);

        const publicUrl = urlData.publicUrl;

        // Step 4: Register photo via server action
        const result = await registerPhoto({
          session_id: sessionId,
          person_type: personType,
          person_id: null,
          storage_path: storagePath,
          photo_url: publicUrl,
          original_filename: entry.originalFilename,
          file_size_bytes: compressed.size,
        });

        if (result.error) {
          throw new Error(result.error.message);
        }

        const photoId = result.data!.id;

        // Mark as done
        setFiles((prev) =>
          prev.map((f) =>
            f.id === entry.id
              ? {
                  ...f,
                  status: "done" as const,
                  photoId,
                  photoUrl: publicUrl,
                }
              : f,
          ),
        );

        completedPhotos.push({
          id: photoId,
          photo_url: publicUrl,
          original_filename: entry.originalFilename,
        });

        haptics.impact("light");
      } catch (err) {
        const message = err instanceof Error ? err.message : "Upload failed";
        setFiles((prev) =>
          prev.map((f) =>
            f.id === entry.id
              ? { ...f, status: "error" as const, errorMessage: message }
              : f,
          ),
        );
      }
    }

    setIsUploading(false);

    if (completedPhotos.length > 0) {
      haptics.impact("heavy");
      onUploadComplete(completedPhotos);
    }
  }, [files, sessionId, personType, tenantId, onUploadComplete, haptics]);

  // Drag handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        addFiles(Array.from(e.dataTransfer.files));
      }
    },
    [addFiles],
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        addFiles(Array.from(e.target.files));
        // Reset input so the same files can be re-selected
        e.target.value = "";
      }
    },
    [addFiles],
  );

  const handleCameraCapture = useCallback(async () => {
    if (!isNative) return;
    try {
      const { Camera, CameraResultType, CameraSource } = await import(
        "@capacitor/camera"
      );
      const photo = await Camera.getPhoto({
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera,
        quality: 90,
      });

      if (photo.webPath) {
        const response = await fetch(photo.webPath);
        const blob = await response.blob();
        const file = new File([blob], `camera-${Date.now()}.jpg`, {
          type: "image/jpeg",
        });
        addFiles([file]);
      }
    } catch {
      // User cancelled or camera unavailable
    }
  }, [isNative, addFiles]);

  const handleZoneClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const removeFile = useCallback((fileId: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
  }, []);

  const clearCompleted = useCallback(() => {
    setFiles((prev) => prev.filter((f) => f.status !== "done"));
  }, []);

  const statusIcon = (status: FileStatus): string => {
    switch (status) {
      case "pending":
        return "\u23F3"; // hourglass
      case "compressing":
        return "\u2699\uFE0F"; // gear
      case "uploading":
        return "\u2B06\uFE0F"; // up arrow
      case "done":
        return "\u2705"; // check
      case "error":
        return "\u274C"; // cross
    }
  };

  const statusLabel = (status: FileStatus): string => {
    switch (status) {
      case "pending":
        return "Pending";
      case "compressing":
        return "Compressing...";
      case "uploading":
        return "Uploading...";
      case "done":
        return "Done";
      case "error":
        return "Error";
    }
  };

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        role="button"
        tabIndex={0}
        onClick={handleZoneClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleZoneClick();
          }
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className="relative flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-[var(--radius-lg)] border-2 border-dashed p-8 transition-all"
        style={{
          borderColor: isDragOver
            ? "var(--primary)"
            : "var(--border)",
          background: isDragOver
            ? "color-mix(in srgb, var(--primary) 6%, transparent)"
            : "var(--card)",
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
          onChange={handleFileSelect}
          className="hidden"
        />

        <svg
          className="mb-3 h-12 w-12"
          style={{
            color: isDragOver
              ? "var(--primary)"
              : "var(--empty-state-icon)",
          }}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
          />
        </svg>

        <p
          className="text-sm font-semibold"
          style={{ color: "var(--foreground)" }}
        >
          {isDragOver ? "Drop photos here" : "Drag photos here or click to browse"}
        </p>
        <p
          className="mt-1 text-xs"
          style={{ color: "var(--muted-foreground)" }}
        >
          Accepts JPG, PNG, WebP, HEIC. Max 1200px, compressed to 1MB.
        </p>
      </div>

      {/* Camera button for native */}
      {isNative && (
        <button
          type="button"
          onClick={handleCameraCapture}
          className="active-push touch-target flex w-full items-center justify-center gap-2 rounded-[var(--radius-md)] border border-border px-4 py-3 text-sm font-semibold"
          style={{
            background: "var(--card)",
            color: "var(--foreground)",
          }}
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
              d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z"
            />
          </svg>
          Take Photo with Camera
        </button>
      )}

      {/* File list and progress */}
      {files.length > 0 && (
        <div
          className="rounded-[var(--radius-lg)] border border-border p-4"
          style={{ background: "var(--card)" }}
        >
          {/* Summary header */}
          <div className="mb-3 flex items-center justify-between">
            <div>
              <span
                className="text-sm font-semibold"
                style={{ color: "var(--foreground)" }}
              >
                {totalCount} file{totalCount !== 1 ? "s" : ""} selected
              </span>
              <span
                className="ml-2 text-xs"
                style={{ color: "var(--muted-foreground)" }}
              >
                ({formatBytes(totalSize)})
              </span>
            </div>
            <div className="flex items-center gap-2">
              {completedCount > 0 && (
                <button
                  type="button"
                  onClick={clearCompleted}
                  className="text-xs font-medium"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  Clear completed
                </button>
              )}
              {completedCount < totalCount && !isUploading && (
                <span
                  className="text-xs"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  {completedCount}/{totalCount} done
                  {errorCount > 0 && ` (${errorCount} failed)`}
                </span>
              )}
            </div>
          </div>

          {/* Overall progress bar */}
          <div
            className="mb-4 h-2 w-full overflow-hidden rounded-full"
            style={{ background: "var(--muted)" }}
          >
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${overallProgress}%`,
                background:
                  errorCount > 0 && completedCount + errorCount === totalCount
                    ? "var(--photo-unmatched)"
                    : "var(--photo-matched)",
              }}
            />
          </div>

          {/* Per-file status list */}
          <div className="scroll-native max-h-[300px] space-y-2 overflow-y-auto">
            {files.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center gap-3 rounded-[var(--radius-md)] border border-border px-3 py-2"
                style={{ background: "var(--background)" }}
              >
                {/* Status icon */}
                <span className="flex-shrink-0 text-sm">
                  {statusIcon(entry.status)}
                </span>

                {/* Filename */}
                <span
                  className="min-w-0 flex-1 truncate text-xs"
                  style={{ color: "var(--foreground)" }}
                >
                  {entry.originalFilename}
                </span>

                {/* Status label */}
                <span
                  className="flex-shrink-0 text-xs"
                  style={{
                    color:
                      entry.status === "done"
                        ? "var(--photo-matched)"
                        : entry.status === "error"
                          ? "var(--photo-no-photo)"
                          : "var(--muted-foreground)",
                  }}
                >
                  {entry.status === "error" && entry.errorMessage
                    ? entry.errorMessage
                    : statusLabel(entry.status)}
                </span>

                {/* Remove button (only when not actively processing) */}
                {(entry.status === "pending" ||
                  entry.status === "done" ||
                  entry.status === "error") && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(entry.id);
                    }}
                    className="flex-shrink-0 rounded p-1"
                    style={{ color: "var(--muted-foreground)" }}
                    aria-label={`Remove ${entry.originalFilename}`}
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
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Upload button */}
          {files.some((f) => f.status === "pending") && !isUploading && (
            <button
              type="button"
              onClick={processUploads}
              className="active-push touch-target mt-4 w-full rounded-[var(--radius-md)] px-4 py-3 text-sm font-semibold"
              style={{
                background: "var(--primary)",
                color: "var(--primary-foreground)",
              }}
            >
              Upload {files.filter((f) => f.status === "pending").length} Photo
              {files.filter((f) => f.status === "pending").length !== 1
                ? "s"
                : ""}
            </button>
          )}

          {/* Uploading indicator */}
          {isUploading && (
            <div
              className="mt-4 flex items-center justify-center gap-2 py-2 text-sm"
              style={{ color: "var(--muted-foreground)" }}
            >
              <svg
                className="h-4 w-4 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
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
              Uploading... {completedCount}/{totalCount}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
