// src/lib/native/camera.ts
//
// ============================================================
// WattleOS - Native Camera Bridge
// ============================================================
// WHY: Observation capture is the platform's "reason for being."
// Guides need to photograph student work in under 5 seconds.
// Native camera gives better performance, direct gallery access,
// and proper image metadata (EXIF) on iPad.
//
// Falls back to <input type="file" capture> on web browsers.
// ============================================================

import {
  Camera,
  CameraResultType,
  CameraSource,
  type Photo,
} from "@capacitor/camera";
import { isNative, isPluginAvailable } from "./platform";

/** Result from capturing a photo - normalized across native/web */
export interface CapturedPhoto {
  /** Base64-encoded image data (without data URI prefix) */
  base64Data: string;
  /** MIME type (e.g. "image/jpeg") */
  mimeType: string;
  /** File extension without dot (e.g. "jpg") */
  extension: string;
  /** Web-usable path for preview (data URI or blob URL) */
  previewUrl: string;
  /** Original file if available (web file input) */
  file: File | null;
}

/** Options for photo capture */
export interface CaptureOptions {
  /** Which camera source to use */
  source?: "camera" | "gallery" | "prompt";
  /** Image quality 0-100 (default 85 - good balance for observation photos) */
  quality?: number;
  /** Max width in pixels (default 1920 - enough for observation detail) */
  maxWidth?: number;
  /** Max height in pixels (default 1920) */
  maxHeight?: number;
  /** Whether to allow editing/cropping (default false - speed matters) */
  allowEditing?: boolean;
}

const SOURCE_MAP: Record<string, CameraSource> = {
  camera: CameraSource.Camera,
  gallery: CameraSource.Photos,
  prompt: CameraSource.Prompt,
};

/**
 * Capture a photo using native camera (Capacitor) or file input (web).
 *
 * Usage in observation form:
 * ```ts
 * const photo = await capturePhoto({ source: "prompt" });
 * if (photo) {
 *   // photo.previewUrl for thumbnail
 *   // photo.base64Data + photo.mimeType for upload
 * }
 * ```
 */
export async function capturePhoto(
  options: CaptureOptions = {},
): Promise<CapturedPhoto | null> {
  const {
    source = "prompt",
    quality = 85,
    maxWidth = 1920,
    maxHeight = 1920,
    allowEditing = false,
  } = options;

  // ── Native path (Capacitor) ──
  if (isNative() && isPluginAvailable("Camera")) {
    try {
      const photo: Photo = await Camera.getPhoto({
        resultType: CameraResultType.Base64,
        source: SOURCE_MAP[source] ?? CameraSource.Prompt,
        quality,
        width: maxWidth,
        height: maxHeight,
        allowEditing,
        saveToGallery: false, // Don't clutter the guide's camera roll
        correctOrientation: true, // Fix EXIF rotation
      });

      if (!photo.base64String) return null;

      const mimeType = `image/${photo.format}`;
      const extension = photo.format;

      return {
        base64Data: photo.base64String,
        mimeType,
        extension,
        previewUrl: `data:${mimeType};base64,${photo.base64String}`,
        file: null, // Native path doesn't produce a File object
      };
    } catch (err) {
      // User cancelled or permission denied
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes("cancelled") || message.includes("canceled")) {
        return null; // User cancelled - not an error
      }
      console.error("[WattleOS] Native camera error:", message);
      return null;
    }
  }

  // ── Web fallback (file input) ──
  return capturePhotoWeb(source === "camera" ? "camera" : "gallery");
}

/**
 * Capture multiple photos from the gallery.
 * WHY: Guides often take multiple photos of the same activity.
 */
export async function captureMultiplePhotos(
  options: Omit<CaptureOptions, "source"> = {},
): Promise<CapturedPhoto[]> {
  const { quality = 85, maxWidth = 1920, maxHeight = 1920 } = options;

  // ── Native path ──
  if (isNative() && isPluginAvailable("Camera")) {
    try {
      const result = await Camera.pickImages({
        quality,
        width: maxWidth,
        height: maxHeight,
        limit: 10, // Max 10 photos at once
      });

      const photos: CapturedPhoto[] = [];

      for (const image of result.photos) {
        if (image.webPath) {
          // Fetch the blob from webPath to get base64
          const response = await fetch(image.webPath);
          const blob = await response.blob();
          const base64 = await blobToBase64(blob);

          photos.push({
            base64Data: base64,
            mimeType: `image/${image.format}`,
            extension: image.format,
            previewUrl: image.webPath,
            file: null,
          });
        }
      }

      return photos;
    } catch {
      return []; // User cancelled
    }
  }

  // ── Web fallback (multi-file input) ──
  return captureMultiplePhotosWeb();
}

// ============================================================
// Web Fallback Helpers
// ============================================================

function capturePhotoWeb(
  mode: "camera" | "gallery",
): Promise<CapturedPhoto | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    if (mode === "camera") {
      input.capture = "environment"; // Rear camera
    }

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }

      const base64 = await fileToBase64(file);
      const extension = file.name.split(".").pop() ?? "jpg";

      resolve({
        base64Data: base64,
        mimeType: file.type || "image/jpeg",
        extension,
        previewUrl: URL.createObjectURL(file),
        file,
      });
    };

    input.oncancel = () => resolve(null);
    input.click();
  });
}

function captureMultiplePhotosWeb(): Promise<CapturedPhoto[]> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.multiple = true;

    input.onchange = async () => {
      const files = Array.from(input.files ?? []);
      if (files.length === 0) {
        resolve([]);
        return;
      }

      const photos: CapturedPhoto[] = [];

      for (const file of files) {
        const base64 = await fileToBase64(file);
        const extension = file.name.split(".").pop() ?? "jpg";

        photos.push({
          base64Data: base64,
          mimeType: file.type || "image/jpeg",
          extension,
          previewUrl: URL.createObjectURL(file),
          file,
        });
      }

      resolve(photos);
    };

    input.oncancel = () => resolve([]);
    input.click();
  });
}

// ============================================================
// Conversion Helpers
// ============================================================

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip the data:...;base64, prefix
      resolve(result.split(",")[1]);
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]);
    };
    reader.onerror = () => reject(new Error("Failed to read blob"));
    reader.readAsDataURL(blob);
  });
}
