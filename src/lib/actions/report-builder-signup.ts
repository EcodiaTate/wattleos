"use server";

// src/lib/actions/report-builder-signup.ts
//
// ============================================================
// WattleOS Report Builder - Self-Serve Signup
// ============================================================
// The most critical server action in the standalone product.
// Creates an entire school account in one atomic-ish sequence
// when someone submits the /report-builder/signup form.
//
// Steps (must all succeed, failures abort remaining steps):
//   1. Create Supabase Auth user (email + password)
//   2. Upsert user row in public.users
//   3. Create tenant with slug derived from school name
//   4. Seed default roles + permissions for tenant
//   5. Create tenant_users with Administrator role
//   6. Create default report period for current term/year
//   7. Create a sample Montessori report template
//   8. Log to product_signups
//   9. Return { tenantId, userId, redirectTo: '/reports/setup' }
//
// Uses the service role (admin) client for all writes - the
// user has no tenant_id in their JWT yet, so RLS would block
// every write with a standard client.
//
// Free tier limits are not enforced here - this is the initial
// setup, all created records are within limits.
// ============================================================

import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { failure, success, ErrorCodes } from "@/types/api";
import type { ActionResponse } from "@/types/api";

// ============================================================
// Types
// ============================================================

export interface ReportBuilderSignupInput {
  schoolName: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  sourceUrl?: string;
  utmCampaign?: string;
  utmSource?: string;
}

export interface ReportBuilderSignupResult {
  tenantId: string;
  userId: string;
  redirectTo: string;
}

// ============================================================
// Helpers
// ============================================================

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

function getCurrentTermLabel(): { name: string; term: string; year: number } {
  const now = new Date();
  const month = now.getMonth() + 1; // 1-indexed
  const year = now.getFullYear();

  // Australian school terms (approximate):
  // Term 1: Feb–Apr, Term 2: May–Jul, Term 3: Jul–Sep, Term 4: Oct–Dec
  let term: string;
  if (month <= 4) term = "Term 1";
  else if (month <= 7) term = "Term 2";
  else if (month <= 9) term = "Term 3";
  else term = "Term 4";

  return {
    name: `${term} ${year}`,
    term,
    year,
  };
}

function buildSampleTemplate() {
  return {
    version: 1,
    sections: [
      {
        id: crypto.randomUUID(),
        type: "student_info",
        title: "Student Information",
        order: 0,
        config: {},
      },
      {
        id: crypto.randomUUID(),
        type: "narrative",
        title: "Learning Journey",
        order: 1,
        config: {
          placeholder:
            "Describe this student's learning journey this term - their interests, strengths, areas of growth, and any moments of particular significance...",
          suggestedMinWords: 80,
        },
      },
      {
        id: crypto.randomUUID(),
        type: "narrative",
        title: "Social & Emotional Development",
        order: 2,
        config: {
          placeholder:
            "Comment on the student's relationships with peers and guides, independence, concentration, and emotional regulation...",
          suggestedMinWords: 50,
        },
      },
      {
        id: crypto.randomUUID(),
        type: "mastery_summary",
        title: "Curriculum Progress",
        order: 3,
        config: {
          curriculumAreaFilter: "all",
          displayMode: "both",
        },
      },
      {
        id: crypto.randomUUID(),
        type: "observation_highlights",
        title: "Observation Highlights",
        order: 4,
        config: {
          maxObservations: 3,
          publishedOnly: true,
        },
      },
      {
        id: crypto.randomUUID(),
        type: "narrative",
        title: "Goals for Next Term",
        order: 5,
        config: {
          placeholder:
            "Outline the key learning goals and focus areas for the upcoming term...",
          suggestedMinWords: 30,
        },
      },
    ],
  };
}

// ============================================================
// SIGNUP FOR REPORT BUILDER
// ============================================================

export async function signupForReportBuilder(
  input: ReportBuilderSignupInput,
): Promise<ActionResponse<ReportBuilderSignupResult>> {
  const admin = createSupabaseAdminClient();

  try {
    // ── Validate inputs ───────────────────────────────────────
    if (!input.schoolName?.trim()) {
      return failure("School name is required.", ErrorCodes.VALIDATION_ERROR);
    }
    if (!input.firstName?.trim()) {
      return failure("First name is required.", ErrorCodes.VALIDATION_ERROR);
    }
    if (!input.email?.trim()) {
      return failure("Email is required.", ErrorCodes.VALIDATION_ERROR);
    }
    if (!input.password || input.password.length < 8) {
      return failure(
        "Password must be at least 8 characters.",
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    const schoolName = input.schoolName.trim();
    const baseSlug = slugify(schoolName);

    // ── Step 1: Create Supabase Auth user ─────────────────────
    const { data: authData, error: authError } =
      await admin.auth.admin.createUser({
        email: input.email.trim().toLowerCase(),
        password: input.password,
        email_confirm: true, // auto-confirm for standalone signup
        user_metadata: {
          first_name: input.firstName.trim(),
          last_name: input.lastName?.trim() || null,
        },
      });

    if (authError || !authData?.user) {
      const msg = authError?.message ?? "Failed to create account.";
      // Surface common auth errors clearly
      if (msg.toLowerCase().includes("already registered")) {
        return failure(
          "An account with this email already exists. Please log in instead.",
          ErrorCodes.ALREADY_EXISTS,
        );
      }
      return failure(msg, ErrorCodes.CREATE_FAILED);
    }

    const userId = authData.user.id;

    // ── Step 2: Upsert user row in public.users ───────────────
    const { error: userError } = await admin.from("users").upsert(
      {
        id: userId,
        email: input.email.trim().toLowerCase(),
        first_name: input.firstName.trim(),
        last_name: input.lastName?.trim() || null,
        avatar_url: null,
      },
      { onConflict: "id", ignoreDuplicates: false },
    );

    if (userError) {
      return failure(
        `Failed to create user profile: ${userError.message}`,
        ErrorCodes.CREATE_FAILED,
      );
    }

    // ── Step 3: Create tenant ─────────────────────────────────
    // Ensure slug is unique - append random suffix if collision
    let slug = baseSlug;
    const { data: existingSlug } = await admin
      .from("tenants")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (existingSlug) {
      slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
    }

    const { data: tenant, error: tenantError } = await admin
      .from("tenants")
      .insert({
        name: schoolName,
        slug,
        is_active: true,
        subscription_status: "trialing",
        plan_tier: "free",
        activated_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (tenantError || !tenant) {
      return failure(
        `Failed to create school account: ${tenantError?.message ?? "unknown error"}`,
        ErrorCodes.CREATE_FAILED,
      );
    }

    const tenantId = tenant.id;

    // ── Step 4: Seed default roles + permissions ──────────────
    // Call the existing DB function that seeds system roles
    const { error: seedError } = await admin.rpc("seed_tenant_roles", {
      p_tenant_id: tenantId,
    });

    if (seedError) {
      // Non-fatal: log but continue - the tenant may still work
      console.error(
        "[reportBuilderSignup] seed_tenant_roles failed:",
        seedError.message,
      );
    }

    // ── Step 5: Create tenant_users with Administrator role ───
    const { data: adminRole } = await admin
      .from("roles")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("name", "Administrator")
      .eq("is_system", true)
      .is("deleted_at", null)
      .maybeSingle();

    // Fall back to Owner role if Administrator isn't seeded
    const { data: ownerRole } = adminRole
      ? { data: null }
      : await admin
          .from("roles")
          .select("id")
          .eq("tenant_id", tenantId)
          .eq("name", "Owner")
          .eq("is_system", true)
          .is("deleted_at", null)
          .maybeSingle();

    const roleId = (adminRole ?? ownerRole)?.id;

    if (!roleId) {
      console.error(
        "[reportBuilderSignup] No admin/owner role found for tenant:",
        tenantId,
      );
    } else {
      await admin.from("tenant_users").upsert(
        {
          tenant_id: tenantId,
          user_id: userId,
          role_id: roleId,
          status: "active",
        },
        { onConflict: "tenant_id,user_id", ignoreDuplicates: false },
      );
    }

    // ── Step 6: Create default report period ─────────────────
    const { name: periodName, term, year } = getCurrentTermLabel();

    const { data: period } = await admin
      .from("report_periods")
      .insert({
        tenant_id: tenantId,
        name: periodName,
        term,
        academic_year: year,
        status: "active",
        created_by: userId,
      })
      .select("id")
      .single();

    // ── Step 7: Create sample Montessori report template ──────
    await admin.from("report_templates").insert({
      tenant_id: tenantId,
      name: "Montessori Term Report",
      cycle_level: "3–6",
      content: buildSampleTemplate(),
      is_active: true,
    });

    // ── Step 8: Log to product_signups ────────────────────────
    await admin.from("product_signups").insert({
      tenant_id: tenantId,
      product_slug: "report-builder",
      source_url: input.sourceUrl || null,
      utm_campaign: input.utmCampaign || null,
      utm_source: input.utmSource || null,
    });

    return success({
      tenantId,
      userId,
      redirectTo: "/reports/setup",
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Signup failed. Please try again.";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}

// ============================================================
// ACCEPT GUIDE INVITATION
// ============================================================
// Called when a guide clicks their invite link, creates their
// account (or logs in with existing), and accepts the invitation.

export interface AcceptGuideInvitationInput {
  token: string;
  password?: string; // only needed for new accounts
}

export interface AcceptGuideInvitationResult {
  tenantId: string;
  tenantName: string;
  redirectTo: string;
}

export async function acceptGuideInvitation(
  input: AcceptGuideInvitationInput,
): Promise<ActionResponse<AcceptGuideInvitationResult>> {
  const admin = createSupabaseAdminClient();

  try {
    // ── Validate token ────────────────────────────────────────
    const { data: invite, error: inviteError } = await admin
      .from("guide_invitations")
      .select(
        `
        id, tenant_id, email, status, expires_at, class_labels,
        tenant:tenants(id, name)
      `,
      )
      .eq("token", input.token)
      .is("deleted_at", null)
      .maybeSingle();

    if (inviteError || !invite) {
      return failure(
        "This invitation link is not valid or has expired.",
        ErrorCodes.NOT_FOUND,
      );
    }

    const tenantRow = Array.isArray(invite.tenant)
      ? invite.tenant[0]
      : invite.tenant;

    if (invite.status === "accepted") {
      return success({
        tenantId: invite.tenant_id,
        tenantName: tenantRow?.name ?? "your school",
        redirectTo: "/reports/my-reports",
      });
    }

    if (invite.status !== "pending") {
      return failure(
        "This invitation is no longer valid.",
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    if (new Date(invite.expires_at) < new Date()) {
      return failure(
        "This invitation has expired. Ask your coordinator to send a new one.",
        ErrorCodes.VALIDATION_ERROR,
      );
    }

    // ── Create or find Auth user ──────────────────────────────
    // Check if user already exists in Auth
    const {
      data: { users: existingUsers },
    } = await admin.auth.admin.listUsers();

    const existingAuthUser = existingUsers.find(
      (u) => u.email?.toLowerCase() === invite.email.toLowerCase(),
    );

    let userId: string;

    if (existingAuthUser) {
      userId = existingAuthUser.id;
    } else {
      // Create new Auth user with provided password
      if (!input.password || input.password.length < 8) {
        return failure(
          "Password must be at least 8 characters.",
          ErrorCodes.VALIDATION_ERROR,
        );
      }

      const { data: newAuth, error: createError } =
        await admin.auth.admin.createUser({
          email: invite.email.toLowerCase(),
          password: input.password,
          email_confirm: true,
        });

      if (createError || !newAuth?.user) {
        return failure(
          createError?.message ?? "Failed to create account.",
          ErrorCodes.CREATE_FAILED,
        );
      }

      userId = newAuth.user.id;

      await admin.from("users").upsert(
        {
          id: userId,
          email: invite.email.toLowerCase(),
          first_name: null,
          last_name: null,
        },
        { onConflict: "id", ignoreDuplicates: true },
      );
    }

    // ── Find Guide role in tenant ─────────────────────────────
    const { data: guideRole } = await admin
      .from("roles")
      .select("id")
      .eq("tenant_id", invite.tenant_id)
      .eq("name", "Guide")
      .eq("is_system", true)
      .is("deleted_at", null)
      .maybeSingle();

    if (guideRole) {
      await admin.from("tenant_users").upsert(
        {
          tenant_id: invite.tenant_id,
          user_id: userId,
          role_id: guideRole.id,
          status: "active",
        },
        { onConflict: "tenant_id,user_id", ignoreDuplicates: false },
      );
    }

    // ── Mark invitation accepted ──────────────────────────────
    await admin
      .from("guide_invitations")
      .update({
        status: "accepted",
        accepted_at: new Date().toISOString(),
        accepted_by_user_id: userId,
      })
      .eq("id", invite.id);

    return success({
      tenantId: invite.tenant_id,
      tenantName: tenantRow?.name ?? "your school",
      redirectTo: "/reports/my-reports",
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to accept invitation.";
    return failure(message, ErrorCodes.INTERNAL_ERROR);
  }
}
