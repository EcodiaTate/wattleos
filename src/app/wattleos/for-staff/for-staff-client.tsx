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
      time: "~2 minutes",
      desc: "Tap present, tap absent. Severity-coded medical badges appear next to every child who has a condition on file - anaphylaxis, asthma, cardiac, diabetes. You know before the work cycle starts.",
      color: "#C17D3A",
    },
    {
      title: "Medical Info - One Tap",
      time: "Instant",
      desc: "A child mentions they feel unwell. Tap their name: conditions, severity, action plans, medication location and dose, emergency contacts in priority order, nearest hospital. Logged to the audit trail automatically.",
      color: "#D4877F",
    },
    {
      title: "Pickup & Dismissal",
      time: "Tap to check out",
      desc: "Authorised adults are listed per child. Custody restrictions and court orders are flagged in amber - the system surfaces them before you release a child, not after. Unknown adults are caught at the point of checkout.",
      color: "#8B6F47",
    },
    {
      title: "OSHC Check-in Kiosk",
      time: "Self-service",
      desc: "Today's session list, one tap per arrival or departure. Allergy badges next to every name. CCS-required session times are captured automatically. Billing triggers from the check-out, not from a separate entry.",
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
            The four tasks that used to take an hour, now take minutes
          </SectionHeading>
          <SectionDescription>
            Attendance, medical lookups, pickup authorisation, OSHC check-in —
            each one redesigned for one-handed iPad operation.
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
    "Allergy severity codes",
    "Medication name & storage location",
    "Consent flags (media, excursions, directory)",
    "Pickup authorisation list with photos",
    "Immunisation status (IHS date & AIR check)",
    "Attendance history & patterns",
    "Sick bay & wellbeing log",
    "NAPLAN & NCCD records",
    "Notes & admin comments",
    "Full audit trail on every access",
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
            One record per child - not sixteen spreadsheets
          </SectionHeading>
          <SectionDescription>
            Everything about a student in a single place. Entered once at
            enrolment, kept current by parents through the portal, surfaced to
            staff based on exactly what they need to see.
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
              Permission-controlled. Audit-logged.
            </strong>{" "}
            An assistant guide sees what they need for safety - not billing, not
            custody records. Medical conditions require{" "}
            <em>view_medical_records</em>. Custody restrictions require{" "}
            <em>manage_safety_records</em>. An admin sees the full picture.
            Every single access to sensitive data is timestamped and logged —
            automatically, with no extra steps.
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
        <SectionLabel color="#5B8C5A">Rostering & Timesheets</SectionLabel>
        <SectionHeading>
          Your schedule, leave, and pay - handled in one place
        </SectionHeading>
        <SectionDescription maxWidth={560}>
          WattleOS manages your roster, your leave requests, shift swaps, and
          relief coverage. When you work, you log hours against your shift.
          Approved timesheets push straight to Xero or KeyPay - no paper, no
          manual data entry, nothing falls through the gap between &quot;I
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
            "Roster published → you see your shifts",
            "Request leave or swap a shift in-app",
            "Log hours against your roster",
            "Head of School approves",
            "Approved hours push to Xero/KeyPay",
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
              {i < 4 && (
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

export default function ForStaffClient() {
  return (
    <MarketingShell>
      <MarketingNav />
      <PageHero
        label="For Staff"
        labelColor="#C17D3A"
        title={
          <>
            Every operational task,
            <br />
            <span style={{ color: "#C17D3A" }}>rebuilt for a tablet</span>
          </>
        }
        description="Roll call, medical info, rostering, timesheets, leave requests - the tasks that used to mean walking to the office or opening a spreadsheet, done in seconds on the iPad in your hand."
      />

      <section style={{ padding: "0 24px 60px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <FeatureRow
            icon={<IconShield size={28} color="#C17D3A" />}
            title="Roll call in two minutes, not fifteen"
            description="Open the attendance view on the classroom iPad. Tap present, tap absent. Children with medical conditions show a severity-coded badge - red for anaphylaxis, orange for asthma, and so on - before you've said good morning. Late arrivals update the record in real time. Unexplained absences trigger an alert to the office automatically."
            color="#C17D3A"
          />
          <FeatureRow
            icon={<IconCalendar size={28} color="#8B6F47" />}
            title="Medical info one tap away, not a filing cabinet away"
            description="A child says they don't feel well. You don't walk to the office. You tap their name. Conditions, severity levels, action plans, medication name and storage location, emergency contacts in priority order, custody restrictions for pickup - all there. Every lookup is logged in the audit trail. The information that used to live in a locked cabinet now lives in the device in your hand."
            color="#8B6F47"
            reverse
          />
          <FeatureRow
            icon={<IconOSHC size={28} color="#5B8C5A" />}
            title="OSHC kiosk designed for the front desk"
            description="A dedicated full-screen check-in view for the iPad at your OSHC station. Today's booked children are listed by session. Tap to check in, tap to check out. Allergy badges sit next to every name. If a child arrives who isn't on today's list, you know immediately. Check-in times feed directly into attendance records, CCS reporting, and billing - no second entry."
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
