"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MarketingFooter, MarketingNav, MarketingShell } from "../page";

// ============================================================
// Types
// ============================================================

interface DetailFeature {
  icon: string;
  title: string;
  desc: string;
  detail: string;
}

// ============================================================
// Data
// ============================================================

const HERO_COLOR = "#C17D3A";

const FEATURES: DetailFeature[] = [
  {
    icon: "📋",
    title: "iPad Roll Call",
    desc: "Tap through your class list in under a minute.",
    detail:
      "Large touch targets designed for busy mornings. Mark present, absent, or late with a single tap. Unexplained absences are automatically flagged for follow-up. The system generates regulatory-compliant attendance records without you ever touching a spreadsheet.",
  },
  {
    icon: "🏥",
    title: "Medical Alerts & Action Plans",
    desc: "Critical health info, always one tap away.",
    detail:
      "Every child's medical conditions, allergies, action plans, and emergency contacts are instantly accessible. Colour-coded severity badges mean you can spot anaphylaxis risks at a glance. Medication logs are tracked digitally with timestamps and staff sign-off.",
  },
  {
    icon: "📁",
    title: "Complete Student Profiles",
    desc: "Everything about each child, organised and current.",
    detail:
      "Family contacts, authorised pickups, custody arrangements, dietary requirements, learning notes, and enrolment history — all in one place. No more flipping through paper files or chasing the office for information.",
  },
  {
    icon: "⏰",
    title: "Timesheets & Leave",
    desc: "Clock in, clock out, submit leave — all digital.",
    detail:
      "Simple digital timekeeping that replaces paper sign-in sheets. Submit leave requests, view your roster, and track your hours. Managers approve with a tap. Data flows directly into payroll processing.",
  },
  {
    icon: "🔔",
    title: "Announcements & Updates",
    desc: "Stay in the loop without drowning in emails.",
    detail:
      "Receive school-wide and team-specific announcements through the app. Important safety alerts are prioritised. Event reminders, roster changes, and policy updates reach you where you actually see them.",
  },
  {
    icon: "🛡️",
    title: "Emergency Procedures",
    desc: "Digital emergency rolls and headcount tools.",
    detail:
      "During emergency evacuations, pull up a live headcount on your device. Mark children as accounted for in real-time. The system knows exactly who should be on-site based on today's attendance and any early pickups.",
  },
];

const QUICK_WINS: { stat: string; label: string }[] = [
  { stat: "< 60s", label: "Morning roll call" },
  { stat: "1 tap", label: "Access medical info" },
  { stat: "0", label: "Paper forms to fill" },
  { stat: "Real-time", label: "Emergency headcount" },
];

// ============================================================
// Components
// ============================================================

function HeroBanner() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    setTimeout(() => setVisible(true), 100);
  }, []);

  return (
    <section
      style={{
        minHeight: "70vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "140px 24px 80px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `
            radial-gradient(ellipse 70% 50% at 30% 20%, rgba(193,125,58,0.12) 0%, transparent 60%),
            radial-gradient(ellipse 50% 40% at 80% 70%, rgba(193,125,58,0.06) 0%, transparent 50%)
          `,
          zIndex: 0,
        }}
      />

      <div
        style={{
          maxWidth: 800,
          margin: "0 auto",
          position: "relative",
          zIndex: 1,
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(30px)",
          transition: "all 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        <Link
          href="/wattleos"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontFamily: "'Outfit', sans-serif",
            fontSize: 13,
            color: "#8B7355",
            textDecoration: "none",
            marginBottom: 24,
          }}
        >
          ← Back to WattleOS
        </Link>

        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            background: `${HERO_COLOR}18`,
            borderRadius: 100,
            padding: "6px 18px",
            marginBottom: 24,
            border: `1px solid ${HERO_COLOR}30`,
            marginLeft: 16,
          }}
        >
          <span
            style={{
              fontSize: 13,
              color: HERO_COLOR,
              fontFamily: "'Outfit', sans-serif",
              fontWeight: 600,
            }}
          >
            For Staff
          </span>
        </div>

        <h1
          style={{
            fontFamily: "'DM Serif Display', Georgia, serif",
            fontSize: "clamp(36px, 5vw, 60px)",
            color: "#2C1810",
            lineHeight: 1.1,
            fontWeight: 400,
            maxWidth: 700,
            letterSpacing: "-0.03em",
            marginBottom: 24,
          }}
        >
          Run your classroom,
          <br />
          <span style={{ color: HERO_COLOR }}>not spreadsheets</span>
        </h1>

        <p
          style={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: "clamp(17px, 2vw, 20px)",
            color: "#6B5744",
            lineHeight: 1.6,
            maxWidth: 560,
            marginBottom: 36,
          }}
        >
          Attendance, medical info, student records, timesheets — all the
          operational essentials that keep your classroom running, now digital,
          fast, and on your iPad.
        </p>

        <Link
          href="/wattleos#contact"
          style={{
            display: "inline-block",
            background: "#2C1810",
            color: "#FEFBF3",
            borderRadius: 10,
            padding: "16px 36px",
            fontFamily: "'Outfit', sans-serif",
            fontSize: 16,
            fontWeight: 600,
            textDecoration: "none",
            letterSpacing: "0.02em",
          }}
        >
          Book a Demo
        </Link>
      </div>
    </section>
  );
}

function QuickWins() {
  return (
    <section style={{ padding: "60px 24px", maxWidth: 900, margin: "0 auto" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 20,
        }}
      >
        {QUICK_WINS.map((w, i: number) => (
          <div
            key={i}
            style={{
              background: "#FEFBF3",
              border: "1px solid rgba(232, 168, 56, 0.12)",
              borderRadius: 16,
              padding: 28,
              textAlign: "center",
            }}
          >
            <p
              style={{
                fontFamily: "'DM Serif Display', Georgia, serif",
                fontSize: 36,
                color: HERO_COLOR,
                fontWeight: 400,
                marginBottom: 4,
              }}
            >
              {w.stat}
            </p>
            <p
              style={{
                fontFamily: "'Outfit', sans-serif",
                fontSize: 14,
                color: "#6B5744",
                margin: 0,
              }}
            >
              {w.label}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function FeatureDeepDive() {
  const [expanded, setExpanded] = useState<number | null>(null);

  return (
    <section style={{ padding: "80px 24px", maxWidth: 900, margin: "0 auto" }}>
      <div style={{ textAlign: "center", marginBottom: 56 }}>
        <p
          style={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: 13,
            fontWeight: 600,
            color: HERO_COLOR,
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            marginBottom: 12,
          }}
        >
          Built for Classroom Operations
        </p>
        <h2
          style={{
            fontFamily: "'DM Serif Display', Georgia, serif",
            fontSize: "clamp(28px, 3.5vw, 42px)",
            color: "#2C1810",
            fontWeight: 400,
            letterSpacing: "-0.02em",
          }}
        >
          Tools that respect your time
        </h2>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {FEATURES.map((f: DetailFeature, i: number) => (
          <div
            key={i}
            style={{
              background: expanded === i ? "#fff" : "#FEFBF3",
              border: `1px solid ${expanded === i ? HERO_COLOR : "rgba(232, 168, 56, 0.12)"}`,
              borderRadius: 16,
              overflow: "hidden",
              transition: "all 0.3s ease",
              cursor: "pointer",
            }}
            onClick={() => setExpanded(expanded === i ? null : i)}
          >
            <div
              style={{
                padding: "24px 28px",
                display: "flex",
                alignItems: "flex-start",
                gap: 16,
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: `${HERO_COLOR}15`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 20,
                  flexShrink: 0,
                }}
              >
                {f.icon}
              </div>
              <div style={{ flex: 1 }}>
                <h3
                  style={{
                    fontFamily: "'DM Serif Display', Georgia, serif",
                    fontSize: 20,
                    color: "#2C1810",
                    fontWeight: 400,
                    marginBottom: 4,
                  }}
                >
                  {f.title}
                </h3>
                <p
                  style={{
                    fontFamily: "'Outfit', sans-serif",
                    fontSize: 15,
                    color: "#6B5744",
                    margin: 0,
                    lineHeight: 1.5,
                  }}
                >
                  {f.desc}
                </p>
              </div>
              <div
                style={{
                  fontSize: 18,
                  color: "#8B7355",
                  transform: expanded === i ? "rotate(180deg)" : "rotate(0)",
                  transition: "transform 0.3s ease",
                  flexShrink: 0,
                  marginTop: 4,
                }}
              >
                ▼
              </div>
            </div>
            {expanded === i && (
              <div
                style={{
                  padding: "0 28px 24px 88px",
                  animation: "fadeIn 0.3s ease",
                }}
              >
                <p
                  style={{
                    fontFamily: "'Outfit', sans-serif",
                    fontSize: 15,
                    color: "#5C4A32",
                    lineHeight: 1.7,
                    margin: 0,
                  }}
                >
                  {f.detail}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function CTABanner() {
  return (
    <section
      style={{
        padding: "80px 24px",
        background: "#2C1810",
        textAlign: "center",
      }}
    >
      <div style={{ maxWidth: 600, margin: "0 auto" }}>
        <h2
          style={{
            fontFamily: "'DM Serif Display', Georgia, serif",
            fontSize: "clamp(28px, 3.5vw, 42px)",
            color: "#FEFBF3",
            fontWeight: 400,
            letterSpacing: "-0.02em",
            marginBottom: 16,
          }}
        >
          Less admin, more time with children
        </h2>
        <p
          style={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: 17,
            color: "rgba(254, 251, 243, 0.7)",
            lineHeight: 1.6,
            marginBottom: 32,
          }}
        >
          See how WattleOS simplifies your daily operations.
        </p>
        <Link
          href="/wattleos#contact"
          style={{
            display: "inline-block",
            background: HERO_COLOR,
            color: "#fff",
            borderRadius: 10,
            padding: "16px 40px",
            fontFamily: "'Outfit', sans-serif",
            fontSize: 16,
            fontWeight: 600,
            textDecoration: "none",
            letterSpacing: "0.02em",
          }}
        >
          Book a Demo
        </Link>
      </div>
    </section>
  );
}

// ============================================================
// Page Export
// ============================================================

export default function ForStaffPage() {
  return (
    <MarketingShell>
      <MarketingNav />
      <HeroBanner />
      <QuickWins />
      <FeatureDeepDive />
      <CTABanner />
      <MarketingFooter />
    </MarketingShell>
  );
}
