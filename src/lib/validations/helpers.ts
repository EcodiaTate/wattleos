// src/lib/validations/helpers.ts
//
// ============================================================
// Zod Validation Helper
// ============================================================
// Bridges Zod's safeParse result into WattleOS's standard
// { data, error } ActionResponse pattern.
//
// USAGE in any action:
//   const parsed = validate(submitInquirySchema, input);
//   if (parsed.error) return parsed.error;
//   const data = parsed.data;
//   // data is fully typed and cleaned
// ============================================================

import { z } from "zod";
import { type ActionResponse, ErrorCodes, failure } from "@/types/api";

/**
 * Formats Zod errors into a single user-friendly string.
 * Returns the first issue's message — keeps error toasts clean.
 */
function formatFirstError(error: z.ZodError): string {
  const first = error.issues[0];
  if (!first) return "Validation failed";
  return first.message;
}

/**
 * Formats ALL Zod errors into a map of { fieldName: message }.
 * Useful for form-level validation where you want to highlight
 * every invalid field at once.
 */
export function formatAllErrors(
  error: z.ZodError,
): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = issue.path.join(".") || "_root";
    if (!errors[path]) {
      errors[path] = issue.message;
    }
  }
  return errors;
}

// ────────────────────────────────────────────────────────────
// The main helper: validate()
// ────────────────────────────────────────────────────────────

type ValidateSuccess<T> = { data: T; error: null };
type ValidateFailure = { data: null; error: ActionResponse<never> };

/**
 * Validate input against a Zod schema.
 * Returns either { data, error: null } or { data: null, error: ActionResponse }.
 *
 * @example
 *   const parsed = validate(submitInquirySchema, input);
 *   if (parsed.error) return parsed.error;  // Return the failure directly
 *   const data = parsed.data;               // Fully typed & cleaned
 */
export function validate<T>(
  schema: z.ZodType<T>,
  input: unknown,
): ValidateSuccess<T> | ValidateFailure {
  const result = schema.safeParse(input);

  if (!result.success) {
    return {
      data: null,
      error: failure(formatFirstError(result.error), ErrorCodes.VALIDATION_ERROR),
    };
  }

  return { data: result.data, error: null };
}