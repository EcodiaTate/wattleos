"use client";

import {
  CTABanner,
  FeatureRow,
  IconCalendar,
  IconOSHC,
  IconShield,
  MarketingFooter,
  MarketingNav,
  MarketingShell,
  PageHero,
  SectionDescription,
  SectionHeading,
  SectionLabel,
  useReveal,
} from "../components";

function DailyOpsSection() {
  const reveal = useReveal();

  const ops = [
    {
      title: "Morning Roll Call",
      time: "2 minutes",
      desc: "Open the attendance screen on the classroom iPad. Tap present, tap absent. Students with medical conditions show a coloured badge - you know who has an EpiPen before the day starts.",
      color: "#C17D3A",
    },
    {
      title: "Medical Info - Instant Access",
      time: "One tap",
      desc: "A child mentions they feel unwell. Tap their name, see their conditions, medication locations, action plans, and emergency contacts. No walking to the office for a paper file.",
      color: "#D4877F",
    },
    {
      title: "Pickup & Dismissal",
      time: "Tap to check out",
      desc: "Authorised adults are listed per child with photos. If someone not on the list arrives, you know immediately. Custody restrictions are flagged - the system doesn't let you miss them.",
      color: "#8B6F47",
    },
    {
      title: "OSHC Check-in Kiosk",
      time: "Self-service",
      desc: "A dedicated kiosk screen at the OSHC desk. Children's names for today's session are listed. Tap to check in, tap to check out. Allergy badges visible. Feeds straight into attendance and billing.",
      color: "#5B8C5A",
    },
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
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <SectionLabel color="#C17D3A">Daily Operations</SectionLabel>
          <SectionHeading>
            The tasks you do every day, made instant
          </SectionHeading>
          <SectionDescription>
            Attendance, medical lookups, pickup authorisation, OSHC check-in -
            all designed for speed and safety.
          </SectionDescription>
        </div>

        <div style={{ display: "grid", gap: 20 }}>
          {ops.map((op, i) => (
            <div
              key={i}
              style={{
                background: "#fff",
                borderRadius: 16,
                padding: "30px 28px",
                border: "1px solid rgba(44, 24, 16, 0.05)",
                display: "flex",
                gap: 24,
                alignItems: "flex-start",
                flexWrap: "wrap",
              }}
            >
              <div style={{ flex: "1 1 400px" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    gap: 12,
                    marginBottom: 8,
                  }}
                >
                  <h4
                    style={{
                      fontFamily: "'Fraunces', Georgia, serif",
                      fontSize: 20,
                      color: "#2C1810",
                      fontWeight: 500,
                    }}
                  >
                    {op.title}
                  </h4>
                  <span
                    style={{
                      fontFamily: "'Outfit', sans-serif",
                      fontSize: 12,
                      fontWeight: 600,
                      color: op.color,
                      background: `${op.color}0D`,
                      padding: "3px 12px",
                      borderRadius: 100,
                    }}
                  >
                    {op.time}
                  </span>
                </div>
                <p
                  style={{
                    fontFamily: "'Outfit', sans-serif",
                    fontSize: 15,
                    color: "#6B5744",
                    lineHeight: 1.65,
                    margin: 0,
                  }}
                >
                  {op.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function StudentRecordsSection() {
  const reveal = useReveal();

  const fields = [
    "Demographics & photo",
    "Class enrolment history",
    "Guardian & family links",
    "Medical conditions & action plans",
    "Emergency contacts (priority ordered)",
    "Custody restrictions & court orders",
    "Allergy severity badges",
    "Medication name & storage location",
    "Consent flags (media, directory)",
    "Pickup authorisation list",
    "Attendance history & patterns",
    "Notes & admin comments",
  ];

  return (
    <section style={{ padding: "80px 24px 100px" }}>
      <div
        ref={reveal.ref}
        className={`section-reveal ${reveal.visible ? "visible" : ""}`}
        style={{ maxWidth: 800, margin: "0 auto" }}
      >
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <SectionLabel color="#8B6F47">Student Records</SectionLabel>
          <SectionHeading>
            Complete student files, not scattered spreadsheets
          </SectionHeading>
          <SectionDescription>
            Every piece of information about a student lives in one record.
            Entered once during enrolment, updated by parents through the
            portal, accessible to staff based on their permissions.
          </SectionDescription>
        </div>

        <div
          style={{
            background: "#fff",
            borderRadius: 18,
            padding: "36px 32px",
            border: "1px solid rgba(44, 24, 16, 0.06)",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
              gap: "12px 28px",
            }}
          >
            {fields.map((f, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  fontFamily: "'Outfit', sans-serif",
                  fontSize: 14,
                  color: "#5C4A32",
                }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <circle cx="7" cy="7" r="7" fill="rgba(139, 111, 71, 0.1)" />
                  <path
                    d="M4.5 7l1.8 1.8 3.2-3.2"
                    stroke="#8B6F47"
                    strokeWidth="1.3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                {f}
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            marginTop: 28,
            background: "rgba(193, 125, 58, 0.04)",
            borderRadius: 14,
            padding: "24px 28px",
            border: "1px solid rgba(193, 125, 58, 0.1)",
          }}
        >
          <p
            style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: 15,
              color: "#5C4A32",
              lineHeight: 1.65,
              margin: 0,
            }}
          >
            <strong style={{ color: "#2C1810" }}>
              Permission-controlled access.
            </strong>{" "}
            Not everyone sees everything. Medical records require the{" "}
            <em>view_medical_records</em> permission. Custody restrictions
            require <em>manage_safety_records</em>. An assistant guide sees what
            they need for safety - an admin sees the full picture. Every access
            is logged in the audit trail.
          </p>
        </div>
      </div>
    </section>
  );
}

function TimesheetsSection() {
  const reveal = useReveal();

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
        style={{ maxWidth: 700, margin: "0 auto", textAlign: "center" }}
      >
        <SectionLabel color="#5B8C5A">Timesheets & Scheduling</SectionLabel>
        <SectionHeading>
          Log hours. Get approved. Push to payroll.
        </SectionHeading>
        <SectionDescription maxWidth={560}>
          WattleOS captures timesheets and pushes approved hours to your payroll
          system. It does not calculate award rates, tax, or superannuation -
          that&apos;s what Xero and KeyPay are for. What it does is eliminate
          the paper timesheets and manual data entry that sits between &quot;I
          worked today&quot; and &quot;I got paid correctly.&quot;
        </SectionDescription>

        <div
          style={{
            display: "flex",
            gap: 12,
            justifyContent: "center",
            marginTop: 36,
            flexWrap: "wrap",
          }}
        >
          {[
            "Log hours against your roster",
            "Head of School approves",
            "Approved hours push to Xero/KeyPay",
            "Payroll handles the rest",
          ].map((step, i) => (
            <div
              key={i}
              style={{ display: "flex", alignItems: "center", gap: 8 }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: "rgba(91,140,90,0.08)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "'Fraunces', Georgia, serif",
                  fontSize: 13,
                  color: "#5B8C5A",
                  fontWeight: 600,
                }}
              >
                {i + 1}
              </div>
              <span
                style={{
                  fontFamily: "'Outfit', sans-serif",
                  fontSize: 14,
                  color: "#5C4A32",
                }}
              >
                {step}
              </span>
              {i < 3 && (
                <span style={{ color: "#C17D3A", fontSize: 16, marginLeft: 4 }}>
                  →
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function ForStaffPage() {
  return (
    <MarketingShell>
      <MarketingNav />
      <PageHero
        label="For Staff"
        labelColor="#C17D3A"
        title={
          <>
            Less clipboard,
            <br />
            <span style={{ color: "#C17D3A" }}>more classroom</span>
          </>
        }
        description="Attendance, medical info, timesheets, student records - the operational tasks that eat your day, rebuilt for speed and safety on a tablet."
      />

      <section style={{ padding: "0 24px 60px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <FeatureRow
            icon={<IconShield size={28} color="#C17D3A" />}
            title="Roll call in seconds, not minutes"
            description="Open the attendance view for your class. Tap present, tap absent. Children with medical conditions are flagged with severity badges - a red badge for life-threatening allergies means you know about the EpiPen before the first work cycle. Late arrivals update the record in real time. Unexplained absences trigger an alert to the office."
            color="#C17D3A"
          />
          <FeatureRow
            icon={<IconCalendar size={28} color="#8B6F47" />}
            title="Medical info when it matters"
            description="A child says they feel sick. You don't walk to the office - you tap their name. Conditions, severity, action plans, medication locations, emergency contacts in priority order. Custody restrictions flagged for pickup. Every lookup is logged in the audit trail for compliance. Information that was buried in a filing cabinet is now one tap away."
            color="#8B6F47"
            reverse
          />
          <FeatureRow
            icon={<IconOSHC size={28} color="#5B8C5A" />}
            title="OSHC kiosk built for the front desk"
            description="A full-screen check-in view designed for the iPad at your OSHC desk. Today's booked children are listed. Tap to check in, tap to check out. Allergy badges show next to each name. If a child isn't on today's list, you know immediately. Check-in times feed into attendance records and billing - no double entry."
            color="#5B8C5A"
          />
        </div>
      </section>

      <DailyOpsSection />
      <StudentRecordsSection />
      <TimesheetsSection />
      <CTABanner />
      <MarketingFooter />
    </MarketingShell>
  );
}
