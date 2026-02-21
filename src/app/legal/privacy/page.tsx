// src/app/legal/privacy/page.tsx
//
// WattleOS Privacy Policy.
// WHY a dedicated page: Schools must verify data handling practices
// before adoption. This builds trust by being specific about Australian
// data residency and Privacy Act 1988 compliance.

import type { Metadata } from "next";
import type { CSSProperties } from "react";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "WattleOS Privacy Policy — how we collect, store, and protect your data under Australian law.",
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
export default function PrivacyPolicyPage() {
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
        <h1 style={heading1}>Privacy Policy</h1>
        <p style={subtle}>
          Effective: 1 February 2026 &nbsp;·&nbsp; Last updated: 21 February
          2026
        </p>
      </div>

      {/* ── Introduction ── */}
      <p style={body}>
        Ecodia Pty Ltd trading as Ecodia Code (ABN: 89693123278)
        (&ldquo;Ecodia&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, or
        &ldquo;our&rdquo;) operates the WattleOS platform
        (&ldquo;WattleOS&rdquo;, the &ldquo;Platform&rdquo;), a
        Montessori-native school management system accessible at wattleos.au and
        its subdomains.
      </p>
      <p style={body}>
        This Privacy Policy explains how we collect, use, disclose, and protect
        personal information in accordance with the{" "}
        <strong>Privacy Act 1988 (Cth)</strong> and the{" "}
        <strong>Australian Privacy Principles (APPs)</strong>. Where we handle
        information about children, we apply additional safeguards as described
        in this policy.
      </p>

      <div style={callout}>
        <p style={calloutText}>
          🇦🇺 All WattleOS data is stored exclusively in Australia. Our database
          infrastructure is hosted in the Sydney (ap-southeast-2) AWS region via
          Supabase. Your school&apos;s data never leaves Australian soil.
        </p>
      </div>

      {/* ── 1. Information We Collect ── */}
      <h2 style={heading2}>1. Information We Collect</h2>

      <h3 style={heading3}>1.1 Information provided by Schools</h3>
      <p style={body}>
        When a school (&ldquo;Tenant&rdquo;) registers for WattleOS, we collect
        information provided by school administrators, including school name,
        address, ABN/ACN, and contact details. Schools then input operational
        data including staff profiles, student enrolment records, family and
        emergency contacts, medical and allergy information, custody
        arrangements, and billing details.
      </p>

      <h3 style={heading3}>1.2 Information about Students and Children</h3>
      <p style={body}>
        WattleOS is designed to manage records for children aged 0–18. Schools
        may record student names, dates of birth, photographs, learning
        observations, developmental progress data, attendance records, medical
        conditions and allergies, portfolio items (photos, videos, notes), and
        report card data. This information is entered and controlled by the
        school. Ecodia processes this data on behalf of the school under the
        terms of our Data Processing Agreement.
      </p>

      <h3 style={heading3}>1.3 Information from Parents and Families</h3>
      <p style={body}>
        Parents and guardians who access the Parent Portal or public-facing
        school pages may provide their name, email address, phone number,
        enrolment inquiry details, tour booking information, and communication
        preferences. Parents interact with WattleOS via their child&apos;s
        school subdomain (e.g., greenvalley.wattleos.au).
      </p>

      <h3 style={heading3}>1.4 Automatically Collected Information</h3>
      <p style={body}>
        When you interact with WattleOS, we automatically collect device and
        browser information, IP address, pages visited and features used,
        timestamps of access, and authentication events. We use this data for
        security monitoring, performance optimisation, and audit logging. We do
        not use tracking cookies for advertising purposes.
      </p>

      {/* ── 2. How We Use Information ── */}
      <h2 style={heading2}>2. How We Use Your Information</h2>
      <p style={body}>
        We use personal information to provide, maintain, and improve the
        WattleOS platform, to authenticate users and enforce tenant isolation
        between schools, to process billing and subscription payments, to send
        essential service communications (e.g., password resets, security
        alerts), to comply with legal obligations including the Notifiable Data
        Breaches (NDB) scheme, to provide technical support, and to generate
        anonymised, aggregate analytics to improve the platform.
      </p>
      <p style={body}>
        We do not sell personal information. We do not use student or child data
        for marketing. We do not build advertising profiles from any data stored
        in WattleOS.
      </p>

      {/* ── 3. Data Storage & Security ── */}
      <h2 style={heading2}>3. Data Storage &amp; Security</h2>

      <div style={callout}>
        <p style={calloutText}>
          🔒 Defence in Depth: WattleOS uses database-level Row Level Security
          (RLS) policies, application-layer permission checks, and tenant-scoped
          isolation to ensure schools can only ever access their own data.
        </p>
      </div>

      <h3 style={heading3}>3.1 Australian Data Residency</h3>
      <p style={body}>
        All primary data — including student records, observations, files, and
        backups — is stored in Australia using the following infrastructure:
      </p>
      <ul style={{ paddingLeft: 24, margin: "0 0 16px" }}>
        <li style={listItem}>
          <strong>Database &amp; Authentication:</strong> Supabase, hosted on
          AWS in the Sydney (ap-southeast-2) region.
        </li>
        <li style={listItem}>
          <strong>File Storage:</strong> Supabase Storage (S3-compatible),
          Sydney region. Portfolio photos, videos, and documents are stored
          here.
        </li>
        <li style={listItem}>
          <strong>Application Hosting:</strong> Vercel, configured with Sydney
          edge functions for Australian traffic routing.
        </li>
        <li style={listItem}>
          <strong>Backups:</strong> Automated daily database backups retained in
          the Sydney region.
        </li>
      </ul>
      <p style={body}>
        We do not transfer personal information outside Australia unless
        explicitly required for a specific integration you enable (e.g., Stripe
        for payment processing, which is covered in Section 5). Any such
        transfer is disclosed and governed by appropriate safeguards.
      </p>

      <h3 style={heading3}>3.2 Security Measures</h3>
      <p style={body}>
        We implement encryption in transit (TLS 1.2+) for all data
        communication, encryption at rest (AES-256) for database and file
        storage, Row Level Security (RLS) policies ensuring strict tenant data
        isolation, role-based access control with granular permissions per user,
        audit logging of security-critical operations (e.g., custody
        restrictions, permission changes), automated session management and
        token expiry, and regular security reviews and dependency updates.
      </p>

      <h3 style={heading3}>3.3 Multi-Tenant Isolation</h3>
      <p style={body}>
        WattleOS uses a multi-tenant architecture where each school is
        identified by a unique tenant ID. Every database query is scoped to the
        authenticated user&apos;s tenant through RLS policies that are enforced
        at the database level — not just in application code. This means that
        even in the event of an application-layer bug, the database itself will
        refuse to return data belonging to another school.
      </p>

      {/* ── 4. Sharing & Disclosure ── */}
      <h2 style={heading2}>4. Sharing &amp; Disclosure</h2>
      <p style={body}>We may share personal information with:</p>
      <ul style={{ paddingLeft: 24, margin: "0 0 16px" }}>
        <li style={listItem}>
          <strong>The School (Tenant):</strong> School administrators have
          access to all data within their tenant as determined by their assigned
          permissions.
        </li>
        <li style={listItem}>
          <strong>Parents/Guardians:</strong> Via the Parent Portal, parents can
          view their own child&apos;s information as permitted by the
          school&apos;s configuration.
        </li>
        <li style={listItem}>
          <strong>Service Providers:</strong> We use a limited number of
          sub-processors to operate the platform (see Section 5).
        </li>
        <li style={listItem}>
          <strong>Legal Requirements:</strong> We may disclose information where
          required by Australian law, regulation, or court order, or where
          necessary to protect the safety of a child.
        </li>
      </ul>
      <p style={body}>
        We do not share personal information with advertisers, data brokers, or
        any third parties for marketing purposes.
      </p>

      {/* ── 5. Sub-processors ── */}
      <h2 style={heading2}>5. Sub-Processors &amp; Third-Party Services</h2>
      <p style={body}>
        WattleOS integrates with the following third-party services. Each is
        used for a specific, limited purpose:
      </p>

      <div
        style={{
          border: "1px solid rgba(44, 24, 16, 0.08)",
          borderRadius: 12,
          overflow: "hidden",
          margin: "16px 0 24px",
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontFamily: "'Outfit', sans-serif",
            fontSize: 14,
          }}
        >
          <thead>
            <tr
              style={{
                background: "rgba(44, 24, 16, 0.03)",
                borderBottom: "1px solid rgba(44, 24, 16, 0.08)",
              }}
            >
              <th
                style={{
                  textAlign: "left",
                  padding: "12px 16px",
                  fontWeight: 600,
                  color: "#2C1810",
                }}
              >
                Provider
              </th>
              <th
                style={{
                  textAlign: "left",
                  padding: "12px 16px",
                  fontWeight: 600,
                  color: "#2C1810",
                }}
              >
                Purpose
              </th>
              <th
                style={{
                  textAlign: "left",
                  padding: "12px 16px",
                  fontWeight: 600,
                  color: "#2C1810",
                }}
              >
                Data Location
              </th>
            </tr>
          </thead>
          <tbody>
            {[
              {
                provider: "Supabase (AWS)",
                purpose: "Database, auth, file storage",
                location: "Sydney, Australia",
              },
              {
                provider: "Vercel",
                purpose: "Application hosting & CDN",
                location: "Sydney edge (AU traffic)",
              },
              {
                provider: "Stripe",
                purpose: "Payment processing",
                location: "USA (PCI-DSS compliant)",
              },
              {
                provider: "Xero",
                purpose: "Accounting integration (if enabled)",
                location: "Australia",
              },
              {
                provider: "KeyPay",
                purpose: "Payroll integration (if enabled)",
                location: "Australia",
              },
              {
                provider: "Google Workspace",
                purpose: "Portfolio Drive folders (if enabled)",
                location: "Configurable by school",
              },
            ].map((row, i) => (
              <tr
                key={row.provider}
                style={{
                  borderBottom:
                    i < 5 ? "1px solid rgba(44, 24, 16, 0.05)" : "none",
                  color: "#4A3728",
                }}
              >
                <td style={{ padding: "10px 16px", fontWeight: 500 }}>
                  {row.provider}
                </td>
                <td style={{ padding: "10px 16px" }}>{row.purpose}</td>
                <td style={{ padding: "10px 16px" }}>{row.location}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p style={body}>
        Stripe is the only sub-processor that may store data outside Australia.
        Stripe processes only payment card details and billing metadata — it
        does not receive student records, observations, or educational data.
        Stripe is certified PCI-DSS Level 1 and provides contractual commitments
        regarding data protection.
      </p>

      {/* ── 6. Children's Data ── */}
      <h2 style={heading2}>6. Children&apos;s Data</h2>
      <p style={body}>
        We recognise the sensitivity of children&apos;s personal information and
        apply heightened protections:
      </p>
      <ul style={{ paddingLeft: 24, margin: "0 0 16px" }}>
        <li style={listItem}>
          Children do not create accounts or interact directly with WattleOS.
          All child data is entered by authorised school staff or parents.
        </li>
        <li style={listItem}>
          Child data is accessible only to school staff with appropriate
          permissions (e.g., a Guide assigned to the child&apos;s classroom) and
          the child&apos;s linked parents/guardians.
        </li>
        <li style={listItem}>
          Custody restrictions and access limitations configured by the school
          are enforced at the database level and logged in an audit trail.
        </li>
        <li style={listItem}>
          We do not use children&apos;s data for any purpose other than
          providing the educational management services requested by the school.
        </li>
        <li style={listItem}>
          Portfolio items (photos, observations, reports) are never made
          publicly accessible. They are only visible within the school&apos;s
          tenant and to authorised parent accounts.
        </li>
      </ul>

      {/* ── 7. Data Retention ── */}
      <h2 style={heading2}>7. Data Retention</h2>
      <p style={body}>
        Schools control the retention of their data within WattleOS. While a
        school maintains an active subscription, all data is retained and
        accessible. Schools can delete individual student records, observations,
        or other data at any time through the platform.
      </p>
      <p style={body}>
        Upon termination of a school&apos;s subscription, we retain the
        school&apos;s data for 90 days to allow for reactivation or data export.
        After this grace period, all tenant data is permanently deleted from our
        production systems and backups within 30 additional days. We will
        provide data export functionality in standard formats (CSV, JSON) prior
        to deletion upon request.
      </p>

      {/* ── 8. Your Rights ── */}
      <h2 style={heading2}>8. Your Rights Under Australian Law</h2>
      <p style={body}>
        Under the Australian Privacy Principles, you have the right to access
        the personal information we hold about you, to request correction of
        inaccurate or outdated information, to make a complaint about our
        handling of your information, and to request information about whether
        we hold personal information about you.
      </p>
      <p style={body}>
        For school staff and administrators, requests should be made through
        your school&apos;s WattleOS administrator. For parents, you may contact
        your child&apos;s school directly or reach us at the contact details
        below.
      </p>
      <p style={body}>
        If you are not satisfied with our response to a complaint, you may
        contact the{" "}
        <strong>
          Office of the Australian Information Commissioner (OAIC)
        </strong>{" "}
        at oaic.gov.au or by phone on 1300 363 992.
      </p>

      {/* ── 9. Notifiable Data Breaches ── */}
      <h2 style={heading2}>9. Data Breach Notification</h2>
      <p style={body}>
        We comply with the Notifiable Data Breaches (NDB) scheme under Part IIIC
        of the Privacy Act 1988. In the event of an eligible data breach, we
        will notify the OAIC and affected individuals as soon as practicable. We
        will also notify the affected school(s) immediately so they can take
        appropriate action and communicate with their community.
      </p>
      <p style={body}>
        Our incident response plan includes immediate containment and
        investigation, assessment of the likelihood of serious harm,
        notification to the OAIC within the statutory timeframe, direct
        notification to affected schools with remediation steps, and a
        post-incident review and process improvement.
      </p>

      {/* ── 10. Cookies ── */}
      <h2 style={heading2}>10. Cookies &amp; Similar Technologies</h2>
      <p style={body}>
        WattleOS uses only essential cookies required for the platform to
        function. These include authentication session cookies, tenant
        identification cookies, and display preference cookies (theme, font
        size, density). We do not use advertising cookies, tracking pixels, or
        third-party analytics cookies. We do not participate in cross-site
        tracking or retargeting.
      </p>

      {/* ── 11. Changes ── */}
      <h2 style={heading2}>11. Changes to This Policy</h2>
      <p style={body}>
        We may update this Privacy Policy from time to time. We will notify
        registered school administrators by email of any material changes at
        least 30 days before they take effect. The &ldquo;Last updated&rdquo;
        date at the top of this page reflects the most recent revision.
      </p>

      {/* ── 12. Contact ── */}
      <h2 style={heading2}>12. Contact Us</h2>
      <p style={body}>
        If you have questions about this Privacy Policy or wish to exercise your
        rights, please contact us:
      </p>
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
            href="mailto:privacy@wattleos.au"
            style={{
              color: "#C17D3A",
              textDecoration: "none",
              fontWeight: 500,
            }}
          >
            privacy@wattleos.au
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
