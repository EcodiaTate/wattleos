// src/lib/validations/dismissal.ts
//
// ============================================================
// Zod Schemas - End-of-Day Dismissal & Pickup Module (Module V)
// ============================================================
// SAFETY-CRITICAL: These schemas gate who is physically allowed
// to take a child off school grounds and whether that handover
// was formally confirmed by a staff member. Validation is strict.
// ============================================================

import { z } from "zod";

// ────────────────────────────────────────────────────────────
// Shared enums
// ────────────────────────────────────────────────────────────

export const dismissalMethods = [
  "parent_pickup",
  "bus",
  "oshc",
  "walker",
  "other",
] as const;

export const daysOfWeek = [
  "default",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
] as const;

export const dismissalStatuses = ["pending", "confirmed", "exception"] as const;

export const exceptionReasons = [
  "not_collected",
  "unknown_person",
  "late_pickup",
  "refused_collection",
  "bus_no_show",
  "other",
] as const;

// ────────────────────────────────────────────────────────────
// Bus Routes
// ────────────────────────────────────────────────────────────

export const createBusRouteSchema = z.object({
  route_name: z
    .string()
    .trim()
    .min(1, "Route name is required")
    .max(200, "Route name is too long"),

  operator_name: z
    .string()
    .trim()
    .max(200)
    .nullish()
    .transform((v) => v || null),

  vehicle_registration: z
    .string()
    .trim()
    .max(20)
    .nullish()
    .transform((v) => v || null),

  driver_name: z
    .string()
    .trim()
    .max(200)
    .nullish()
    .transform((v) => v || null),

  driver_phone: z
    .string()
    .trim()
    .max(30)
    .nullish()
    .transform((v) => v || null),

  depart_time: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Time must be HH:MM")
    .nullish()
    .transform((v) => v || null),

  days_of_operation: z
    .array(
      z.enum([
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
        "sunday",
      ]),
    )
    .min(1, "Select at least one day")
    .default(["monday", "tuesday", "wednesday", "thursday", "friday"]),

  notes: z
    .string()
    .trim()
    .max(2000)
    .nullish()
    .transform((v) => v || null),
});

export type CreateBusRouteInput = z.infer<typeof createBusRouteSchema>;

export const updateBusRouteSchema = createBusRouteSchema.partial().extend({
  is_active: z.boolean().optional(),
});

export type UpdateBusRouteInput = z.infer<typeof updateBusRouteSchema>;

// ────────────────────────────────────────────────────────────
// Pickup Authorizations
// ────────────────────────────────────────────────────────────

export const createPickupAuthorizationSchema = z
  .object({
    student_id: z.string().uuid("Invalid student ID"),

    authorized_name: z
      .string()
      .trim()
      .min(1, "Name is required")
      .max(200, "Name is too long"),

    relationship: z
      .string()
      .trim()
      .max(100)
      .nullish()
      .transform((v) => v || null),

    phone: z
      .string()
      .trim()
      .max(30)
      .nullish()
      .transform((v) => v || null),

    photo_url: z
      .string()
      .url("Invalid photo URL")
      .max(2000)
      .nullish()
      .transform((v) => v || null),

    id_verified: z.boolean().default(false),

    is_permanent: z.boolean().default(true),

    valid_from: z
      .string()
      .date("Please enter a valid date (YYYY-MM-DD)")
      .nullish()
      .transform((v) => v || null),

    valid_until: z
      .string()
      .date("Please enter a valid date (YYYY-MM-DD)")
      .nullish()
      .transform((v) => v || null),

    notes: z
      .string()
      .trim()
      .max(1000)
      .nullish()
      .transform((v) => v || null),
  })
  .refine(
    (d) =>
      !d.valid_from ||
      !d.valid_until ||
      new Date(d.valid_until) >= new Date(d.valid_from),
    {
      message: "Valid until must be on or after valid from",
      path: ["valid_until"],
    },
  );

export type CreatePickupAuthorizationInput = z.infer<
  typeof createPickupAuthorizationSchema
>;

export const updatePickupAuthorizationSchema = z.object({
  authorized_name: z
    .string()
    .trim()
    .min(1, "Name cannot be empty")
    .max(200)
    .optional(),

  relationship: z
    .string()
    .trim()
    .max(100)
    .nullish()
    .transform((v) => v || null),

  phone: z
    .string()
    .trim()
    .max(30)
    .nullish()
    .transform((v) => v || null),

  photo_url: z
    .string()
    .url("Invalid photo URL")
    .max(2000)
    .nullish()
    .transform((v) => v || null),

  id_verified: z.boolean().optional(),

  is_permanent: z.boolean().optional(),

  valid_from: z
    .string()
    .date("Please enter a valid date (YYYY-MM-DD)")
    .nullish()
    .transform((v) => v || null),

  valid_until: z
    .string()
    .date("Please enter a valid date (YYYY-MM-DD)")
    .nullish()
    .transform((v) => v || null),

  notes: z
    .string()
    .trim()
    .max(1000)
    .nullish()
    .transform((v) => v || null),
});

export type UpdatePickupAuthorizationInput = z.infer<
  typeof updatePickupAuthorizationSchema
>;

// ────────────────────────────────────────────────────────────
// Student Dismissal Method Preferences
// ────────────────────────────────────────────────────────────

export const setDismissalMethodSchema = z
  .object({
    student_id: z.string().uuid("Invalid student ID"),

    day_of_week: z.enum(daysOfWeek).default("default"),

    dismissal_method: z.enum(dismissalMethods),

    bus_route_id: z
      .string()
      .uuid("Invalid bus route ID")
      .nullish()
      .transform((v) => v || null),

    notes: z
      .string()
      .trim()
      .max(500)
      .nullish()
      .transform((v) => v || null),
  })
  .refine((d) => d.dismissal_method !== "bus" || d.bus_route_id !== null, {
    message: "A bus route is required when dismissal method is 'bus'",
    path: ["bus_route_id"],
  });

export type SetDismissalMethodInput = z.infer<typeof setDismissalMethodSchema>;

// ────────────────────────────────────────────────────────────
// Daily Dismissal Records
// ────────────────────────────────────────────────────────────

export const confirmDismissalSchema = z.object({
  student_id: z.string().uuid("Invalid student ID"),

  dismissal_date: z.string().date("Invalid date"),

  actual_method: z.enum(dismissalMethods),

  bus_route_id: z
    .string()
    .uuid("Invalid bus route ID")
    .nullish()
    .transform((v) => v || null),

  authorization_id: z
    .string()
    .uuid("Invalid authorization ID")
    .nullish()
    .transform((v) => v || null),

  collected_by_name: z
    .string()
    .trim()
    .max(200)
    .nullish()
    .transform((v) => v || null),

  notes: z
    .string()
    .trim()
    .max(1000)
    .nullish()
    .transform((v) => v || null),
});

export type ConfirmDismissalInput = z.infer<typeof confirmDismissalSchema>;

export const flagExceptionSchema = z.object({
  student_id: z.string().uuid("Invalid student ID"),

  dismissal_date: z.string().date("Invalid date"),

  exception_reason: z.enum(exceptionReasons),

  exception_notes: z
    .string()
    .trim()
    .max(2000)
    .nullish()
    .transform((v) => v || null),
});

export type FlagExceptionInput = z.infer<typeof flagExceptionSchema>;

// ────────────────────────────────────────────────────────────
// Bulk Operations
// ────────────────────────────────────────────────────────────

export const seedDismissalRecordsSchema = z.object({
  dismissal_date: z.string().date("Invalid date"),
  class_id: z
    .string()
    .uuid()
    .nullish()
    .transform((v) => v || null),
});

export type SeedDismissalRecordsInput = z.infer<
  typeof seedDismissalRecordsSchema
>;

// ────────────────────────────────────────────────────────────
// History filter
// ────────────────────────────────────────────────────────────

export const listDismissalHistorySchema = z.object({
  student_id: z.string().uuid().optional(),
  from_date: z.string().date().optional(),
  to_date: z.string().date().optional(),
  status: z.enum(dismissalStatuses).optional(),
  page: z.number().int().min(1).default(1),
  per_page: z.number().int().min(1).max(100).default(50),
});

export type ListDismissalHistoryInput = z.infer<
  typeof listDismissalHistorySchema
>;
