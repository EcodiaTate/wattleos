// src/lib/utils/file-validation.ts
//
// ============================================================
// WattleOS V2 - File Upload Validation
// ============================================================
// WHY: Browsers set Content-Type based on file extension, not
// actual content. An attacker could rename "malware.exe" to
// "photo.jpg" and the browser would send it as image/jpeg.
//
// This utility checks MAGIC BYTES (the first few bytes of the
// file that identify its true type) plus file size limits.
// Used server-side before storing anything in Supabase Storage.
//
// USAGE:
//   const result = validateUpload(fileBuffer, fileName, "observation_media");
//   if (!result.valid) return failure(result.error, ErrorCodes.VALIDATION_ERROR);
//
// WHY server-side: Client-side validation is a UX convenience,
// not a security measure. A malicious actor bypasses the browser
// entirely. Server-side validation is the real gate.
// ============================================================

// ============================================================
// Upload Profiles
// ============================================================
// WHY profiles: Different upload contexts have different
// requirements. Observation photos need images/videos.
// Data imports need CSVs. Court order documents need PDFs.
// ============================================================

export type UploadProfile =
  | "observation_media" // Photos & videos from classroom observations
  | "student_photo" // Profile photos (image only, smaller size)
  | "document" // Court orders, medical docs, consent forms
  | "data_import" // CSV/Excel imports
  | "school_logo"; // Tenant branding (image only, small)

interface ProfileConfig {
  /** Maximum file size in bytes */
  maxSizeBytes: number;
  /** Allowed MIME types (validated against magic bytes, not Content-Type header) */
  allowedTypes: FileTypeCheck[];
  /** Human-readable description for error messages */
  description: string;
}

interface FileTypeCheck {
  mime: string;
  label: string;
  /** Magic byte signatures — file must start with one of these */
  signatures: readonly Uint8Array[];
  extensions: string[];
}

// ============================================================
// Magic Byte Signatures
// ============================================================
// These are the first N bytes of each file format. They are
// immutable and cannot be faked without breaking the file.
// Source: https://en.wikipedia.org/wiki/List_of_file_signatures
// ============================================================

const SIGNATURES = {
  // JPEG: starts with FF D8 FF
  JPEG: [new Uint8Array([0xff, 0xd8, 0xff])],

  // PNG: starts with 89 50 4E 47 0D 0A 1A 0A
  PNG: [new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])],

  // GIF: starts with "GIF87a" or "GIF89a"
  GIF: [
    new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x37, 0x61]),
    new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]),
  ],

  // WebP: starts with "RIFF" + 4 bytes + "WEBP"
  // We check "RIFF" prefix and "WEBP" at offset 8
  WEBP_RIFF: [new Uint8Array([0x52, 0x49, 0x46, 0x46])],

  // HEIC/HEIF: starts with ftyp at offset 4
  // We check for "ftyp" at bytes 4-7
  HEIC: [
    new Uint8Array([0x66, 0x74, 0x79, 0x70]), // "ftyp" - checked at offset 4
  ],

  // PDF: starts with %PDF
  PDF: [new Uint8Array([0x25, 0x50, 0x44, 0x46])],

  // MP4/MOV: "ftyp" at offset 4 (same container as HEIC but different ftyp brands)
  MP4: [new Uint8Array([0x66, 0x74, 0x79, 0x70])], // Checked at offset 4

  // CSV/TXT: No magic bytes — validated by extension + content check
  // Excel XLSX: PK (zip) signature
  ZIP: [new Uint8Array([0x50, 0x4b, 0x03, 0x04])],

  // SVG: starts with "<?xml" or "<svg" (text-based)
  SVG_XML: [new Uint8Array([0x3c, 0x3f, 0x78, 0x6d, 0x6c])], // <?xml
  SVG_TAG: [new Uint8Array([0x3c, 0x73, 0x76, 0x67])], // <svg
} as const;

// ============================================================
// File Type Definitions
// ============================================================

const FILE_TYPES: Record<string, FileTypeCheck> = {
  jpeg: {
    mime: "image/jpeg",
    label: "JPEG image",
    signatures: SIGNATURES.JPEG,
    extensions: [".jpg", ".jpeg"],
  },
  png: {
    mime: "image/png",
    label: "PNG image",
    signatures: SIGNATURES.PNG,
    extensions: [".png"],
  },
  gif: {
    mime: "image/gif",
    label: "GIF image",
    signatures: SIGNATURES.GIF,
    extensions: [".gif"],
  },
  webp: {
    mime: "image/webp",
    label: "WebP image",
    signatures: SIGNATURES.WEBP_RIFF, // Additional WEBP check at offset 8
    extensions: [".webp"],
  },
  heic: {
    mime: "image/heic",
    label: "HEIC image",
    signatures: SIGNATURES.HEIC, // Checked at offset 4
    extensions: [".heic", ".heif"],
  },
  pdf: {
    mime: "application/pdf",
    label: "PDF document",
    signatures: SIGNATURES.PDF,
    extensions: [".pdf"],
  },
  mp4: {
    mime: "video/mp4",
    label: "MP4 video",
    signatures: SIGNATURES.MP4, // Checked at offset 4
    extensions: [".mp4", ".m4v"],
  },
  mov: {
    mime: "video/quicktime",
    label: "QuickTime video",
    signatures: SIGNATURES.MP4, // Same container format
    extensions: [".mov"],
  },
  csv: {
    mime: "text/csv",
    label: "CSV file",
    signatures: [], // Text-based — no magic bytes, validated by content
    extensions: [".csv"],
  },
  xlsx: {
    mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    label: "Excel spreadsheet",
    signatures: SIGNATURES.ZIP, // XLSX is a ZIP container
    extensions: [".xlsx"],
  },
};

// ============================================================
// Profile Configurations
// ============================================================

const PROFILE_CONFIGS: Record<UploadProfile, ProfileConfig> = {
  observation_media: {
    maxSizeBytes: 50 * 1024 * 1024, // 50MB (videos can be large)
    allowedTypes: [
      FILE_TYPES.jpeg,
      FILE_TYPES.png,
      FILE_TYPES.gif,
      FILE_TYPES.webp,
      FILE_TYPES.heic,
      FILE_TYPES.mp4,
      FILE_TYPES.mov,
    ],
    description: "Photos and videos (JPEG, PNG, GIF, WebP, HEIC, MP4, MOV)",
  },

  student_photo: {
    maxSizeBytes: 10 * 1024 * 1024, // 10MB
    allowedTypes: [
      FILE_TYPES.jpeg,
      FILE_TYPES.png,
      FILE_TYPES.webp,
      FILE_TYPES.heic,
    ],
    description: "Profile photo (JPEG, PNG, WebP, HEIC)",
  },

  document: {
    maxSizeBytes: 20 * 1024 * 1024, // 20MB
    allowedTypes: [FILE_TYPES.pdf, FILE_TYPES.jpeg, FILE_TYPES.png],
    description: "Documents (PDF, JPEG, PNG)",
  },

  data_import: {
    maxSizeBytes: 10 * 1024 * 1024, // 10MB
    allowedTypes: [FILE_TYPES.csv, FILE_TYPES.xlsx],
    description: "Spreadsheets (CSV, XLSX)",
  },

  school_logo: {
    maxSizeBytes: 2 * 1024 * 1024, // 2MB
    allowedTypes: [FILE_TYPES.jpeg, FILE_TYPES.png, FILE_TYPES.webp],
    description: "Logo image (JPEG, PNG, WebP), max 2MB",
  },
};

// ============================================================
// Validation Result
// ============================================================

export interface ValidationResult {
  valid: boolean;
  error: string | null;
  /** The detected MIME type based on magic bytes */
  detectedType: string | null;
}

// ============================================================
// Core Validation Function
// ============================================================

/**
 * Validate a file upload against a profile's requirements.
 *
 * @param buffer - The file contents as a Buffer or Uint8Array
 * @param fileName - Original file name (used for extension-based fallback on text files)
 * @param profile - The upload profile to validate against
 *
 * @returns ValidationResult with detected type or error message
 *
 * @example
 * ```ts
 * // In a Server Action:
 * const buffer = Buffer.from(await file.arrayBuffer());
 * const result = validateUpload(buffer, file.name, "observation_media");
 *
 * if (!result.valid) {
 *   return failure(result.error!, ErrorCodes.VALIDATION_ERROR);
 * }
 * ```
 */
export function validateUpload(
  buffer: Buffer | Uint8Array,
  fileName: string,
  profile: UploadProfile,
): ValidationResult {
  const config = PROFILE_CONFIGS[profile];

  // 1. Check file size
  if (buffer.length === 0) {
    return { valid: false, error: "File is empty.", detectedType: null };
  }

  if (buffer.length > config.maxSizeBytes) {
    const maxMB = Math.round(config.maxSizeBytes / (1024 * 1024));
    const actualMB = (buffer.length / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `File is too large (${actualMB}MB). Maximum size is ${maxMB}MB.`,
      detectedType: null,
    };
  }

  // 2. Check magic bytes against allowed types
  for (const typeCheck of config.allowedTypes) {
    if (typeCheck.signatures.length === 0) {
      // Text-based format (CSV) — validate by extension
      const ext = getExtension(fileName);
      if (typeCheck.extensions.includes(ext)) {
        // Additional CSV sanity check: first bytes should be printable ASCII
        if (typeCheck.mime === "text/csv" && isLikelyTextFile(buffer)) {
          return { valid: true, error: null, detectedType: typeCheck.mime };
        }
      }
      continue;
    }

    if (matchesMagicBytes(buffer, typeCheck)) {
      return { valid: true, error: null, detectedType: typeCheck.mime };
    }
  }

  // 3. No match found
  const allowedStr = config.allowedTypes.map((t) => t.label).join(", ");
  return {
    valid: false,
    error: `File type not allowed. Accepted formats: ${allowedStr}.`,
    detectedType: null,
  };
}

/**
 * Get the profile configuration (for client-side UI hints).
 */
export function getUploadProfileConfig(profile: UploadProfile): {
  maxSizeBytes: number;
  description: string;
  acceptString: string;
} {
  const config = PROFILE_CONFIGS[profile];
  const acceptString = config.allowedTypes
    .flatMap((t) => t.extensions)
    .join(",");

  return {
    maxSizeBytes: config.maxSizeBytes,
    description: config.description,
    acceptString,
  };
}

// ============================================================
// Internal Helpers
// ============================================================

function matchesMagicBytes(
  buffer: Buffer | Uint8Array,
  typeCheck: FileTypeCheck,
): boolean {
  // Special handling for formats with offset signatures
  if (
    typeCheck.mime === "image/heic" ||
    typeCheck.mime === "video/mp4" ||
    typeCheck.mime === "video/quicktime"
  ) {
    return matchesAtOffset(buffer, typeCheck.signatures, 4);
  }

  if (typeCheck.mime === "image/webp") {
    // Must start with RIFF and have WEBP at offset 8
    const hasRiff = matchesAtOffset(buffer, SIGNATURES.WEBP_RIFF, 0);
    if (!hasRiff || buffer.length < 12) return false;
    // Check "WEBP" at bytes 8-11
    return (
      buffer[8] === 0x57 && // W
      buffer[9] === 0x45 && // E
      buffer[10] === 0x42 && // B
      buffer[11] === 0x50 // P
    );
  }

  // Standard: check signatures at offset 0
  return matchesAtOffset(buffer, typeCheck.signatures, 0);
}

function matchesAtOffset(
  buffer: Buffer | Uint8Array,
  signatures: readonly Uint8Array[],
  offset: number,
): boolean {
  for (const sig of signatures) {
    if (buffer.length < offset + sig.length) continue;

    let match = true;
    for (let i = 0; i < sig.length; i++) {
      if (buffer[offset + i] !== sig[i]) {
        match = false;
        break;
      }
    }
    if (match) return true;
  }
  return false;
}

function getExtension(fileName: string): string {
  const lastDot = fileName.lastIndexOf(".");
  if (lastDot === -1) return "";
  return fileName.slice(lastDot).toLowerCase();
}

function isLikelyTextFile(buffer: Buffer | Uint8Array): boolean {
  // Check first 512 bytes — should be printable ASCII/UTF-8
  const checkLength = Math.min(buffer.length, 512);
  for (let i = 0; i < checkLength; i++) {
    const byte = buffer[i];
    // Allow printable ASCII (32-126), tab (9), newline (10), carriage return (13)
    // Also allow bytes >= 128 for UTF-8 multi-byte sequences
    if (byte < 9 || (byte > 13 && byte < 32 && byte !== 27)) {
      // Found a non-text byte — likely binary
      return false;
    }
  }
  return true;
}

// ============================================================
// Sanitize filename (strip path traversal, non-ASCII)
// ============================================================
// WHY: Uploaded filenames can contain "../" path traversal
// or special characters that break storage paths.
// ============================================================

export function sanitizeFileName(fileName: string): string {
  return (
    fileName
      // Remove path components
      .replace(/^.*[\\/]/, "")
      // Remove non-ASCII and control characters
      .replace(/[^\x20-\x7E]/g, "")
      // Replace spaces with underscores
      .replace(/\s+/g, "_")
      // Remove dangerous characters
      .replace(/[<>:"/\\|?*]/g, "")
      // Trim dots from start (hidden files)
      .replace(/^\.+/, "")
      // Limit length
      .slice(0, 200) ||
    // Fallback if everything was stripped
    `upload_${Date.now()}`
  );
}
