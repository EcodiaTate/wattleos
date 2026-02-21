// src/app/legal/terms/page.tsx
//
// WattleOS Terms of Service.
// WHY comprehensive: Schools need clear terms around data ownership,
// SaaS subscription, acceptable use, and liability before they entrust
// student data to the platform.

import type { Metadata } from "next";
import type { CSSProperties } from "react";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "WattleOS Terms of Service — the agreement governing use of the WattleOS platform.",
};

// ────────────────────────────────────────────────────────────
// Shared styles
// ────────────────────────────────────────────────────────────
const heading1: CSSProperties = {
  fontFamily: "'Fraunces', Georgia, serif",
  fontSize: "clamp(32px, 5vw, 44px)",
  fontWeight: 600,
  color: "#2C1810",
  lineHeight: 1.2,
  margin: "0 0 8px",
};

const heading2: CSSProperties = {
  fontFamily: "'Fraunces', Georgia, serif",
  fontSize: 24,
  fontWeight: 600,
  color: "#2C1810",
  lineHeight: 1.3,
  margin: "48px 0 16px",
};

const heading3: CSSProperties = {
  fontFamily: "'Outfit', sans-serif",
  fontSize: 17,
  fontWeight: 600,
  color: "#2C1810",
  lineHeight: 1.4,
  margin: "32px 0 12px",
};

const body: CSSProperties = {
  fontFamily: "'Outfit', sans-serif",
  fontSize: 15,
  color: "#4A3728",
  lineHeight: 1.75,
  margin: "0 0 16px",
};

const subtle: CSSProperties = {
  fontFamily: "'Outfit', sans-serif",
  fontSize: 13,
  color: "#8B7355",
  lineHeight: 1.6,
};

const listItem: CSSProperties = {
  fontFamily: "'Outfit', sans-serif",
  fontSize: 15,
  color: "#4A3728",
  lineHeight: 1.75,
  margin: "0 0 8px",
  paddingLeft: 8,
};

const callout: CSSProperties = {
  background: "rgba(61, 107, 61, 0.06)",
  border: "1px solid rgba(61, 107, 61, 0.12)",
  borderRadius: 12,
  padding: "20px 24px",
  margin: "24px 0",
};

const calloutText: CSSProperties = {
  fontFamily: "'Outfit', sans-serif",
  fontSize: 15,
  color: "#3D6B3D",
  lineHeight: 1.7,
  margin: 0,
  fontWeight: 500,
};

// ────────────────────────────────────────────────────────────
// Page
// ────────────────────────────────────────────────────────────
export default function TermsOfServicePage() {
  return (
    <article>
      {/* ── Header ── */}
      <div style={{ marginBottom: 40 }}>
        <p
          style={{
            ...subtle,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            fontWeight: 600,
            color: "#C17D3A",
            marginBottom: 12,
          }}
        >
          Legal
        </p>
        <h1 style={heading1}>Terms of Service</h1>
        <p style={subtle}>
          Effective: 1 February 2026 &nbsp;·&nbsp; Last updated: 21 February
          2026
        </p>
      </div>

      {/* ── Introduction ── */}
      <p style={body}>
        These Terms of Service (&ldquo;Terms&rdquo;) constitute a legally
        binding agreement between the school, organisation, or individual
        (&ldquo;you&rdquo;, &ldquo;your&rdquo;, the &ldquo;School&rdquo;, or the
        &ldquo;Tenant&rdquo;) and Ecodia Pty Ltd trading as Ecodia Code (ABN:
        89693123278) (&ldquo;Ecodia&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, or
        &ldquo;our&rdquo;) governing your access to and use of the WattleOS
        platform.
      </p>
      <p style={body}>
        By creating a WattleOS account, you agree to be bound by these Terms. If
        you are accepting on behalf of a school or organisation, you represent
        that you have authority to bind that entity.
      </p>

      {/* ── 1. Definitions ── */}
      <h2 style={heading2}>1. Definitions</h2>
      <p style={body}>
        <strong>&ldquo;Platform&rdquo;</strong> means the WattleOS web
        application, APIs, mobile interfaces, and related services hosted at
        wattleos.au and its subdomains. <strong>&ldquo;Tenant&rdquo;</strong>{" "}
        means a school or organisation with an active WattleOS subscription,
        identified by a unique subdomain (e.g., greenvalley.wattleos.au).{" "}
        <strong>&ldquo;Users&rdquo;</strong> means all individuals authorised by
        the Tenant to access the Platform, including administrators, staff,
        guides, and parents. <strong>&ldquo;School Data&rdquo;</strong> means
        all data entered into the Platform by or on behalf of the Tenant,
        including student records, observations, files, and configuration.{" "}
        <strong>&ldquo;Subscription&rdquo;</strong> means the paid plan selected
        by the Tenant, which determines feature access and pricing.
      </p>

      {/* ── 2. Account & Access ── */}
      <h2 style={heading2}>2. Account Registration &amp; Access</h2>

      <h3 style={heading3}>2.1 Registration</h3>
      <p style={body}>
        To use WattleOS, the School must register an account through our demo
        request process or direct onboarding. The person registering must be an
        authorised representative of the School. You must provide accurate and
        complete registration information and keep it current.
      </p>

      <h3 style={heading3}>2.2 Subdomain Provisioning</h3>
      <p style={body}>
        Each Tenant is assigned a unique subdomain under wattleos.au (e.g.,
        yourschool.wattleos.au). This subdomain is used for all tenant-specific
        access including the application, parent portal, and public-facing pages
        such as enrolment forms and tour bookings. Subdomains remain the
        property of Ecodia and may be reclaimed if the Tenant&apos;s
        subscription is terminated.
      </p>

      <h3 style={heading3}>2.3 User Accounts &amp; Permissions</h3>
      <p style={body}>
        The School is responsible for managing user accounts within its tenant,
        assigning appropriate roles and permissions to staff, maintaining the
        confidentiality of authentication credentials, and promptly deactivating
        accounts of users who no longer require access. We provide role-based
        access control with granular permissions. The School is responsible for
        configuring these permissions appropriately for its operational needs.
      </p>

      {/* ── 3. Subscription & Billing ── */}
      <h2 style={heading2}>3. Subscription &amp; Billing</h2>

      <h3 style={heading3}>3.1 Plans &amp; Pricing</h3>
      <p style={body}>
        WattleOS is offered on a monthly subscription basis with pricing tiers
        based on the number of enrolled students. Current pricing is published
        on our website and may be updated with 60 days&apos; written notice to
        existing subscribers.
      </p>

      <h3 style={heading3}>3.2 Payment Terms</h3>
      <p style={body}>
        Subscriptions are billed monthly in advance via Stripe. Payments are
        processed in Australian Dollars (AUD). The School authorises us to
        charge the nominated payment method on each billing date. Failed
        payments will be retried according to Stripe&apos;s standard retry
        schedule, and we will notify the School&apos;s billing contact of any
        payment issues.
      </p>

      <h3 style={heading3}>3.3 Free Trial</h3>
      <p style={body}>
        We may offer a free trial period at our discretion. During the trial,
        full platform functionality is available. At the end of the trial, the
        School must select a paid plan to continue using the Platform. If no
        plan is selected, access will be suspended but data will be retained for
        90 days.
      </p>

      {/* ── 4. Data Ownership ── */}
      <h2 style={heading2}>4. Data Ownership &amp; Licensing</h2>

      <div style={callout}>
        <p style={calloutText}>
          ✅ Your data is yours. Ecodia does not claim ownership of any School
          Data. You retain all rights, title, and interest in your data at all
          times.
        </p>
      </div>

      <h3 style={heading3}>4.1 School Data Ownership</h3>
      <p style={body}>
        The School retains full ownership of all School Data at all times. We do
        not claim any intellectual property rights over School Data. You grant
        Ecodia a limited, non-exclusive licence to host, process, store, and
        display School Data solely for the purpose of providing the Platform
        services. This licence terminates when the School&apos;s data is deleted
        in accordance with our retention policy.
      </p>

      <h3 style={heading3}>4.2 Data Portability</h3>
      <p style={body}>
        The School may export its data at any time using the Platform&apos;s
        built-in export features. Upon subscription termination, we will make
        data available for export for 90 days. We support export in standard
        formats including CSV and JSON. We will not hold School Data hostage or
        charge additional fees for data export.
      </p>

      <h3 style={heading3}>4.3 Anonymised Analytics</h3>
      <p style={body}>
        We may generate anonymised, aggregated statistics from Platform usage
        (e.g., average number of observations per classroom, feature adoption
        rates). This data cannot be used to identify any individual school,
        student, or user. We use this solely to improve the Platform.
      </p>

      {/* ── 5. Acceptable Use ── */}
      <h2 style={heading2}>5. Acceptable Use</h2>
      <p style={body}>You agree not to:</p>
      <ul style={{ paddingLeft: 24, margin: "0 0 16px" }}>
        <li style={listItem}>
          Use the Platform for any purpose other than school management and
          educational operations.
        </li>
        <li style={listItem}>
          Share login credentials or allow unauthorised access to your tenant.
        </li>
        <li style={listItem}>
          Attempt to access another tenant&apos;s data or circumvent security
          controls.
        </li>
        <li style={listItem}>
          Upload malicious software, scripts, or content that could harm the
          Platform or other users.
        </li>
        <li style={listItem}>
          Use the Platform in violation of any applicable Australian or state
          law, including privacy, education, and child protection legislation.
        </li>
        <li style={listItem}>
          Reverse-engineer, decompile, or attempt to extract the source code of
          the Platform.
        </li>
        <li style={listItem}>
          Use the Platform to store data unrelated to the School&apos;s
          educational operations.
        </li>
        <li style={listItem}>
          Resell, sublicence, or allow third parties to use your WattleOS
          subscription.
        </li>
      </ul>
      <p style={body}>
        We reserve the right to suspend access for violations of these terms
        after providing written notice and a reasonable opportunity to remedy
        the issue, except where immediate suspension is necessary to protect the
        security of the Platform or other tenants.
      </p>

      {/* ── 6. Platform Availability ── */}
      <h2 style={heading2}>6. Platform Availability &amp; Support</h2>

      <h3 style={heading3}>6.1 Uptime</h3>
      <p style={body}>
        We target 99.9% uptime for the WattleOS Platform, excluding scheduled
        maintenance. Scheduled maintenance windows will be communicated at least
        48 hours in advance and will be performed outside of Australian Eastern
        school hours where possible.
      </p>

      <h3 style={heading3}>6.2 Support</h3>
      <p style={body}>
        We provide email-based support during Australian Eastern business hours
        (Monday–Friday, 9 AM – 5 PM AEST/AEDT). Critical security issues will be
        addressed outside business hours on a best-effort basis. Support is
        available at{" "}
        <a
          href="mailto:support@wattleos.au"
          style={{ color: "#C17D3A", textDecoration: "none", fontWeight: 500 }}
        >
          support@wattleos.au
        </a>
        .
      </p>

      {/* ── 7. Intellectual Property ── */}
      <h2 style={heading2}>7. Intellectual Property</h2>
      <p style={body}>
        The Platform — including its design, code, features, documentation, and
        branding — is owned by Ecodia Pty Ltd trading as Ecodia Code and
        protected by Australian and international intellectual property laws.
        Your subscription grants a non-exclusive, non-transferable, revocable
        licence to use the Platform for its intended purpose during the
        subscription term. This licence does not include the right to modify,
        distribute, or create derivative works from the Platform.
      </p>
      <p style={body}>
        Curriculum content templates provided within WattleOS (e.g., AMI/AMS
        curriculum frameworks) are provided for reference and operational use
        within the Platform. These templates do not confer ownership of the
        underlying pedagogical frameworks.
      </p>

      {/* ── 8. Liability ── */}
      <h2 style={heading2}>8. Limitation of Liability</h2>

      <h3 style={heading3}>8.1 Warranty Disclaimer</h3>
      <p style={body}>
        The Platform is provided on an &ldquo;as is&rdquo; and &ldquo;as
        available&rdquo; basis. To the maximum extent permitted by Australian
        law, we disclaim all warranties, express or implied, including implied
        warranties of merchantability, fitness for a particular purpose, and
        non-infringement. We do not warrant that the Platform will be
        uninterrupted, error-free, or completely secure.
      </p>

      <h3 style={heading3}>8.2 Limitation</h3>
      <p style={body}>
        To the maximum extent permitted by the Australian Consumer Law (Schedule
        2 of the Competition and Consumer Act 2010), Ecodia&apos;s aggregate
        liability for all claims arising from or related to these Terms or your
        use of the Platform shall not exceed the total fees paid by the School
        to Ecodia in the 12 months immediately preceding the event giving rise
        to the claim.
      </p>
      <p style={body}>
        Nothing in these Terms excludes or limits liability that cannot be
        excluded or limited under Australian law, including liability for
        negligence causing death or personal injury, fraud, or statutory
        consumer guarantees under the Australian Consumer Law.
      </p>

      <h3 style={heading3}>8.3 Indirect Damages</h3>
      <p style={body}>
        To the maximum extent permitted by law, neither party shall be liable to
        the other for indirect, incidental, special, consequential, or punitive
        damages, including loss of profits, revenue, data, or business
        opportunity, regardless of the cause of action or theory of liability.
      </p>

      {/* ── 9. Indemnification ── */}
      <h2 style={heading2}>9. Indemnification</h2>
      <p style={body}>
        The School agrees to indemnify Ecodia against any claims, losses, or
        damages arising from the School&apos;s breach of these Terms, the
        School&apos;s violation of applicable law, the content or accuracy of
        School Data, and unauthorised use of the Platform by the School&apos;s
        users. Ecodia agrees to indemnify the School against any claims arising
        from Ecodia&apos;s material breach of the Data Processing Agreement or
        infringement of third-party intellectual property rights by the
        Platform.
      </p>

      {/* ── 10. Termination ── */}
      <h2 style={heading2}>10. Termination</h2>

      <h3 style={heading3}>10.1 By the School</h3>
      <p style={body}>
        The School may terminate its subscription at any time by providing 30
        days&apos; written notice. The subscription will remain active until the
        end of the current billing period. No refunds are provided for partial
        months.
      </p>

      <h3 style={heading3}>10.2 By Ecodia</h3>
      <p style={body}>
        We may terminate your subscription for material breach of these Terms
        that remains uncured for 30 days after written notice, non-payment of
        fees for 60 consecutive days, or use of the Platform that poses a
        security risk to other tenants.
      </p>

      <h3 style={heading3}>10.3 Effect of Termination</h3>
      <p style={body}>
        Upon termination, your access to the Platform will be suspended. Your
        School Data will be retained for 90 days to allow for data export. After
        90 days, all School Data will be permanently deleted as described in our
        Privacy Policy. Termination does not affect either party&apos;s rights
        or obligations that accrued prior to termination.
      </p>

      {/* ── 11. Changes ── */}
      <h2 style={heading2}>11. Changes to These Terms</h2>
      <p style={body}>
        We may modify these Terms from time to time. We will notify registered
        school administrators by email at least 30 days before material changes
        take effect. Continued use of the Platform after the effective date
        constitutes acceptance of the revised Terms. If you do not agree with
        the changes, you may terminate your subscription before the effective
        date.
      </p>

      {/* ── 12. General ── */}
      <h2 style={heading2}>12. General Provisions</h2>

      <h3 style={heading3}>12.1 Governing Law</h3>
      <p style={body}>
        These Terms are governed by the laws of Queensland, Australia. Any
        disputes arising from these Terms shall be subject to the exclusive
        jurisdiction of the courts of Queensland.
      </p>

      <h3 style={heading3}>12.2 Entire Agreement</h3>
      <p style={body}>
        These Terms, together with our Privacy Policy and Data Processing
        Agreement, constitute the entire agreement between the parties regarding
        the use of WattleOS and supersede all prior agreements or
        communications.
      </p>

      <h3 style={heading3}>12.3 Severability</h3>
      <p style={body}>
        If any provision of these Terms is found to be unenforceable, the
        remaining provisions will remain in full force and effect.
      </p>

      <h3 style={heading3}>12.4 No Waiver</h3>
      <p style={body}>
        Failure by either party to enforce any right under these Terms does not
        constitute a waiver of that right.
      </p>

      <h3 style={heading3}>12.5 Assignment</h3>
      <p style={body}>
        The School may not assign or transfer its rights under these Terms
        without Ecodia&apos;s prior written consent. Ecodia may assign these
        Terms in connection with a merger, acquisition, or sale of all or
        substantially all of its assets, provided the assignee agrees to be
        bound by these Terms.
      </p>

      {/* ── 13. Contact ── */}
      <h2 style={heading2}>13. Contact</h2>
      <p style={body}>For questions about these Terms of Service:</p>
      <div
        style={{
          background: "rgba(44, 24, 16, 0.03)",
          borderRadius: 12,
          padding: "20px 24px",
          margin: "16px 0 0",
        }}
      >
        <p
          style={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: 15,
            color: "#2C1810",
            lineHeight: 1.8,
            margin: 0,
          }}
        >
          <strong>Ecodia Pty Ltd trading as Ecodia Code</strong>
          <br />
          Email:{" "}
          <a
            href="mailto:legal@wattleos.au"
            style={{
              color: "#C17D3A",
              textDecoration: "none",
              fontWeight: 500,
            }}
          >
            legal@wattleos.au
          </a>
          <br />
          General enquiries:{" "}
          <a
            href="mailto:hello@wattleos.au"
            style={{
              color: "#C17D3A",
              textDecoration: "none",
              fontWeight: 500,
            }}
          >
            hello@wattleos.au
          </a>
          <br />
          Location: Sunshine Coast, Queensland, Australia
        </p>
      </div>
    </article>
  );
}
