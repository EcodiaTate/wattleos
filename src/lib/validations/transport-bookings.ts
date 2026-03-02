// src/lib/validations/transport-bookings.ts
//
// ============================================================
// Zod Schemas - Excursion Transport Booking Notes
// ============================================================

import { z } from "zod";

const vehicleTypes = [
  "bus",
  "minibus",
  "coach",
  "van",
  "car",
  "ferry",
  "other",
] as const;

const paymentStatuses = [
  "not_applicable",
  "pending",
  "invoiced",
  "paid",
] as const;

// ────────────────────────────────────────────────────────────
// Upsert (create or update) transport booking
// ────────────────────────────────────────────────────────────

export const upsertTransportBookingSchema = z.object({
  excursion_id: z.string().uuid(),

  // Company / operator
  company_name: z
    .string()
    .trim()
    .min(1, "Company name is required")
    .max(200, "Company name is too long"),

  company_phone: z
    .string()
    .trim()
    .max(50)
    .optional()
    .transform((v) => v || null),

  company_email: z
    .string()
    .trim()
    .email("Enter a valid email address")
    .max(200)
    .optional()
    .transform((v) => v || null),

  booking_reference: z
    .string()
    .trim()
    .max(100)
    .optional()
    .transform((v) => v || null),

  // Vehicle
  vehicle_type: z.enum(vehicleTypes, {
    message: "Select a vehicle type",
  }),

  vehicle_registration: z
    .string()
    .trim()
    .max(20)
    .optional()
    .transform((v) => v || null),

  passenger_capacity: z
    .number()
    .int()
    .positive("Capacity must be a positive number")
    .max(500)
    .nullish()
    .transform((v) => v ?? null),

  // Driver
  driver_name: z
    .string()
    .trim()
    .max(200)
    .optional()
    .transform((v) => v || null),

  driver_phone: z
    .string()
    .trim()
    .max(50)
    .optional()
    .transform((v) => v || null),

  driver_licence_number: z
    .string()
    .trim()
    .max(100)
    .optional()
    .transform((v) => v || null),

  // Pickup / drop-off
  pickup_location: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((v) => v || null),

  pickup_time: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Enter a valid time (HH:MM)")
    .optional()
    .transform((v) => v || null),

  dropoff_location: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((v) => v || null),

  dropoff_time: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Enter a valid time (HH:MM)")
    .optional()
    .transform((v) => v || null),

  // Cost
  total_cost_cents: z
    .number()
    .int()
    .nonnegative("Cost cannot be negative")
    .nullish()
    .transform((v) => v ?? null),

  payment_status: z.enum(paymentStatuses).default("not_applicable"),

  invoice_number: z
    .string()
    .trim()
    .max(100)
    .optional()
    .transform((v) => v || null),

  // Notes
  notes: z
    .string()
    .trim()
    .max(3000)
    .optional()
    .transform((v) => v || null),
});

export type UpsertTransportBookingInput = z.infer<
  typeof upsertTransportBookingSchema
>;
