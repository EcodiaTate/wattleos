"use client";

import {
  CTABanner,
  FeatureRow,
  IconBilling,
  IconEnroll,
  IconPermissions,
  MarketingFooter,
  MarketingNav,
  MarketingShell,
  PageHero,
  SectionDescription,
  SectionHeading,
  SectionLabel,
  useReveal,
} from "../components";

function CascadeSection() {
  const reveal = useReveal();

  const outcomes = [
    { num: "1", text: "Student record created in SIS" },
    { num: "2", text: "Class enrolment set with start date" },
    { num: "3", text: "Guardian records linked to student" },
    { num: "4", text: "Medical conditions normalised from application" },
    { num: "5", text: "Emergency contacts created (priority ordered)" },
    { num: "6", text: "Custody restrictions flagged (if applicable)" },
    { num: "7", text: "Consent flags set on guardian records" },
    { num: "8", text: "Immunisation status set - AIR check scheduled" },
    { num: "9", text: "Parent invitation emails sent" },
    { num: "10", text: "Portfolio folder provisioned" },
    { num: "11", text: "Stripe billing schedule created" },
    { num: "12", text: "Parent auto-added to class group chat" },
  ];

  return (
    <section
      style={{
        padding: "80px 24px",
        background: "linear-gradient(180deg, #FEFCF6 0%, #FAF5EA 100%)",
      }}
    >
      <div
        ref={reveal.ref}
        className={`section-reveal ${reveal.visible ? "visible" : ""}`}
        style={{ maxWidth: 800, margin: "0 auto" }}
      >
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <SectionLabel color="#E8A838">The Approval Cascade</SectionLabel>
          <SectionHeading>
            One click.{" "}
            <span style={{ color: "#E8A838" }}>Twelve outcomes.</span> Zero
            re-entry.
          </SectionHeading>
          <SectionDescription>
            The parent entered their child&apos;s details. You reviewed them.
            That one approval click is the last manual step. Everything else
            fires automatically - because it already knows.
          </SectionDescription>
        </div>

        <div
          style={{
            background: "#fff",
            borderRadius: 20,
            padding: "40px 36px",
            border: "1px solid rgba(232, 168, 56, 0.1)",
            position: "relative",
            boxShadow: "0 8px 40px rgba(44, 24, 16, 0.04)",
          }}
        >
          <div
            style={{
              textAlign: "center",
              marginBottom: 32,
              padding: "16px 24px",
              background: "rgba(232, 168, 56, 0.06)",
              borderRadius: 12,
            }}
          >
            <p
              style={{
                fontFamily: "'Fraunces', Georgia, serif",
                fontSize: 18,
                color: "#2C1810",
                fontWeight: 500,
                margin: 0,
              }}
            >
              Admin clicks{" "}
              <span
                style={{
                  background: "#2C1810",
                  color: "#FEFCF6",
                  padding: "4px 16px",
                  borderRadius: 6,
                  fontFamily: "'Outfit', sans-serif",
                  fontSize: 14,
                  fontWeight: 600,
                  marginLeft: 8,
                }}
              >
                Approve
              </span>
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: 10,
            }}
          >
            {outcomes.map((item) => (
              <div
                key={item.num}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 14px",
                  background: "rgba(91, 140, 90, 0.03)",
                  borderRadius: 10,
                  border: "1px solid rgba(91, 140, 90, 0.06)",
                }}
              >
                <span
                  style={{
                    fontFamily: "'Fraunces', Georgia, serif",
                    fontSize: 14,
                    color: "#5B8C5A",
                    fontWeight: 600,
                    width: 24,
                    textAlign: "center",
                    flexShrink: 0,
                  }}
                >
                  {item.num}
                </span>
                <span
                  style={{
                    fontFamily: "'Outfit', sans-serif",
                    fontSize: 14,
                    color: "#5C4A32",
                  }}
                >
                  {item.text}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function PipelineSection() {
  const reveal = useReveal();

  const stages = [
    {
      label: "Inquiry",
      color: "#8B7355",
      desc: "Family registers interest via your school website",
    },
    {
      label: "Waitlisted",
      color: "#C17D3A",
      desc: "Added to the list with priority ranking",
    },
    { label: "Tour", color: "#E8A838", desc: "Book and attend a school tour" },
    {
      label: "Offered",
      color: "#5B8C5A",
      desc: "Admin offers a place for the next intake",
    },
    {
      label: "Accepted",
      color: "#3D6B3D",
      desc: "Family accepts → auto-converts to enrolment application",
    },
    {
      label: "Enrolled",
      color: "#2C1810",
      desc: "Application approved → full cascade fires",
    },
  ];

  return (
    <section style={{ padding: "80px 24px 100px" }}>
      <div
        ref={reveal.ref}
        className={`section-reveal ${reveal.visible ? "visible" : ""}`}
        style={{ maxWidth: 800, margin: "0 auto" }}
      >
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <SectionLabel color="#C17D3A">Admissions Pipeline</SectionLabel>
          <SectionHeading>
            From first inquiry to first day - tracked
          </SectionHeading>
          <SectionDescription>
            A structured pipeline that replaces the spreadsheet and the inbox
            folder labelled &quot;ENROLMENTS&quot;. Every family tracked through
            every stage. When a family reaches Offered, their inquiry data
            converts directly into the enrolment application - no re-entry, no
            re-asking.
          </SectionDescription>
        </div>

        <div
          style={{
            display: "flex",
            gap: 2,
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          {stages.map((stage, i) => (
            <div
              key={i}
              style={{ display: "flex", alignItems: "center", gap: 2 }}
            >
              <div
                style={{
                  background: `${stage.color}0A`,
                  border: `1.5px solid ${stage.color}20`,
                  borderRadius: 12,
                  padding: "20px 22px",
                  minWidth: 130,
                  textAlign: "center",
                }}
              >
                <p
                  style={{
                    fontFamily: "'Fraunces', Georgia, serif",
                    fontSize: 16,
                    color: stage.color,
                    fontWeight: 600,
                    marginBottom: 4,
                  }}
                >
                  {stage.label}
                </p>
                <p
                  style={{
                    fontFamily: "'Outfit', sans-serif",
                    fontSize: 12,
                    color: "#6B5744",
                    lineHeight: 1.5,
                    margin: 0,
                  }}
                >
                  {stage.desc}
                </p>
              </div>
              {i < stages.length - 1 && (
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                  style={{ flexShrink: 0 }}
                >
                  <path
                    d="M7 4l6 6-6 6"
                    stroke="#C17D3A"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity="0.4"
                  />
                </svg>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PermissionsSection() {
  const reveal = useReveal();

  const roles = [
    {
      name: "Owner",
      desc: "Full platform access. System configuration. Billing.",
      color: "#2C1810",
    },
    {
      name: "Administrator",
      desc: "Everything except system settings. QIP, compliance, rostering, enrolment.",
      color: "#8B6F47",
    },
    {
      name: "Head of School",
      desc: "Pedagogy, SIS, attendance, comms, rostering, enrolment.",
      color: "#C17D3A",
    },
    {
      name: "Lead Guide",
      desc: "Full curriculum & observation access. Three-year cycle planning. Class-level management.",
      color: "#E8A838",
    },
    {
      name: "Guide",
      desc: "Create & publish observations. View students. Take attendance. Access own schedule.",
      color: "#E8A838",
    },
    {
      name: "Assistant",
      desc: "Create observations. View students. Take attendance. Cannot publish without review.",
      color: "#D4877F",
    },
    {
      name: "Program Coordinator",
      desc: "Manage OSHC programs, bookings, check-in/out. CCS session reporting.",
      color: "#5B8C5A",
    },
    {
      name: "Parent",
      desc: "Portfolio, messaging, booking, events. Access scoped to their own children only.",
      color: "#5B8C5A",
    },
  ];

  return (
    <section
      style={{
        padding: "80px 24px",
        background: "linear-gradient(180deg, #FAF5EA 0%, #FEFCF6 100%)",
      }}
    >
      <div
        ref={reveal.ref}
        className={`section-reveal ${reveal.visible ? "visible" : ""}`}
        style={{ maxWidth: 800, margin: "0 auto" }}
      >
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <SectionLabel color="#8B6F47">Granular Permissions</SectionLabel>
          <SectionHeading>
            Eight roles out of the box. Unlimited custom ones.
          </SectionHeading>
          <SectionDescription>
            Permissions control what people see, not just what they can do. A
            guide never sees billing. A parent sees only their own children.
            Create a Volunteer role, a Board Member role - assign permissions
            and publish. No migration, no database change, no IT ticket.
          </SectionDescription>
        </div>

        <div style={{ display: "grid", gap: 10 }}>
          {roles.map((role, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                padding: "16px 20px",
                background: "#fff",
                borderRadius: 12,
                border: "1px solid rgba(44, 24, 16, 0.05)",
              }}
            >
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: role.color,
                  flexShrink: 0,
                  opacity: 0.6,
                }}
              />
              <div style={{ flex: 1 }}>
                <span
                  style={{
                    fontFamily: "'Fraunces', Georgia, serif",
                    fontSize: 16,
                    color: "#2C1810",
                    fontWeight: 500,
                  }}
                >
                  {role.name}
                </span>
              </div>
              <span
                style={{
                  fontFamily: "'Outfit', sans-serif",
                  fontSize: 13,
                  color: "#6B5744",
                  textAlign: "right",
                }}
              >
                {role.desc}
              </span>
            </div>
          ))}
        </div>

        <p
          style={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: 14,
            color: "#8B7355",
            textAlign: "center",
            marginTop: 24,
            fontStyle: "italic",
          }}
        >
          Roles are fully customisable. Add a &quot;Volunteer&quot; role, a
          &quot;Board Member&quot; role, a &quot;Therapist&quot; with read-only
          student access - assign permissions, publish. No migration, no ticket
          to engineering.
        </p>
      </div>
    </section>
  );
}

function ComplianceSection() {
  const reveal = useReveal();

  return (
    <section style={{ padding: "80px 24px 100px" }}>
      <div
        ref={reveal.ref}
        className={`section-reveal ${reveal.visible ? "visible" : ""}`}
        style={{ maxWidth: 700, margin: "0 auto", textAlign: "center" }}
      >
        <SectionLabel color="#5B8C5A">Compliance & Regulatory</SectionLabel>
        <SectionHeading>Every Australian obligation, built in</SectionHeading>
        <SectionDescription maxWidth={560}>
          QIP builder for all seven NQS quality areas. CCS session reporting
          with 42-day absence cap tracking. Immunisation History Statement
          compliance with AIR check scheduling. Emergency drill tracking under
          Regulation 97 with monthly type compliance. EYLF v2 outcome mapping.
          ACARA cross-mapping for Foundation–Year 10. When an assessor asks for
          evidence, you generate a report in seconds - not days.
        </SectionDescription>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            gap: 14,
            marginTop: 40,
            textAlign: "left",
          }}
        >
          {[
            {
              title: "QIP Builder",
              desc: "NQS 7 quality areas, 15 standards, 40 elements. Rate, set goals, attach evidence, track progress toward Meeting/Exceeding.",
            },
            {
              title: "MQ:AP Self-Assessment",
              desc: "27 criteria across 7 quality areas aligned to NQS. Generates readiness ratings for your next external assessment.",
            },
            {
              title: "CCS Reporting",
              desc: "Weekly session bundles, 42-day absence cap tracker, CSV export ready for your software provider. Compliant by design.",
            },
            {
              title: "Immunisation (IHS)",
              desc: "IHS validity tracking per state rules (VIC = 60 days). AIR check due-date alerts. Enrolment blocking for non-compliant children.",
            },
            {
              title: "Emergency Drills (Reg 97)",
              desc: "Monthly drill compliance by type. 25-day at-risk flag, 31-day overdue flag. Participant headcount, debrief notes, full history.",
            },
            {
              title: "EYLF v2",
              desc: "5 outcomes mapped to Montessori observations. Ages 0–5 evidence generated automatically from observation data.",
            },
            {
              title: "ACARA v9.0",
              desc: "Australian Curriculum cross-mapped for Foundation–Year 10. Observations link to achievement standards automatically.",
            },
            {
              title: "Audit Trail",
              desc: "Every access to medical records, custody flags, and student data is timestamped, attributed, and logged - automatically.",
            },
            {
              title: "Australian Data Residency",
              desc: "All data stored in Australian data centres. No offshore transfer of student records.",
            },
          ].map((item, i) => (
            <div
              key={i}
              style={{
                background: "rgba(91, 140, 90, 0.04)",
                borderRadius: 12,
                padding: "20px 18px",
                border: "1px solid rgba(91, 140, 90, 0.08)",
              }}
            >
              <h4
                style={{
                  fontFamily: "'Fraunces', Georgia, serif",
                  fontSize: 16,
                  color: "#2C1810",
                  fontWeight: 500,
                  marginBottom: 4,
                }}
              >
                {item.title}
              </h4>
              <p
                style={{
                  fontFamily: "'Outfit', sans-serif",
                  fontSize: 13,
                  color: "#6B5744",
                  lineHeight: 1.55,
                  margin: 0,
                }}
              >
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function ForAdminClient() {
  return (
    <MarketingShell>
      <MarketingNav />
      <PageHero
        label="For Administrators"
        labelColor="#8B6F47"
        title={
          <>
            Every regulatory obligation,
            <br />
            <span style={{ color: "#8B6F47" }}>one dashboard</span>
          </>
        }
        description="QIP, CCS reporting, immunisation compliance, emergency drills, staff rostering, admissions, billing, permissions - not six separate systems. One platform that knows your whole school."
      />

      <section style={{ padding: "0 24px 60px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <FeatureRow
            icon={<IconEnroll size={28} color="#E8A838" />}
            title="Admissions pipeline, not a spreadsheet"
            description="Inquiry → waitlist → tour → offer → enrolment - every family tracked through a structured pipeline. When you click Approve on an application, twelve things happen automatically: student record created, class assigned, medical conditions normalised, parent invited, billing schedule created, portfolio folder provisioned, and more. The parent entered their data once. You never re-type it."
            color="#E8A838"
          />
          <FeatureRow
            icon={<IconBilling size={28} color="#8B6F47" />}
            title="Billing that knows what Stripe is for"
            description="WattleOS generates billing intents from enrolment data and program bookings and pushes them to Stripe. Parents pay via saved cards. Stripe handles PCI compliance. Xero handles the accounting. WattleOS shows you who has paid, who hasn't, and what's outstanding - without maintaining its own ledger. We don't compete with your accounting system; we eliminate the manual entry between it and your school."
            color="#8B6F47"
            reverse
          />
          <FeatureRow
            icon={<IconPermissions size={28} color="#C17D3A" />}
            title="Permissions that match how your school actually works"
            description="Eight default roles with carefully scoped permissions - Guide, Lead Guide, Assistant, Head of School, Administrator, Program Coordinator, Parent, Owner. Create custom roles without database changes. Medical records require view_medical_records. Custody restrictions are locked to safety-permissioned staff. A guide never sees billing. A parent never sees another family's child. Every access is timestamped in the audit trail."
            color="#C17D3A"
          />
        </div>
      </section>

      <CascadeSection />
      <PipelineSection />
      <PermissionsSection />
      <ComplianceSection />
      <CTABanner />
      <MarketingFooter />
    </MarketingShell>
  );
}
