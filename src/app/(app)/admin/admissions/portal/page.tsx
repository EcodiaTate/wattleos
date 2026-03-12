// src/app/(app)/admin/admissions/portal/page.tsx
//
// ============================================================
// WattleOS V2 - Public Portal Settings (Module 13)
// ============================================================
// Admin configuration for the public family-facing pages:
//   /inquiry - configure form fields, messages, custom questions
//   /tours   - configure page intro, custom booking questions
//
// Settings are stored in tenants.settings JSONB under
// inquiry_config and tours_config keys.
//
// Permission: MANAGE_TENANT_SETTINGS (for inquiry) and
// MANAGE_TOURS (for tours) - both checked inside server actions.
// ============================================================

import { getInquiryConfig } from "@/lib/actions/admissions/inquiry-config";
import { getToursConfig } from "@/lib/actions/admissions/tours-config";
import { getTenantContext } from "@/lib/auth/tenant-context";
import { Permissions } from "@/lib/constants/permissions";
import { DEFAULT_INQUIRY_CONFIG, DEFAULT_TOURS_CONFIG } from "@/types/domain";
import { redirect } from "next/navigation";
import { InquiryConfigClient } from "./inquiry-config-client";
import { ToursConfigClient } from "./tours-config-client";

export const metadata = { title: "Public Portal Settings - WattleOS" };

export default async function PublicPortalSettingsPage() {
  const context = await getTenantContext();

  if (!context.permissions.includes(Permissions.MANAGE_TENANT_SETTINGS)) {
    redirect("/admin/admissions");
  }

  const [inquiryResult, toursResult] = await Promise.all([
    getInquiryConfig(context.tenant.id),
    getToursConfig(context.tenant.id),
  ]);

  const inquiryConfig = inquiryResult.data ?? DEFAULT_INQUIRY_CONFIG;
  const toursConfig = toursResult.data ?? DEFAULT_TOURS_CONFIG;

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Public Portal Settings
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Customise the family-facing pages families see before they&apos;re
          enrolled.
        </p>
      </div>

      {/* Tabs */}
      <div className="space-y-8">
        {/* Inquiry Form */}
        <section>
          <div className="mb-4 border-b border-border pb-3">
            <h2 className="text-lg font-semibold text-foreground">
              Enquiry Form
            </h2>
            <p className="text-sm text-muted-foreground">
              Controls what appears at{" "}
              <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                /inquiry
              </span>{" "}
              - your school&apos;s public front door.
            </p>
          </div>
          <InquiryConfigClient initialConfig={inquiryConfig} />
        </section>

        {/* Tours Page */}
        <section>
          <div className="mb-4 border-b border-border pb-3">
            <h2 className="text-lg font-semibold text-foreground">
              Tour Booking Page
            </h2>
            <p className="text-sm text-muted-foreground">
              Controls what appears at{" "}
              <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                /tours
              </span>{" "}
              - where families self-book tour slots.
            </p>
          </div>
          <ToursConfigClient initialConfig={toursConfig} />
        </section>
      </div>
    </div>
  );
}
