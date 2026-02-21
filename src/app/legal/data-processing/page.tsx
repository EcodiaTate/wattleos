// src/app/legal/data-processing/page.tsx
//
// WattleOS Data Processing Agreement (DPA).
// WHY a DPA: Schools are data controllers under Australian privacy law.
// As a processor, Ecodia must provide clear contractual commitments
// about how school data is handled, stored, and protected.

import type { Metadata } from "next";
import type { CSSProperties } from "react";

export const metadata: Metadata = {
  title: "Data Processing Agreement",
  description:
    "WattleOS Data Processing Agreement — how Ecodia processes school data as a data processor.",
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

const warningCallout: CSSProperties = {
  background: "rgba(232, 168, 56, 0.08)",
  border: "1px solid rgba(232, 168, 56, 0.2)",
  borderRadius: 12,
  padding: "20px 24px",
  margin: "24px 0",
};

const warningText: CSSProperties = {
  fontFamily: "'Outfit', sans-serif",
  fontSize: 15,
  color: "#8B6914",
  lineHeight: 1.7,
  margin: 0,
  fontWeight: 500,
};

// ────────────────────────────────────────────────────────────
// Page
// ────────────────────────────────────────────────────────────
export default function DataProcessingPage() {
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
        <h1 style={heading1}>Data Processing Agreement</h1>
        <p style={subtle}>
          Effective: 1 February 2026 &nbsp;·&nbsp; Last updated: 21 February
          2026
        </p>
      </div>

      {/* ── Introduction ── */}
      <p style={body}>
        This Data Processing Agreement (&ldquo;DPA&rdquo;) forms part of the
        Terms of Service between the school or organisation (&ldquo;Data
        Controller&rdquo;, &ldquo;School&rdquo;, &ldquo;you&rdquo;) and Ecodia
        Code Pty Ltd (ABN: 89693123278) (&ldquo;Data Processor&rdquo;,
        &ldquo;Ecodia&rdquo;, &ldquo;we&rdquo;) and governs Ecodia&apos;s
        processing of personal information on behalf of the School through the
        WattleOS platform.
      </p>
      <p style={body}>
        This DPA is designed to satisfy the requirements of the Privacy Act 1988
        (Cth) and the Australian Privacy Principles (APPs), particularly APP 8
        (cross-border disclosure) and APP 11 (security of personal information).
        While Australian law does not mandate a formal DPA in the same way as
        the European GDPR, we provide this agreement because schools deserve
        transparency and contractual certainty about how their data is handled.
      </p>

      <div style={callout}>
        <p style={calloutText}>
          🇦🇺 Data Sovereignty Guarantee: All personal information processed
          under this agreement is stored exclusively within Australia, in the
          Sydney (ap-southeast-2) AWS region. Ecodia commits to not transferring
          School Data outside Australia without prior written consent from the
          School.
        </p>
      </div>

      {/* ── 1. Roles & Scope ── */}
      <h2 style={heading2}>1. Roles &amp; Scope of Processing</h2>

      <h3 style={heading3}>1.1 Roles</h3>
      <p style={body}>
        For the purposes of this DPA, the <strong>School</strong> is the Data
        Controller. The School determines the purposes and means of processing
        personal information — it decides what student and staff data is entered
        into WattleOS and how the platform is used. <strong>Ecodia</strong> is
        the Data Processor. Ecodia processes personal information solely on
        behalf of the School, in accordance with the School&apos;s instructions,
        and as described in this DPA and the Terms of Service.
      </p>

      <h3 style={heading3}>1.2 Categories of Data Subjects</h3>
      <p style={body}>
        This DPA covers personal information relating to students and children
        (ages 0–18) enrolled at the School, parents, guardians, and family
        members, school staff including teachers, guides, and administrators,
        prospective families (enquiry and admissions data), and casual or
        external contacts (emergency contacts, contractors).
      </p>

      <h3 style={heading3}>1.3 Types of Personal Information</h3>
      <p style={body}>
        The following categories of personal information may be processed
        through WattleOS:
      </p>
      <ul style={{ paddingLeft: 24, margin: "0 0 16px" }}>
        <li style={listItem}>
          <strong>Identity data:</strong> Names, dates of birth, gender,
          photographs, student IDs.
        </li>
        <li style={listItem}>
          <strong>Contact data:</strong> Addresses, email addresses, phone
          numbers, emergency contacts.
        </li>
        <li style={listItem}>
          <strong>Educational data:</strong> Enrolment records, classroom
          assignments, learning observations, mastery progress, report cards,
          portfolio items.
        </li>
        <li style={listItem}>
          <strong>Sensitive information:</strong> Medical conditions, allergies,
          dietary requirements, custody arrangements, cultural or religious
          considerations relevant to care.
        </li>
        <li style={listItem}>
          <strong>Operational data:</strong> Attendance records, sign-in/out
          times, program enrolments, billing and fee information.
        </li>
        <li style={listItem}>
          <strong>Employment data:</strong> Staff contact details,
          qualifications, working with children checks, timesheet records.
        </li>
        <li style={listItem}>
          <strong>Media:</strong> Photographs, videos, and audio recordings
          captured through the observation system.
        </li>
      </ul>

      <h3 style={heading3}>1.4 Purpose of Processing</h3>
      <p style={body}>
        Ecodia processes personal information solely to provide the WattleOS
        platform services as instructed by the School. This includes hosting and
        storing School Data securely, providing authenticated access to
        authorised users, enabling educational record-keeping and reporting,
        generating reports and portfolio documents, facilitating parent
        communication, processing billing and subscription management, providing
        technical support, and maintaining system security and audit logs.
      </p>

      {/* ── 2. Processor Obligations ── */}
      <h2 style={heading2}>2. Processor Obligations</h2>
      <p style={body}>Ecodia agrees to:</p>

      <h3 style={heading3}>2.1 Process on Instructions Only</h3>
      <p style={body}>
        Process personal information only on the documented instructions of the
        School, which are defined by the School&apos;s configuration and use of
        the Platform and this DPA. If Ecodia believes an instruction from the
        School would violate Australian privacy law, Ecodia will promptly notify
        the School and await further instructions.
      </p>

      <h3 style={heading3}>2.2 Confidentiality</h3>
      <p style={body}>
        Ensure that all personnel authorised to process personal information
        have committed to confidentiality obligations. Ecodia employees and
        contractors who may access School Data are bound by confidentiality
        agreements and receive data protection training.
      </p>

      <h3 style={heading3}>2.3 Security Measures</h3>
      <p style={body}>
        Implement and maintain appropriate technical and organisational measures
        to protect personal information against unauthorised access, loss,
        destruction, or alteration. These measures include:
      </p>
      <ul style={{ paddingLeft: 24, margin: "0 0 16px" }}>
        <li style={listItem}>
          <strong>Encryption in transit:</strong> All data transmitted between
          users and the Platform is encrypted using TLS 1.2 or higher.
        </li>
        <li style={listItem}>
          <strong>Encryption at rest:</strong> All database storage and file
          storage is encrypted using AES-256.
        </li>
        <li style={listItem}>
          <strong>Tenant isolation:</strong> Row Level Security (RLS) policies
          at the database level ensure each school&apos;s data is completely
          isolated. RLS is enforced by the database engine itself, independent
          of application code.
        </li>
        <li style={listItem}>
          <strong>Access control:</strong> Role-based access control with
          granular permissions. Staff see only the data relevant to their role
          and classroom assignments.
        </li>
        <li style={listItem}>
          <strong>Audit logging:</strong> Security-critical operations (custody
          changes, permission modifications, data exports) are logged with
          timestamps, user IDs, and action details.
        </li>
        <li style={listItem}>
          <strong>Authentication:</strong> Secure authentication via Supabase
          Auth with session management, token expiry, and support for
          email/password and OAuth flows.
        </li>
        <li style={listItem}>
          <strong>Backup &amp; recovery:</strong> Automated daily backups stored
          in the Sydney AWS region, with point-in-time recovery capability.
        </li>
        <li style={listItem}>
          <strong>Infrastructure security:</strong> Supabase provides SOC 2 Type
          II compliant infrastructure, network isolation, and automated security
          patching.
        </li>
      </ul>

      <h3 style={heading3}>2.4 Sub-Processing</h3>
      <p style={body}>
        Ecodia engages the sub-processors listed in our Privacy Policy (Section
        5). Ecodia will notify the School at least 30 days before engaging any
        new sub-processor, providing the School with an opportunity to object.
        Where the School raises a reasonable objection that cannot be resolved,
        the School may terminate the agreement without penalty. Ecodia ensures
        that all sub-processors are bound by data protection obligations no less
        protective than those in this DPA.
      </p>

      <h3 style={heading3}>2.5 Data Subject Requests</h3>
      <p style={body}>
        If Ecodia receives a request from an individual (e.g., a parent) seeking
        to access, correct, or delete personal information held within a
        School&apos;s tenant, Ecodia will promptly redirect the request to the
        School. Ecodia will provide reasonable technical assistance to the
        School in fulfilling data subject requests, including providing data
        exports and supporting deletion operations.
      </p>

      <h3 style={heading3}>2.6 Return &amp; Deletion</h3>
      <p style={body}>
        Upon termination of the School&apos;s subscription, Ecodia will make all
        School Data available for export for 90 days and permanently delete all
        School Data from production systems and backups within 120 days of
        termination. The School may request an earlier deletion, which Ecodia
        will complete within 30 days of the request. Ecodia will provide written
        confirmation of deletion upon request.
      </p>

      {/* ── 3. Data Residency ── */}
      <h2 style={heading2}>3. Data Residency &amp; Cross-Border Transfers</h2>

      <div style={callout}>
        <p style={calloutText}>
          This section addresses APP 8 (cross-border disclosure of personal
          information) requirements under the Privacy Act 1988.
        </p>
      </div>

      <h3 style={heading3}>3.1 Primary Data Location</h3>
      <p style={body}>
        All School Data is stored within Australia. Specifically:
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
                Data Type
              </th>
              <th
                style={{
                  textAlign: "left",
                  padding: "12px 16px",
                  fontWeight: 600,
                  color: "#2C1810",
                }}
              >
                Storage Provider
              </th>
              <th
                style={{
                  textAlign: "left",
                  padding: "12px 16px",
                  fontWeight: 600,
                  color: "#2C1810",
                }}
              >
                Region
              </th>
              <th
                style={{
                  textAlign: "left",
                  padding: "12px 16px",
                  fontWeight: 600,
                  color: "#2C1810",
                }}
              >
                Certification
              </th>
            </tr>
          </thead>
          <tbody>
            {[
              {
                type: "Database (PostgreSQL)",
                provider: "Supabase / AWS RDS",
                region: "ap-southeast-2 (Sydney)",
                cert: "SOC 2 Type II, ISO 27001",
              },
              {
                type: "File storage (S3)",
                provider: "Supabase Storage / AWS S3",
                region: "ap-southeast-2 (Sydney)",
                cert: "SOC 2 Type II",
              },
              {
                type: "Authentication",
                provider: "Supabase Auth",
                region: "ap-southeast-2 (Sydney)",
                cert: "SOC 2 Type II",
              },
              {
                type: "Realtime subscriptions",
                provider: "Supabase Realtime",
                region: "ap-southeast-2 (Sydney)",
                cert: "SOC 2 Type II",
              },
              {
                type: "Database backups",
                provider: "AWS (automated)",
                region: "ap-southeast-2 (Sydney)",
                cert: "SOC 2 Type II, ISO 27001",
              },
            ].map((row, i) => (
              <tr
                key={row.type}
                style={{
                  borderBottom:
                    i < 4 ? "1px solid rgba(44, 24, 16, 0.05)" : "none",
                  color: "#4A3728",
                }}
              >
                <td style={{ padding: "10px 16px", fontWeight: 500 }}>
                  {row.type}
                </td>
                <td style={{ padding: "10px 16px" }}>{row.provider}</td>
                <td style={{ padding: "10px 16px" }}>{row.region}</td>
                <td style={{ padding: "10px 16px", fontSize: 13 }}>
                  {row.cert}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 style={heading3}>3.2 Cross-Border Disclosure</h3>
      <p style={body}>
        Ecodia does not disclose School Data to overseas recipients as part of
        standard platform operations. The following limited exceptions apply
        only when the School actively enables the relevant integration:
      </p>
      <ul style={{ paddingLeft: 24, margin: "0 0 16px" }}>
        <li style={listItem}>
          <strong>Stripe (Payment Processing):</strong> When the School enables
          Stripe billing, payment card details and billing metadata are
          processed by Stripe, Inc. (USA). Stripe is PCI-DSS Level 1 certified.
          Importantly, Stripe never receives student records, educational data,
          or sensitive personal information — only billing contact names, email
          addresses, and payment details.
        </li>
        <li style={listItem}>
          <strong>Google Workspace (Optional):</strong> If the School enables
          Google Drive integration for portfolio folder provisioning, folder
          metadata is shared with Google. The School controls which Google
          Workspace region its data resides in.
        </li>
      </ul>
      <p style={body}>
        No other cross-border transfers occur. Ecodia will notify the School
        before introducing any new integration that would involve cross-border
        data disclosure.
      </p>

      <div style={warningCallout}>
        <p style={warningText}>
          ⚠️ Ecodia will not move the primary data storage location outside
          Australia without providing at least 90 days&apos; written notice and
          obtaining explicit written consent from all affected Schools.
        </p>
      </div>

      {/* ── 4. Breach Notification ── */}
      <h2 style={heading2}>4. Data Breach Notification</h2>

      <h3 style={heading3}>4.1 Notification Timeframe</h3>
      <p style={body}>
        In the event Ecodia becomes aware of a data breach affecting School
        Data, Ecodia will notify the affected School(s) without undue delay and
        in any event within 24 hours of becoming aware of the breach.
        Notification will be provided to the School&apos;s designated
        administrative contact via email and, where possible, in-platform
        notification.
      </p>

      <h3 style={heading3}>4.2 Breach Notification Content</h3>
      <p style={body}>
        Ecodia&apos;s breach notification will include a description of the
        nature of the breach, the categories and approximate number of data
        subjects affected, the likely consequences of the breach, a description
        of measures taken or proposed to address the breach and mitigate its
        effects, and the contact details of Ecodia&apos;s responsible officer.
      </p>

      <h3 style={heading3}>4.3 Regulatory Notification</h3>
      <p style={body}>
        Where the breach constitutes an &ldquo;eligible data breach&rdquo; under
        Part IIIC of the Privacy Act 1988, Ecodia will cooperate with the School
        in assessing the breach, assist the School in meeting its notification
        obligations to the OAIC and affected individuals, and provide the School
        with all information reasonably necessary to complete the Notifiable
        Data Breaches assessment.
      </p>
      <p style={body}>
        As the Data Controller, the School is ultimately responsible for
        determining whether notification to the OAIC is required. Ecodia will
        provide all reasonable support in making this determination.
      </p>

      {/* ── 5. Audit Rights ── */}
      <h2 style={heading2}>5. Audit &amp; Inspection Rights</h2>
      <p style={body}>
        Ecodia will make available to the School, upon reasonable written
        request, all information necessary to demonstrate compliance with this
        DPA. This includes providing documentation of security measures and
        certifications, permitting reasonable audits or inspections conducted by
        the School or a qualified third-party auditor, and cooperating with
        compliance reviews related to the School&apos;s obligations under
        Australian privacy law.
      </p>
      <p style={body}>
        The School will provide at least 30 days&apos; notice for any audit.
        Audits will be conducted during business hours, no more than once per
        year, and in a manner that minimises disruption to Ecodia&apos;s
        operations. Ecodia may require the auditor to execute a confidentiality
        agreement before the audit commences.
      </p>

      {/* ── 6. School Obligations ── */}
      <h2 style={heading2}>6. School Obligations as Data Controller</h2>
      <p style={body}>As the Data Controller, the School is responsible for:</p>
      <ul style={{ paddingLeft: 24, margin: "0 0 16px" }}>
        <li style={listItem}>
          <strong>Lawful collection:</strong> Ensuring that all personal
          information entered into WattleOS has been collected lawfully and in
          accordance with the APPs, including providing appropriate privacy
          notices to parents, staff, and families.
        </li>
        <li style={listItem}>
          <strong>Consent:</strong> Obtaining any necessary consent for the
          collection and use of personal information, including consent for
          photographs and media of children where required.
        </li>
        <li style={listItem}>
          <strong>Accuracy:</strong> Taking reasonable steps to ensure the
          accuracy and completeness of personal information entered into the
          Platform.
        </li>
        <li style={listItem}>
          <strong>Access management:</strong> Properly configuring user roles,
          permissions, and custody restrictions within the Platform.
        </li>
        <li style={listItem}>
          <strong>Data subject requests:</strong> Handling access, correction,
          and deletion requests from data subjects in accordance with the APPs.
        </li>
        <li style={listItem}>
          <strong>State legislation:</strong> Complying with relevant state or
          territory education and child protection legislation in addition to
          Commonwealth privacy law.
        </li>
      </ul>

      {/* ── 7. Sensitive Information ── */}
      <h2 style={heading2}>7. Handling of Sensitive Information</h2>
      <p style={body}>
        WattleOS may be used to store sensitive information as defined under the
        Privacy Act 1988, including health information (medical conditions,
        allergies, medications) and information about cultural or ethnic origin
        where relevant to a child&apos;s care.
      </p>
      <p style={body}>
        Ecodia applies additional protections to sensitive information. Medical
        and allergy data is flagged at the database level with severity ratings,
        ensuring it is prominently displayed to relevant staff during attendance
        and classroom operations. Custody restrictions are enforced through
        dedicated database fields and audit-logged for accountability. Access to
        sensitive fields is governed by specific permissions — not all staff
        roles can view medical or custody data.
      </p>

      {/* ── 8. Duration & Survival ── */}
      <h2 style={heading2}>8. Duration &amp; Survival</h2>
      <p style={body}>
        This DPA takes effect when the School first accesses the WattleOS
        Platform and remains in effect for the duration of the School&apos;s
        subscription. Sections 2.6 (Return &amp; Deletion), 4 (Data Breach
        Notification), and 5 (Audit Rights) survive termination of this DPA for
        a period of 12 months or until all School Data has been deleted,
        whichever is later.
      </p>

      {/* ── 9. Amendments ── */}
      <h2 style={heading2}>9. Amendments</h2>
      <p style={body}>
        Ecodia may amend this DPA to reflect changes in law, regulatory
        guidance, or our processing activities. Material changes will be
        communicated to the School at least 30 days before taking effect. If the
        School does not agree with a material amendment, the School may
        terminate the agreement in accordance with the Terms of Service without
        penalty.
      </p>

      {/* ── 10. Governing Law ── */}
      <h2 style={heading2}>10. Governing Law &amp; Jurisdiction</h2>
      <p style={body}>
        This DPA is governed by the laws of Queensland, Australia, and is
        subject to the exclusive jurisdiction of the courts of Queensland. In
        the event of any conflict between this DPA and the Terms of Service,
        this DPA shall prevail with respect to data processing matters.
      </p>

      {/* ── Schedule A ── */}
      <h2 style={heading2}>
        Schedule A: Technical &amp; Organisational Measures
      </h2>
      <p style={body}>
        The following is a summary of the key technical and organisational
        measures implemented by Ecodia to protect School Data:
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
                  width: "35%",
                }}
              >
                Control Area
              </th>
              <th
                style={{
                  textAlign: "left",
                  padding: "12px 16px",
                  fontWeight: 600,
                  color: "#2C1810",
                }}
              >
                Measures
              </th>
            </tr>
          </thead>
          <tbody>
            {[
              {
                area: "Data Isolation",
                measures:
                  "Row Level Security (RLS) at PostgreSQL level; tenant-scoped queries; subdomain-based tenant identification",
              },
              {
                area: "Encryption",
                measures:
                  "TLS 1.2+ in transit; AES-256 at rest for database and object storage",
              },
              {
                area: "Authentication",
                measures:
                  "Supabase Auth with session tokens; configurable session expiry; OAuth support",
              },
              {
                area: "Access Control",
                measures:
                  "Role-based permissions (Admin, Staff, Guide, Parent); granular permission flags per action",
              },
              {
                area: "Audit Logging",
                measures:
                  "Immutable audit log for custody changes, permission edits, data exports, and security events",
              },
              {
                area: "Backup & Recovery",
                measures:
                  "Daily automated backups; point-in-time recovery; Sydney region retention",
              },
              {
                area: "Network Security",
                measures:
                  "Supabase-managed VPC; firewall rules; DDoS protection via CDN",
              },
              {
                area: "Development Practices",
                measures:
                  "TypeScript strict mode; dependency auditing; code review; no production data in development environments",
              },
              {
                area: "Personnel",
                measures:
                  "Confidentiality agreements; access limited to essential personnel; security awareness training",
              },
              {
                area: "Incident Response",
                measures:
                  "Documented incident response plan; 24-hour breach notification; post-incident review process",
              },
            ].map((row, i) => (
              <tr
                key={row.area}
                style={{
                  borderBottom:
                    i < 9 ? "1px solid rgba(44, 24, 16, 0.05)" : "none",
                  color: "#4A3728",
                }}
              >
                <td
                  style={{
                    padding: "10px 16px",
                    fontWeight: 500,
                    verticalAlign: "top",
                  }}
                >
                  {row.area}
                </td>
                <td style={{ padding: "10px 16px" }}>{row.measures}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Contact ── */}
      <h2 style={heading2}>Contact</h2>
      <p style={body}>
        For questions about this Data Processing Agreement or to exercise audit
        rights:
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
          Data Protection Contact:{" "}
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
          Legal enquiries:{" "}
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
