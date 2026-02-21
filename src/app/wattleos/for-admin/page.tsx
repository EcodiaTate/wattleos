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
    { num: "6", text: "Custody restrictions flagged (if any)" },
    { num: "7", text: "Consent flags set on guardian records" },
    { num: "8", text: "Parent invitation emails sent" },
    { num: "9", text: "Google Drive portfolio folder provisioned" },
    { num: "10", text: "Stripe billing schedule created" },
    { num: "11", text: "Parent auto-added to class group chat" },
    { num: "12", text: "Application marked as approved" },
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
            When you approve an enrolment application, this is what happens
            automatically. This is the &quot;enter it once&quot; promise - the
            parent entered it, you verified it, and now every downstream system
            has what it needs.
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
          <SectionHeading>From first inquiry to first day</SectionHeading>
          <SectionDescription>
            A structured pipeline that replaces the spreadsheet. Every family
            tracked, every stage logged, every follow-up prompted. When a family
            reaches &quot;Offered&quot;, their data converts directly into an
            enrolment application - no re-entry.
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
      desc: "Full platform access. System configuration.",
      color: "#2C1810",
    },
    {
      name: "Administrator",
      desc: "Everything except system settings.",
      color: "#8B6F47",
    },
    {
      name: "Head of School",
      desc: "Pedagogy, SIS, attendance, comms, enrolment.",
      color: "#C17D3A",
    },
    {
      name: "Lead Guide",
      desc: "Full observation & curriculum access. Class-level management.",
      color: "#E8A838",
    },
    {
      name: "Guide",
      desc: "Create & publish observations. View students. Take attendance.",
      color: "#E8A838",
    },
    {
      name: "Assistant",
      desc: "Create observations. View students. Take attendance.",
      color: "#D4877F",
    },
    {
      name: "Program Coordinator",
      desc: "Manage OSHC programs, bookings, check-in/out.",
      color: "#5B8C5A",
    },
    {
      name: "Parent",
      desc: "Portfolio, messaging, booking. Access via guardian links.",
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
            Everyone sees exactly what they should
          </SectionHeading>
          <SectionDescription>
            Eight default roles, each with carefully scoped permissions. Create
            custom roles for your school. Permissions control what people see,
            not just what they can do - a guide never sees billing data, a
            parent never sees another family&apos;s child.
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
          Roles are fully customisable per school. Add a &quot;Volunteer&quot;
          role, a &quot;Board Member&quot; role, or anything else - just assign
          permissions and go. No migration needed.
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
        <SectionLabel color="#5B8C5A">Compliance & Reporting</SectionLabel>
        <SectionHeading>Built for Australian regulations</SectionHeading>
        <SectionDescription maxWidth={560}>
          EYLF outcome mapping for 0–5. ACARA alignment for Foundation–Year 10.
          QCAA syllabus templates for senior secondary. Every observation is
          automatically cross-mapped to the relevant compliance framework - so
          when an assessor asks &quot;show me evidence for EYLF Outcome 3,&quot;
          you generate a report in seconds.
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
              title: "EYLF v2",
              desc: "5 outcomes mapped to Montessori observations for ages 0–5",
            },
            {
              title: "NQS",
              desc: "7 quality areas aligned to daily practice evidence",
            },
            {
              title: "ACARA v9.0",
              desc: "Australian Curriculum cross-mapped for Foundation–Year 10",
            },
            {
              title: "QCAA",
              desc: "Queensland senior syllabi for Years 11–12 certification",
            },
            {
              title: "Audit Trail",
              desc: "Every access to medical, custody, and student records is logged",
            },
            {
              title: "Data Residency",
              desc: "All data stored in Australian data centres",
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

export default function ForAdminPage() {
  return (
    <MarketingShell>
      <MarketingNav />
      <PageHero
        label="For Administrators"
        labelColor="#8B6F47"
        title={
          <>
            Your school&apos;s
            <br />
            <span style={{ color: "#8B6F47" }}>operating system</span>
          </>
        }
        description="Enrolment pipeline, billing, compliance reporting, permissions, and the 'enter it once' promise that eliminates every piece of duplicate data entry in your school."
      />

      <section style={{ padding: "0 24px 60px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <FeatureRow
            icon={<IconEnroll size={28} color="#E8A838" />}
            title="Enrolment that works for everyone"
            description="Parents fill out one guided online form - child details, medical info, emergency contacts, custody, documents, consents. You review it on a single screen. One click to approve, and everything downstream fires automatically. The parent's data entry becomes the school's operating data. No re-typing."
            color="#E8A838"
          />
          <FeatureRow
            icon={<IconBilling size={28} color="#8B6F47" />}
            title="Billing without the accounting risk"
            description="WattleOS generates billing intents from enrolment data and program bookings, then pushes them to Stripe. Parents pay via saved cards. Stripe handles PCI compliance. Xero handles the accounting. WattleOS shows you who's paid, who hasn't, and what's outstanding - without maintaining its own ledger."
            color="#8B6F47"
            reverse
          />
          <FeatureRow
            icon={<IconPermissions size={28} color="#C17D3A" />}
            title="Permissions that actually make sense"
            description="A guide sees observations and curriculum. An assistant sees students and attendance. A parent sees their own children. An admin sees everything. Medical records require explicit permission. Custody restrictions are locked to safety-permissioned staff. Every access is logged. Create custom roles as needed - no database changes required."
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
