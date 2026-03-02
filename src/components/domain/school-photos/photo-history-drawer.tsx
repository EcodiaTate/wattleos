"use client";

import { useState, useCallback, useEffect } from "react";
import { useHaptics } from "@/lib/hooks/use-haptics";
import type { PersonPhoto } from "@/types/domain";

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

interface PhotoHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  personName: string;
  photos: PersonPhoto[];
  onSetCurrent: (photoId: string) => void;
  onDelete: (photoId: string) => void;
}

export function PhotoHistoryDrawer({
  isOpen,
  onClose,
  personName,
  photos,
  onSetCurrent,
  onDelete,
}: PhotoHistoryDrawerProps) {
  const haptics = useHaptics();
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Close delete confirmation when drawer closes
  useEffect(() => {
    if (!isOpen) {
      setDeleteConfirmId(null);
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleSetCurrent = useCallback(
    (photoId: string) => {
      haptics.impact("medium");
      onSetCurrent(photoId);
    },
    [haptics, onSetCurrent],
  );

  const handleDeleteRequest = useCallback(
    (photoId: string) => {
      haptics.impact("heavy");
      setDeleteConfirmId(photoId);
    },
    [haptics],
  );

  const handleDeleteConfirm = useCallback(
    (photoId: string) => {
      haptics.impact("heavy");
      onDelete(photoId);
      setDeleteConfirmId(null);
    },
    [haptics, onDelete],
  );

  const handleDeleteCancel = useCallback(() => {
    setDeleteConfirmId(null);
  }, []);

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-50"
        style={{ background: "rgba(0, 0, 0, 0.5)" }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-border shadow-xl"
        style={{ background: "var(--background)" }}
        role="dialog"
        aria-modal="true"
        aria-label={`Photo history for ${personName}`}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between border-b border-border px-4 py-3"
          style={{ paddingTop: "calc(var(--safe-top, 0px) + 12px)" }}
        >
          <div className="min-w-0 flex-1">
            <h2
              className="truncate text-base font-semibold"
              style={{ color: "var(--foreground)" }}
            >
              {personName}
            </h2>
            <p
              className="text-xs"
              style={{ color: "var(--muted-foreground)" }}
            >
              {photos.length} photo{photos.length !== 1 ? "s" : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="active-push touch-target ml-3 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[var(--radius-md)] border border-border text-sm"
            style={{
              background: "var(--card)",
              color: "var(--foreground)",
            }}
            aria-label="Close"
          >
            {"\u2715"}
          </button>
        </div>

        {/* Content */}
        <div
          className="scroll-native flex-1 overflow-y-auto px-4 py-4"
          style={{ paddingBottom: "calc(var(--safe-bottom, 0px) + 16px)" }}
        >
          {photos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ color: "var(--empty-state-icon)" }}
                className="mb-3"
              >
                <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                <circle cx="9" cy="9" r="2" />
                <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
              </svg>
              <p
                className="text-sm"
                style={{ color: "var(--muted-foreground)" }}
              >
                No photos on file
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {photos.map((photo) => (
                <div
                  key={photo.id}
                  className="overflow-hidden rounded-[var(--radius-lg)] border border-border"
                  style={{ background: "var(--card)" }}
                >
                  {/* Thumbnail */}
                  <div className="relative aspect-[3/4] w-full overflow-hidden">
                    <img
                      src={photo.photo_url}
                      alt={`Photo from ${formatDate(photo.created_at)}`}
                      className="h-full w-full object-cover"
                    />
                    {photo.is_current && (
                      <span
                        className="absolute left-1.5 top-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase"
                        style={{
                          background: "var(--photo-matched)",
                          color: "var(--photo-matched-fg)",
                        }}
                      >
                        Current
                      </span>
                    )}
                  </div>

                  {/* Info + actions */}
                  <div className="space-y-2 p-2.5">
                    <div>
                      <p
                        className="text-xs font-medium"
                        style={{ color: "var(--foreground)" }}
                      >
                        {formatDate(photo.created_at)}
                      </p>
                      {photo.original_filename !== null && (
                        <p
                          className="truncate text-[10px]"
                          style={{ color: "var(--muted-foreground)" }}
                        >
                          {photo.original_filename}
                        </p>
                      )}
                    </div>

                    <div className="flex gap-1.5">
                      {!photo.is_current && (
                        <button
                          type="button"
                          onClick={() => handleSetCurrent(photo.id)}
                          className="active-push touch-target flex-1 rounded-[var(--radius-sm)] px-2 py-1.5 text-[11px] font-semibold transition-opacity"
                          style={{
                            background: "var(--primary)",
                            color: "var(--primary-foreground)",
                          }}
                        >
                          Set as Current
                        </button>
                      )}

                      {deleteConfirmId === photo.id ? (
                        <div className="flex flex-1 gap-1">
                          <button
                            type="button"
                            onClick={() => handleDeleteConfirm(photo.id)}
                            className="active-push touch-target flex-1 rounded-[var(--radius-sm)] px-2 py-1.5 text-[11px] font-semibold"
                            style={{
                              background: "var(--destructive)",
                              color: "var(--destructive-foreground)",
                            }}
                          >
                            Confirm
                          </button>
                          <button
                            type="button"
                            onClick={handleDeleteCancel}
                            className="active-push touch-target flex-1 rounded-[var(--radius-sm)] border border-border px-2 py-1.5 text-[11px] font-semibold"
                            style={{
                              background: "var(--card)",
                              color: "var(--foreground)",
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleDeleteRequest(photo.id)}
                          className="active-push touch-target rounded-[var(--radius-sm)] border border-border px-2 py-1.5 text-[11px] font-semibold transition-opacity"
                          style={{
                            background: "var(--card)",
                            color: "var(--destructive)",
                          }}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
