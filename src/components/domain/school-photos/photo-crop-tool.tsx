"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useHaptics } from "@/lib/hooks/use-haptics";
import type { PhotoCropData } from "@/types/domain";

/** Fixed 3:4 aspect ratio (portrait ID card). */
const ASPECT_RATIO = 3 / 4;

interface PhotoCropToolProps {
  imageUrl: string;
  initialCrop?: PhotoCropData;
  onSave: (cropData: PhotoCropData) => void;
  onCancel: () => void;
}

interface ImageDimensions {
  naturalWidth: number;
  naturalHeight: number;
  displayWidth: number;
  displayHeight: number;
}

/**
 * Calculates a default crop region that is centered and as large as possible
 * while maintaining the 3:4 aspect ratio within the image bounds.
 */
function getDefaultCrop(
  imgWidth: number,
  imgHeight: number,
): { x: number; y: number; width: number; height: number } {
  // Try to fill width first
  let cropWidth = imgWidth;
  let cropHeight = cropWidth / ASPECT_RATIO;

  if (cropHeight > imgHeight) {
    // Width-first doesn't fit; fill height instead
    cropHeight = imgHeight;
    cropWidth = cropHeight * ASPECT_RATIO;
  }

  const x = (imgWidth - cropWidth) / 2;
  const y = (imgHeight - cropHeight) / 2;

  return { x, y, width: cropWidth, height: cropHeight };
}

/**
 * Clamps the crop position so it stays within image bounds.
 */
function clampPosition(
  x: number,
  y: number,
  cropWidth: number,
  cropHeight: number,
  imgWidth: number,
  imgHeight: number,
): { x: number; y: number } {
  return {
    x: Math.max(0, Math.min(x, imgWidth - cropWidth)),
    y: Math.max(0, Math.min(y, imgHeight - cropHeight)),
  };
}

export function PhotoCropTool({
  imageUrl,
  initialCrop,
  onSave,
  onCancel,
}: PhotoCropToolProps) {
  const haptics = useHaptics();
  const containerRef = useRef<HTMLDivElement>(null);
  const [imgDim, setImgDim] = useState<ImageDimensions | null>(null);
  const [crop, setCrop] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const [dragging, setDragging] = useState(false);
  const dragStartRef = useRef<{
    pointerX: number;
    pointerY: number;
    cropX: number;
    cropY: number;
  } | null>(null);

  // Load image to get natural dimensions
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      const container = containerRef.current;
      if (!container) return;

      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;

      // Fit image into container while preserving aspect ratio
      const scale = Math.min(
        containerWidth / img.naturalWidth,
        containerHeight / img.naturalHeight,
      );
      const displayWidth = img.naturalWidth * scale;
      const displayHeight = img.naturalHeight * scale;

      const dim: ImageDimensions = {
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
        displayWidth,
        displayHeight,
      };
      setImgDim(dim);

      // Set initial crop in natural-pixel space
      if (initialCrop && initialCrop.width > 0 && initialCrop.height > 0) {
        setCrop({
          x: initialCrop.x,
          y: initialCrop.y,
          width: initialCrop.width,
          height: initialCrop.height,
        });
      } else {
        setCrop(getDefaultCrop(img.naturalWidth, img.naturalHeight));
      }
    };
    img.src = imageUrl;
  }, [imageUrl, initialCrop]);

  // Convert natural-pixel coordinates to display-pixel coordinates
  const toDisplay = useCallback(
    (val: number): number => {
      if (!imgDim) return 0;
      return val * (imgDim.displayWidth / imgDim.naturalWidth);
    },
    [imgDim],
  );

  // Convert display-pixel coordinates to natural-pixel coordinates
  const toNatural = useCallback(
    (val: number): number => {
      if (!imgDim) return 0;
      return val * (imgDim.naturalWidth / imgDim.displayWidth);
    },
    [imgDim],
  );

  const handlePointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (!crop || !imgDim) return;

      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);

      setDragging(true);
      dragStartRef.current = {
        pointerX: e.clientX,
        pointerY: e.clientY,
        cropX: crop.x,
        cropY: crop.y,
      };
    },
    [crop, imgDim],
  );

  const handlePointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (!dragging || !dragStartRef.current || !crop || !imgDim) return;

      e.preventDefault();

      const deltaX = e.clientX - dragStartRef.current.pointerX;
      const deltaY = e.clientY - dragStartRef.current.pointerY;

      // Convert display deltas to natural-pixel deltas
      const naturalDX = toNatural(deltaX);
      const naturalDY = toNatural(deltaY);

      const newPos = clampPosition(
        dragStartRef.current.cropX + naturalDX,
        dragStartRef.current.cropY + naturalDY,
        crop.width,
        crop.height,
        imgDim.naturalWidth,
        imgDim.naturalHeight,
      );

      setCrop((prev) => (prev ? { ...prev, ...newPos } : prev));
    },
    [dragging, crop, imgDim, toNatural],
  );

  const handlePointerUp = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (!dragging) return;
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      setDragging(false);
      dragStartRef.current = null;
    },
    [dragging],
  );

  const handleSave = useCallback(() => {
    if (!crop) return;

    haptics.impact("medium");

    const cropData: PhotoCropData = {
      x: Math.round(crop.x),
      y: Math.round(crop.y),
      width: Math.round(crop.width),
      height: Math.round(crop.height),
      rotation: 0,
    };

    onSave(cropData);
  }, [crop, haptics, onSave]);

  // Compute display-space crop rect for the overlay
  const displayCrop =
    crop && imgDim
      ? {
          x: toDisplay(crop.x),
          y: toDisplay(crop.y),
          width: toDisplay(crop.width),
          height: toDisplay(crop.height),
        }
      : null;

  // Image offset within the container (centered)
  const imgOffset =
    imgDim && containerRef.current
      ? {
          left: (containerRef.current.clientWidth - imgDim.displayWidth) / 2,
          top: (containerRef.current.clientHeight - imgDim.displayHeight) / 2,
        }
      : { left: 0, top: 0 };

  return (
    <div className="flex h-full flex-col">
      {/* Crop area */}
      <div
        ref={containerRef}
        className="relative flex-1 overflow-hidden select-none"
        style={{ background: "var(--muted)", minHeight: 300 }}
      >
        {imgDim !== null && (
          <>
            {/* Image */}
            <img
              src={imageUrl}
              alt="Crop preview"
              draggable={false}
              className="absolute"
              style={{
                left: imgOffset.left,
                top: imgOffset.top,
                width: imgDim.displayWidth,
                height: imgDim.displayHeight,
              }}
            />

            {/* Dark overlay (outside crop) */}
            <div
              className="pointer-events-none absolute"
              style={{
                left: imgOffset.left,
                top: imgOffset.top,
                width: imgDim.displayWidth,
                height: imgDim.displayHeight,
                background: "rgba(0, 0, 0, 0.5)",
              }}
            />

            {/* Crop window (clear area) */}
            {displayCrop !== null && (
              <div
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                className="absolute border-2 border-white"
                style={{
                  left: imgOffset.left + displayCrop.x,
                  top: imgOffset.top + displayCrop.y,
                  width: displayCrop.width,
                  height: displayCrop.height,
                  cursor: dragging ? "grabbing" : "grab",
                  touchAction: "none",
                  // Use clip-path trick: show the actual image inside the crop
                  background: `url(${imageUrl})`,
                  backgroundSize: `${imgDim.displayWidth}px ${imgDim.displayHeight}px`,
                  backgroundPosition: `-${displayCrop.x}px -${displayCrop.y}px`,
                }}
              >
                {/* Grid lines (rule of thirds) */}
                <div
                  className="pointer-events-none absolute inset-0"
                  style={{
                    borderLeft: "none",
                    borderTop: "none",
                  }}
                >
                  {/* Vertical lines */}
                  <div
                    className="absolute top-0 h-full"
                    style={{
                      left: "33.33%",
                      width: 1,
                      background: "rgba(255, 255, 255, 0.4)",
                    }}
                  />
                  <div
                    className="absolute top-0 h-full"
                    style={{
                      left: "66.66%",
                      width: 1,
                      background: "rgba(255, 255, 255, 0.4)",
                    }}
                  />
                  {/* Horizontal lines */}
                  <div
                    className="absolute left-0 w-full"
                    style={{
                      top: "33.33%",
                      height: 1,
                      background: "rgba(255, 255, 255, 0.4)",
                    }}
                  />
                  <div
                    className="absolute left-0 w-full"
                    style={{
                      top: "66.66%",
                      height: 1,
                      background: "rgba(255, 255, 255, 0.4)",
                    }}
                  />
                </div>

                {/* Aspect ratio label */}
                <div
                  className="pointer-events-none absolute bottom-1 right-1 rounded px-1 py-0.5 text-[10px] font-medium text-white"
                  style={{ background: "rgba(0, 0, 0, 0.6)" }}
                >
                  3:4
                </div>
              </div>
            )}
          </>
        )}

        {/* Loading state */}
        {imgDim === null && (
          <div className="flex h-full items-center justify-center">
            <p
              className="text-sm"
              style={{ color: "var(--muted-foreground)" }}
            >
              Loading image...
            </p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div
        className="flex items-center justify-end gap-3 border-t border-border px-4 py-3"
        style={{
          background: "var(--card)",
          paddingBottom: "calc(var(--safe-bottom, 0px) + 12px)",
        }}
      >
        <button
          type="button"
          onClick={onCancel}
          className="active-push touch-target rounded-[var(--radius-md)] border border-border px-4 py-2.5 text-sm font-semibold transition-opacity"
          style={{
            background: "var(--card)",
            color: "var(--foreground)",
          }}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={crop === null}
          className="active-push touch-target rounded-[var(--radius-md)] px-4 py-2.5 text-sm font-semibold transition-opacity disabled:opacity-50"
          style={{
            background: "var(--primary)",
            color: "var(--primary-foreground)",
          }}
        >
          Save Crop
        </button>
      </div>
    </div>
  );
}
