// src/lib/utils/image-compression.ts
//
// ============================================================
// WattleOS V2 — Client-Side Image Compression
// ============================================================
// Uses canvas to resize and compress images before upload.
// No external dependencies — runs in the browser only.
//
// WHY: Phone cameras produce 5–15MB photos. Supabase free-tier
// storage is limited, and uploading large files on school Wi-Fi
// is painful. We compress to ≤2MB (configurable) before upload.
// ============================================================

interface CompressOptions {
  /** Maximum width or height in pixels. Default: 1920. */
  maxDimension?: number;
  /** Target file size in bytes. Default: 2MB (2_097_152). */
  maxSizeBytes?: number;
  /** Initial JPEG quality (0–1). Default: 0.85. */
  initialQuality?: number;
  /** Minimum JPEG quality before giving up. Default: 0.4. */
  minQuality?: number;
  /** Output MIME type. Default: 'image/jpeg'. */
  outputType?: 'image/jpeg' | 'image/webp';
}

const DEFAULT_OPTIONS: Required<CompressOptions> = {
  maxDimension: 1920,
  maxSizeBytes: 2_097_152, // 2MB
  initialQuality: 0.85,
  minQuality: 0.4,
  outputType: 'image/jpeg',
};

/**
 * Compress an image File using canvas.
 *
 * Strategy:
 * 1. If the file is already under maxSizeBytes AND under maxDimension, return as-is.
 * 2. Draw to canvas at maxDimension, export at initialQuality.
 * 3. If still over maxSizeBytes, iteratively lower quality until minQuality.
 * 4. Return the compressed File (preserving original filename).
 */
export async function compressImage(
  file: File,
  options?: CompressOptions
): Promise<File> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Skip non-image files
  if (!file.type.startsWith('image/')) {
    return file;
  }

  // Skip if already small enough (quick check before decoding)
  if (file.size <= opts.maxSizeBytes) {
    // Still might need to resize, so check dimensions
    const needsResize = await imageDimensionsExceed(file, opts.maxDimension);
    if (!needsResize) {
      return file;
    }
  }

  // Load image into an HTMLImageElement
  const img = await loadImage(file);

  // Calculate target dimensions (maintain aspect ratio)
  const { width, height } = calculateDimensions(
    img.naturalWidth,
    img.naturalHeight,
    opts.maxDimension
  );

  // Draw to canvas
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    // Canvas not available (SSR safety) — return original
    return file;
  }
  ctx.drawImage(img, 0, 0, width, height);

  // Export at decreasing quality until under target size
  let quality = opts.initialQuality;
  let blob = await canvasToBlob(canvas, opts.outputType, quality);

  while (blob.size > opts.maxSizeBytes && quality > opts.minQuality) {
    quality -= 0.05;
    blob = await canvasToBlob(canvas, opts.outputType, quality);
  }

  // Build a new File with the original name (but correct extension)
  const ext = opts.outputType === 'image/webp' ? '.webp' : '.jpg';
  const nameBase = file.name.replace(/\.[^.]+$/, '');
  const compressedFile = new File([blob], `${nameBase}${ext}`, {
    type: opts.outputType,
    lastModified: Date.now(),
  });

  return compressedFile;
}

// ============================================================
// Internal helpers
// ============================================================

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error(`Failed to load image: ${file.name}`));
    };
    img.src = URL.createObjectURL(file);
  });
}

function calculateDimensions(
  origWidth: number,
  origHeight: number,
  maxDimension: number
): { width: number; height: number } {
  if (origWidth <= maxDimension && origHeight <= maxDimension) {
    return { width: origWidth, height: origHeight };
  }

  const ratio = Math.min(maxDimension / origWidth, maxDimension / origHeight);
  return {
    width: Math.round(origWidth * ratio),
    height: Math.round(origHeight * ratio),
  };
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Canvas toBlob returned null'));
        }
      },
      type,
      quality
    );
  });
}

async function imageDimensionsExceed(
  file: File,
  maxDimension: number
): Promise<boolean> {
  try {
    const img = await loadImage(file);
    return img.naturalWidth > maxDimension || img.naturalHeight > maxDimension;
  } catch {
    return false;
  }
}