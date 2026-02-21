// src/lib/utils/encryption.ts
//
// ============================================================
// WattleOS V2 - Sensitive Field Encryption
// ============================================================
// WHY: Supabase encrypts data at rest (disk-level), but that
// only protects against physical disk theft. If someone gains
// database access (compromised credentials, SQL injection via
// another app on the same Supabase instance, or a support
// engineer browsing the dashboard), they see plaintext.
//
// Application-level encryption means:
//   - Medical conditions are encrypted BEFORE they reach the DB
//   - Custody restriction details are encrypted
//   - Even a database dump shows ciphertext, not "Jamie has epilepsy"
//   - Only the WattleOS application with the key can decrypt
//
// ALGORITHM: AES-256-GCM (authenticated encryption)
//   - 256-bit key: brute-force resistant
//   - GCM mode: provides both confidentiality AND integrity
//   - Random IV per encryption: same plaintext → different ciphertext
//
// KEY MANAGEMENT:
//   - Key stored in FIELD_ENCRYPTION_KEY environment variable
//   - 32-byte (64 hex character) key
//   - Generate with: openssl rand -hex 32
//   - Rotate by re-encrypting all fields with new key
//
// STORAGE FORMAT:
//   Encrypted values are stored as: "enc:v1:{iv}:{ciphertext}:{authTag}"
//   The "enc:v1:" prefix lets us detect encrypted values and
//   support future algorithm changes (v2, v3, etc.)
//
// SETUP:
//   1. Generate key: openssl rand -hex 32
//   2. Add to .env.local: FIELD_ENCRYPTION_KEY=<64 hex chars>
//   3. Add to Vercel env vars for production
//   4. BACK UP THIS KEY. If you lose it, encrypted data is gone.
// ============================================================

import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

// ============================================================
// Configuration
// ============================================================

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96 bits — recommended for GCM
const AUTH_TAG_LENGTH = 16; // 128 bits
const ENCRYPTED_PREFIX = "enc:v1:";

// ============================================================
// Key Management
// ============================================================

let cachedKey: Buffer | null = null;

function getEncryptionKey(): Buffer | null {
  if (cachedKey) return cachedKey;

  const keyHex = process.env.FIELD_ENCRYPTION_KEY;

  if (!keyHex) {
    console.error(
      "[encryption] FIELD_ENCRYPTION_KEY not set. Sensitive field encryption is disabled. " +
        "Generate a key with: openssl rand -hex 32",
    );
    return null;
  }

  if (keyHex.length !== 64) {
    console.error(
      "[encryption] FIELD_ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes). " +
        `Current length: ${keyHex.length}. Generate with: openssl rand -hex 32`,
    );
    return null;
  }

  cachedKey = Buffer.from(keyHex, "hex");
  return cachedKey;
}

// ============================================================
// Encrypt
// ============================================================

/**
 * Encrypt a plaintext string for storage in the database.
 *
 * Returns the encrypted value as a prefixed string, or the
 * original value if encryption is not configured (graceful degradation).
 *
 * @param plaintext - The sensitive value to encrypt
 * @returns Encrypted string in format "enc:v1:{iv}:{ciphertext}:{authTag}"
 *
 * @example
 * ```ts
 * const encrypted = encryptField("Epilepsy - requires immediate medication");
 * // → "enc:v1:a1b2c3d4e5f6:7890abcdef...:1234567890abcdef"
 *
 * // Store in database:
 * await supabase.from("medical_conditions").insert({
 *   condition_name: encryptField(input.condition_name),
 *   details: encryptField(input.details),
 *   // ... non-sensitive fields stored as plaintext
 * });
 * ```
 */
export function encryptField(plaintext: string): string {
  const key = getEncryptionKey();

  // Graceful degradation: if no key configured, store plaintext
  // WHY: Better to store data unencrypted than to fail entirely.
  // The key should always be set in production.
  if (!key) return plaintext;

  // Empty/null values don't need encryption
  if (!plaintext) return plaintext;

  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag().toString("hex");
  const ivHex = iv.toString("hex");

  return `${ENCRYPTED_PREFIX}${ivHex}:${encrypted}:${authTag}`;
}

// ============================================================
// Decrypt
// ============================================================

/**
 * Decrypt a value from the database.
 *
 * Automatically detects whether the value is encrypted (has prefix)
 * or plaintext (no prefix). This handles the migration case where
 * existing data is unencrypted and new data is encrypted.
 *
 * @param value - The stored value (encrypted or plaintext)
 * @returns Decrypted plaintext string
 *
 * @example
 * ```ts
 * const condition = await supabase
 *   .from("medical_conditions")
 *   .select("condition_name, details")
 *   .single();
 *
 * const name = decryptField(condition.data.condition_name);
 * const details = decryptField(condition.data.details);
 * ```
 */
export function decryptField(value: string): string {
  // Null/empty passthrough
  if (!value) return value;

  // Not encrypted — return as-is (handles legacy unencrypted data)
  if (!value.startsWith(ENCRYPTED_PREFIX)) return value;

  const key = getEncryptionKey();
  if (!key) {
    console.error(
      "[encryption] Cannot decrypt: FIELD_ENCRYPTION_KEY not set. Returning raw value.",
    );
    return value; // Return the encrypted string rather than crashing
  }

  try {
    // Parse: "enc:v1:{iv}:{ciphertext}:{authTag}"
    const withoutPrefix = value.slice(ENCRYPTED_PREFIX.length);
    const parts = withoutPrefix.split(":");

    if (parts.length !== 3) {
      console.error(
        "[encryption] Malformed encrypted value — expected 3 parts after prefix",
      );
      return value;
    }

    const [ivHex, ciphertextHex, authTagHex] = parts;

    const iv = Buffer.from(ivHex, "hex");
    const ciphertext = Buffer.from(ciphertextHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");

    const decipher = createDecipheriv(ALGORITHM, key, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertext);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted.toString("utf8");
  } catch (err) {
    console.error("[encryption] Decryption failed:", err);
    // Return the raw value rather than crashing the page
    // This could mean the key was rotated or the data is corrupted
    return value;
  }
}

// ============================================================
// Batch Helpers
// ============================================================

/**
 * Encrypt multiple fields in an object.
 * Only encrypts the specified keys, leaving others untouched.
 *
 * @example
 * ```ts
 * const encrypted = encryptFields(input, [
 *   "condition_name",
 *   "details",
 *   "treatment_plan",
 * ]);
 * ```
 */
export function encryptFields<T extends Record<string, unknown>>(
  obj: T,
  fieldNames: (keyof T)[],
): T {
  const result = { ...obj };

  for (const field of fieldNames) {
    const value = result[field];
    if (typeof value === "string") {
      (result as Record<string, unknown>)[field as string] =
        encryptField(value);
    }
  }

  return result;
}

/**
 * Decrypt multiple fields in an object.
 * Only decrypts the specified keys, leaving others untouched.
 *
 * @example
 * ```ts
 * const condition = decryptFields(rawDbRow, [
 *   "condition_name",
 *   "details",
 *   "treatment_plan",
 * ]);
 * ```
 */
export function decryptFields<T extends Record<string, unknown>>(
  obj: T,
  fieldNames: (keyof T)[],
): T {
  const result = { ...obj };

  for (const field of fieldNames) {
    const value = result[field];
    if (typeof value === "string") {
      (result as Record<string, unknown>)[field as string] =
        decryptField(value);
    }
  }

  return result;
}

// ============================================================
// Utility: Check if encryption is configured
// ============================================================

/**
 * Check whether field encryption is properly configured.
 * Useful for admin settings pages to show encryption status.
 */
export function isEncryptionConfigured(): boolean {
  return getEncryptionKey() !== null;
}

/**
 * Check if a stored value is encrypted.
 */
export function isEncrypted(value: string): boolean {
  return value.startsWith(ENCRYPTED_PREFIX);
}

// ============================================================
// Constants: Which fields should be encrypted
// ============================================================
// WHY explicit lists: Not all fields need encryption. Student
// names need to be searchable/sortable (can't query encrypted
// columns). Only truly sensitive fields get encrypted.
// ============================================================

export const ENCRYPTED_FIELDS = {
  medical_conditions: [
    "condition_name",
    "details",
    "treatment_plan",
    "medication_details",
    "emergency_instructions",
  ] as const,

  custody_restrictions: [
    "restricted_person_name",
    "court_order_reference",
    "notes",
  ] as const,

  emergency_contacts: ["phone", "relationship"] as const,

  // Government identifiers on student records
  students_sensitive: [
    "crn", // Centrelink Reference Number
    "usi", // Unique Student Identifier
    "medicare_number",
  ] as const,
} as const;
