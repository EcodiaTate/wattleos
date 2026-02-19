// src/components/domain/observations/media-gallery.tsx
//
// ============================================================
// WattleOS V2 - Media Gallery
// ============================================================
// Reusable media thumbnail grid with lightbox integration.
//
// Two variants:
// - compact: horizontal scroll row, 64px thumbnails (feed cards)
// - full: wrapping grid, 128px thumbnails (detail page)
//
// WHY single component with variants: same data, different
// presentations. Avoids duplicating rendering + lightbox logic.
// ============================================================

"use client";

import type { ObservationMedia } from "@/types/domain";
import { useState } from "react";
import { MediaLightbox } from "./media-lightbox";

interface MediaGalleryProps {
  media: ObservationMedia[];
  /** 'compact' = small horizontal row (feed card), 'full' = larger grid (detail page) */
  variant: "compact" | "full";
}

export function MediaGallery({ media, variant }: MediaGalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Only show images (future: handle video/audio/document differently)
  const imageMedia = media.filter(
    (m) => m.media_type === "image" && m.thumbnail_url,
  );
  const otherMedia = media.filter(
    (m) => m.media_type !== "image" || !m.thumbnail_url,
  );

  if (media.length === 0) return null;

  function openLightbox(index: number) {
    setLightboxIndex(index);
  }

  function closeLightbox() {
    setLightboxIndex(null);
  }

  if (variant === "compact") {
    return (
      <>
        <div className="mt-3 flex gap-2 overflow-x-auto">
          {imageMedia.map((m, i) => (
            <button
              key={m.id}
              onClick={() => openLightbox(i)}
              className="flex-shrink-0 overflow-hidden rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
            >
              <img
                src={m.thumbnail_url!}
                alt=""
                className="h-16 w-16 object-cover transition-transform hover:scale-105"
              />
            </button>
          ))}
          {/* Non-image media icons */}
          {otherMedia.map((m) => (
            <div
              key={m.id}
              className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100"
            >
              <MediaIcon type={m.media_type} />
            </div>
          ))}
          {/* Overflow indicator */}
          {imageMedia.length > 4 && (
            <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100 text-xs font-medium text-gray-500">
              +{imageMedia.length - 4}
            </div>
          )}
        </div>

        {lightboxIndex !== null && (
          <MediaLightbox
            media={imageMedia}
            currentIndex={lightboxIndex}
            onClose={closeLightbox}
            onNavigate={setLightboxIndex}
          />
        )}
      </>
    );
  }

  // variant === 'full'
  return (
    <>
      <div className="mt-4">
        <div className="flex flex-wrap gap-3">
          {imageMedia.map((m, i) => (
            <button
              key={m.id}
              onClick={() => openLightbox(i)}
              className="group overflow-hidden rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <img
                src={m.thumbnail_url!}
                alt={m.file_name ?? "Observation photo"}
                className="h-32 w-32 object-cover transition-all group-hover:scale-105 group-hover:brightness-95 sm:h-40 sm:w-40"
              />
            </button>
          ))}
          {/* Non-image media */}
          {otherMedia.map((m) => (
            <div
              key={m.id}
              className="flex h-32 w-32 items-center justify-center rounded-lg bg-gray-100 sm:h-40 sm:w-40"
            >
              <div className="text-center">
                <MediaIcon type={m.media_type} />
                <p className="mt-1 text-xs text-gray-500">
                  {m.file_name ?? m.media_type}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {lightboxIndex !== null && (
        <MediaLightbox
          media={imageMedia}
          currentIndex={lightboxIndex}
          onClose={closeLightbox}
          onNavigate={setLightboxIndex}
        />
      )}
    </>
  );
}

// ============================================================
// Sub-components
// ============================================================

function MediaIcon({ type }: { type: string }) {
  if (type === "image") {
    return (
      <svg
        className="h-6 w-6 text-gray-400"
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
  if (type === "video") {
    return (
      <svg
        className="h-6 w-6 text-gray-400"
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
  if (type === "audio") {
    return (
      <svg
        className="h-6 w-6 text-gray-400"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z"
        />
      </svg>
    );
  }
  // document fallback
  return (
    <svg
      className="h-6 w-6 text-gray-400"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
      />
    </svg>
  );
}
