// src/components/domain/observations/media-lightbox.tsx
//
// ============================================================
// WattleOS V2 - Media Lightbox
// ============================================================
// Full-screen image viewer overlay. Supports keyboard navigation
// (← → Escape), click-outside-to-close, and swipe on touch.
//
// WHY: Guides and parents need to view observation photos at
// full size. A lightbox keeps them on the same page rather than
// navigating away to a raw image URL.
// ============================================================

"use client";

import type { ObservationMedia } from "@/types/domain";
import { useCallback, useEffect } from "react";

interface MediaLightboxProps {
  media: ObservationMedia[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

export function MediaLightbox({
  media,
  currentIndex,
  onClose,
  onNavigate,
}: MediaLightboxProps) {
  const current = media[currentIndex];
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < media.length - 1;

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowLeft" && hasPrev) {
        onNavigate(currentIndex - 1);
      } else if (e.key === "ArrowRight" && hasNext) {
        onNavigate(currentIndex + 1);
      }
    },
    [currentIndex, hasPrev, hasNext, onClose, onNavigate],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    // Prevent body scroll while lightbox is open
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [handleKeyDown]);

  if (!current) return null;

  // Use thumbnail_url as the image source (this IS the full image
  // for Supabase Storage - we store the public URL there).
  const imageUrl = current.thumbnail_url;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Image viewer"
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute right-4 top-[var(--density-card-padding)] z-10 flex h-[var(--density-button-height)] w-10 items-center justify-center rounded-full bg-black/50 text-primary-foreground transition-colors hover:bg-black/70"
        aria-label="Close"
      >
        <svg
          className="h-6 w-6"
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

      {/* Counter */}
      {media.length > 1 && (
        <div className="absolute left-4 top-[var(--density-card-padding)] rounded-full bg-black/50 px-3 py-1 text-sm font-medium text-primary-foreground">
          {currentIndex + 1} / {media.length}
        </div>
      )}

      {/* Previous button */}
      {hasPrev && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onNavigate(currentIndex - 1);
          }}
          className="absolute left-4 top-1/2 z-10 flex h-[var(--density-button-height)] w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-primary-foreground transition-colors hover:bg-black/70"
          aria-label="Previous image"
        >
          <svg
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 19.5 8.25 12l7.5-7.5"
            />
          </svg>
        </button>
      )}

      {/* Next button */}
      {hasNext && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onNavigate(currentIndex + 1);
          }}
          className="absolute right-4 top-1/2 z-10 flex h-[var(--density-button-height)] w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-primary-foreground transition-colors hover:bg-black/70"
          aria-label="Next image"
        >
          <svg
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m8.25 4.5 7.5 7.5-7.5 7.5"
            />
          </svg>
        </button>
      )}

      {/* Image */}
      <div
        className="flex max-h-[90vh] max-w-[90vw] items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={current.file_name ?? "Observation photo"}
            className="max-h-[85vh] max-w-[85vw] rounded-lg object-contain shadow-2xl"
          />
        ) : (
          <div className="flex h-64 w-64 items-center justify-center rounded-lg bg-gray-800 text-muted-foreground">
            <div className="text-center">
              <MediaTypeIcon type={current.media_type} />
              <p className="mt-2 text-sm">
                {current.file_name ?? current.media_type}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* File info bar */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-4 py-1.5 text-xs text-primary-foreground/80">
        {current.file_name && <span>{current.file_name}</span>}
        {current.file_size_bytes && (
          <span className="ml-2">
            ({formatFileSize(current.file_size_bytes)})
          </span>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Helpers
// ============================================================

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function MediaTypeIcon({ type }: { type: string }) {
  if (type === "video") {
    return (
      <svg
        className="mx-auto h-[var(--density-button-height)] w-12"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z"
        />
      </svg>
    );
  }
  return (
    <svg
      className="mx-auto h-[var(--density-button-height)] w-12"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5a2.25 2.25 0 0 0 2.25-2.25V5.25a2.25 2.25 0 0 0-2.25-2.25H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z"
      />
    </svg>
  );
}
