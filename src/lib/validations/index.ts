// src/lib/validations/index.ts
//
// Barrel export. Import from '@/lib/validations' in actions.

export { validate, formatAllErrors } from "./helpers";

// ── Tier 1: Public endpoints (no auth) ──────────────────
export {
  submitInquirySchema,
  bookTourSchema,
  type SubmitInquiryInput,
  type BookTourInput,
} from "./admissions";

export {
  submitEnrollmentApplicationSchema,
  acceptInvitationSchema,
  type SubmitEnrollmentApplicationInput,
  type AcceptInvitationInput,
} from "./enrollment";

// ── Tier 2: Safety-critical (authenticated) ─────────────
export {
  createCustodyRestrictionSchema,
  updateCustodyRestrictionSchema,
  type CreateCustodyRestrictionInput,
  type UpdateCustodyRestrictionInput,
} from "./custody";

export {
  createMedicalConditionSchema,
  updateMedicalConditionSchema,
  type CreateMedicalConditionInput,
  type UpdateMedicalConditionInput,
} from "./medical";

export {
  createFeeScheduleSchema,
  createInvoiceSchema,
  type CreateFeeScheduleInput,
  type CreateInvoiceInput,
} from "./billing";

export {
  createPickupAuthorizationSchema,
  updatePickupAuthorizationSchema,
  type CreatePickupAuthorizationInput,
  type UpdatePickupAuthorizationInput,
} from "./pickup";