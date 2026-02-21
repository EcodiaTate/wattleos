"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  IconBilling,
  IconChat,
  IconEnroll,
  IconFamily,
  IconMastery,
  IconOSHC,
  IconObserve,
  IconReport,
  IconShield,
  IconTree,
  MarketingFooter,
  MarketingNav,
  MarketingShell,
  SectionDescription,
  SectionHeading,
  SectionLabel,
  WattleLogo,
  useReveal,
} from "./wattleos/components";

// ============================================================
// Data
// ============================================================

const SYSTEMS_REPLACED = [
  {
    name: "Transparent Classroom",
    what: "Mastery tracking",
    module: "Curriculum & Mastery",
  },
  {
    name: "Storypark / Seesaw",
    what: "Observations & sharing",
    module: "Observation Engine",
  },
  {
    name: "FACTS / Spreadsheet SIS",
    what: "Student records",
    module: "Student Information",
  },
  { name: "QikKids / Xplor", what: "OSHC & programs", module: "Extended Day" },
  {
    name: "WhatsApp Groups",
    what: "Parent communication",
    module: "Community Hub",
  },
  {
    name: "Google Forms",
    what: "Enrolment & waitlist",
    module: "Admissions Pipeline",
  },
  { name: "Word Documents", what: "Term reports", module: "Report Builder" },
  {
    name: "Paper Attendance Rolls",
    what: "Attendance & safety",
    module: "Attendance & Safety",
  },
];

const ALL_FEATURES = [
  "Observation capture & tagging",
  "AMI / AMS curriculum engine",
  "Mastery tracking & portfolios",
  "Student information system",
  "Attendance & safety kiosk",
  "Term report builder",
  "Parent portal & app",
  "OSHC & program bookings",
  "Enrolment & waitlist pipeline",
  "Community chat & events",
  "EYLF / NQS / ACARA compliance",
  "Stripe billing & invoicing",
  "Role-based permissions",
  "Unlimited staff accounts",
  "Data export anytime",
  "Australian data residency",
];

type FormField =
  | "name"
  | "school"
  | "email"
  | "phone"
  | "students"
  | "role"
  | "message";

// ============================================================
// Hero
// ============================================================

function HeroSection() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    setTimeout(() => setVisible(true), 150);
  }, []);

  return (
    <section
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        textAlign: "center",
        padding: "140px 24px 100px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 0,
          background: `
          radial-gradient(ellipse 70% 50% at 50% 0%, rgba(232,168,56,0.1) 0%, transparent 70%),
          radial-gradient(ellipse 50% 40% at 85% 85%, rgba(91,140,90,0.06) 0%, transparent 60%),
          radial-gradient(ellipse 30% 25% at 5% 70%, rgba(212,135,127,0.05) 0%, transparent 50%)
        `,
        }}
      />

      <div
        style={{
          position: "absolute",
          top: "12%",
          left: "8%",
          animation: "gentleFloat 8s ease-in-out infinite",
          zIndex: 0,
        }}
      >
        <svg width="60" height="60" viewBox="0 0 60 60" fill="none">
          <circle cx="30" cy="30" r="20" fill="#E8A838" opacity="0.08" />
          <circle cx="30" cy="30" r="8" fill="#E8A838" opacity="0.12" />
        </svg>
      </div>
      <div
        style={{
          position: "absolute",
          top: "30%",
          right: "6%",
          animation: "gentleFloat 10s ease-in-out infinite 2s",
          zIndex: 0,
        }}
      >
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
          <circle cx="20" cy="20" r="14" fill="#5B8C5A" opacity="0.07" />
          <circle cx="20" cy="20" r="5" fill="#5B8C5A" opacity="0.1" />
        </svg>
      </div>

      <div
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: 780,
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(30px)",
          transition: "all 0.9s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            background: "rgba(91, 140, 90, 0.08)",
            borderRadius: 100,
            padding: "7px 20px",
            marginBottom: 36,
            border: "1px solid rgba(91, 140, 90, 0.12)",
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "#5B8C5A",
              display: "inline-block",
            }}
          />
          <span
            style={{
              fontSize: 13,
              color: "#3D6B3D",
              fontFamily: "'Outfit', sans-serif",
              fontWeight: 500,
              letterSpacing: "0.02em",
            }}
          >
            Built for Australian Montessori Schools
          </span>
        </div>

        <h1
          className="hero-heading"
          style={{
            fontFamily: "'Fraunces', Georgia, serif",
            fontSize: "clamp(42px, 6.5vw, 72px)",
            color: "#2C1810",
            lineHeight: 1.06,
            fontWeight: 400,
            margin: "0 auto 28px",
            letterSpacing: "-0.03em",
          }}
        >
          Enter it once.{" "}
          <span
            style={{
              color: "#E8A838",
              textDecoration: "underline",
              textDecorationColor: "rgba(232, 168, 56, 0.3)",
              textUnderlineOffset: "6px",
              textDecorationThickness: "3px",
            }}
          >
            Use it everywhere.
          </span>
        </h1>

        <p
          style={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: "clamp(17px, 2vw, 20px)",
            color: "#6B5744",
            lineHeight: 1.65,
            maxWidth: 560,
            margin: "0 auto 44px",
          }}
        >
          WattleOS replaces the six platforms your school juggles with one that
          actually speaks Montessori. Observations, curriculum, enrolment, OSHC,
          communication - from first inquiry to graduation.
        </p>

        <div
          style={{
            display: "flex",
            gap: 14,
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <Link
            href="#demo"
            style={{
              background: "#2C1810",
              color: "#FEFCF6",
              borderRadius: 10,
              padding: "16px 36px",
              fontFamily: "'Outfit', sans-serif",
              fontSize: 16,
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Book a Demo
          </Link>
          <Link
            href="#features"
            style={{
              background: "transparent",
              color: "#2C1810",
              border: "1.5px solid rgba(44, 24, 16, 0.18)",
              borderRadius: 10,
              padding: "15px 36px",
              fontFamily: "'Outfit', sans-serif",
              fontSize: 16,
              fontWeight: 500,
              textDecoration: "none",
            }}
          >
            See What&apos;s Inside
          </Link>
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          bottom: 36,
          left: "50%",
          transform: "translateX(-50%)",
          animation: "scrollHint 2.5s ease-in-out infinite",
        }}
      >
        <svg width="20" height="28" viewBox="0 0 20 28" fill="none">
          <rect
            x="1"
            y="1"
            width="18"
            height="26"
            rx="9"
            stroke="#2C1810"
            strokeWidth="1.5"
            opacity="0.25"
          />
          <circle cx="10" cy="8" r="2" fill="#2C1810" opacity="0.3" />
        </svg>
      </div>
    </section>
  );
}

// ============================================================
// Problem - systems replaced
// ============================================================

function ProblemSection() {
  const reveal = useReveal();
  return (
    <section style={{ padding: "80px 24px 60px" }}>
      <div
        ref={reveal.ref}
        className={`section-reveal ${reveal.visible ? "visible" : ""}`}
        style={{ maxWidth: 900, margin: "0 auto", textAlign: "center" }}
      >
        <SectionLabel color="#C17D3A">The Problem</SectionLabel>
        <SectionHeading>
          Your school runs on{" "}
          <span style={{ color: "#C17D3A" }}>six different platforms</span> that
          don&apos;t talk to each other
        </SectionHeading>
        <SectionDescription maxWidth={600}>
          Every student entered into one system gets manually re-entered into
          five others. Every update risks something being missed. WattleOS
          replaces all of them.
        </SectionDescription>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            gap: 12,
            marginTop: 40,
          }}
        >
          {SYSTEMS_REPLACED.map((sys, i) => (
            <div
              key={i}
              style={{
                background: "rgba(44, 24, 16, 0.025)",
                borderRadius: 12,
                padding: "18px 20px",
                border: "1px solid rgba(44, 24, 16, 0.05)",
                textAlign: "left",
              }}
            >
              <p
                style={{
                  fontFamily: "'Outfit', sans-serif",
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#2C1810",
                  marginBottom: 2,
                  textDecoration: "line-through",
                  textDecorationColor: "rgba(193, 125, 58, 0.4)",
                }}
              >
                {sys.name}
              </p>
              <p
                style={{
                  fontFamily: "'Outfit', sans-serif",
                  fontSize: 12,
                  color: "#8B7355",
                  marginBottom: 6,
                }}
              >
                {sys.what}
              </p>
              <p
                style={{
                  fontFamily: "'Outfit', sans-serif",
                  fontSize: 11,
                  color: "#5B8C5A",
                  fontWeight: 600,
                }}
              >
                → {sys.module}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================
// Features - compact overview with 9 modules
// ============================================================

function FeaturesSection() {
  const reveal = useReveal();
  const features = [
    {
      icon: <IconObserve size={26} color="#E8A838" />,
      title: "Observations",
      desc: "30-second capture on iPad. Tag students, link outcomes, done.",
      color: "#E8A838",
    },
    {
      icon: <IconTree size={26} color="#5B8C5A" />,
      title: "Curriculum",
      desc: "AMI & AMS ages 0–18. EYLF and ACARA cross-mapped.",
      color: "#5B8C5A",
      link: "/wattleos/curriculum",
    },
    {
      icon: <IconMastery size={26} color="#C17D3A" />,
      title: "Mastery",
      desc: "Visual progression. Spot gaps, plan presentations.",
      color: "#C17D3A",
    },
    {
      icon: <IconShield size={26} color="#8B6F47" />,
      title: "Attendance & Safety",
      desc: "iPad roll call, medical alerts, pickup auth.",
      color: "#8B6F47",
    },
    {
      icon: <IconReport size={26} color="#D4877F" />,
      title: "Reports",
      desc: "Pull observations and mastery into term reports.",
      color: "#D4877F",
    },
    {
      icon: <IconFamily size={26} color="#5B8C5A" />,
      title: "Parent Portal",
      desc: "Portfolios, messaging, OSHC booking.",
      color: "#5B8C5A",
    },
    {
      icon: <IconEnroll size={26} color="#E8A838" />,
      title: "Enrolment",
      desc: "Public forms, waitlist, one-click approval.",
      color: "#E8A838",
    },
    {
      icon: <IconOSHC size={26} color="#C17D3A" />,
      title: "OSHC & Programs",
      desc: "Booking, check-in kiosk, session billing.",
      color: "#C17D3A",
    },
    {
      icon: <IconChat size={26} color="#8B6F47" />,
      title: "Community",
      desc: "Announcements, class chat, events, directory.",
      color: "#8B6F47",
    },
  ];

  return (
    <section id="features" style={{ padding: "80px 24px 100px" }}>
      <div
        ref={reveal.ref}
        className={`section-reveal ${reveal.visible ? "visible" : ""}`}
        style={{ maxWidth: 1100, margin: "0 auto" }}
      >
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <SectionLabel>The Complete Platform</SectionLabel>
          <SectionHeading>Everything a Montessori school needs</SectionHeading>
          <SectionDescription>
            Fourteen integrated modules. No feature gating. Every school gets
            the full platform.
          </SectionDescription>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(310px, 1fr))",
            gap: 16,
          }}
        >
          {features.map((f, i) => (
            <div
              key={i}
              className="hover-lift"
              style={{
                background: "#fff",
                border: "1px solid rgba(44, 24, 16, 0.05)",
                borderRadius: 14,
                padding: "26px 24px",
                display: "flex",
                gap: 16,
                alignItems: "flex-start",
                cursor: "default",
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 11,
                  flexShrink: 0,
                  background: `${f.color}0D`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {f.icon}
              </div>
              <div>
                <h3
                  style={{
                    fontFamily: "'Fraunces', Georgia, serif",
                    fontSize: 18,
                    color: "#2C1810",
                    fontWeight: 500,
                    marginBottom: 4,
                  }}
                >
                  {f.title}
                </h3>
                <p
                  style={{
                    fontFamily: "'Outfit', sans-serif",
                    fontSize: 14,
                    color: "#6B5744",
                    lineHeight: 1.55,
                    margin: 0,
                  }}
                >
                  {f.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
        <div style={{ textAlign: "center", marginTop: 32 }}>
          <Link
            href="/wattleos/curriculum"
            style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: 14,
              fontWeight: 600,
              color: "#5B8C5A",
              textDecoration: "none",
              borderBottom: "2px solid rgba(91, 140, 90, 0.3)",
              paddingBottom: 2,
            }}
          >
            Explore the full curriculum library →
          </Link>
        </div>
      </div>
    </section>
  );
}

// ============================================================
// Role Cards - link out to dedicated pages
// ============================================================

function RolesSection() {
  const reveal = useReveal();

  const roles = [
    {
      title: "For Guides",
      href: "/wattleos/for-guides",
      color: "#E8A838",
      desc: "Capture observations in 30 seconds. See mastery at a glance. Generate term reports from real data - not a blank page.",
      icon: <IconObserve size={28} color="#E8A838" />,
    },
    {
      title: "For Parents",
      href: "/wattleos/for-parents",
      color: "#5B8C5A",
      desc: "Living portfolios of your child's journey. Attendance updates, direct messaging, OSHC booking - all in one place.",
      icon: <IconFamily size={28} color="#5B8C5A" />,
    },
    {
      title: "For Staff",
      href: "/wattleos/for-staff",
      color: "#C17D3A",
      desc: "Roll call in seconds. Medical info at your fingertips. Timesheets that push straight to payroll. No spreadsheets.",
      icon: <IconShield size={28} color="#C17D3A" />,
    },
    {
      title: "For Administrators",
      href: "/wattleos/for-admin",
      color: "#8B6F47",
      desc: "Enrolment pipeline, billing, compliance reporting, and granular permissions. Your school's operating system.",
      icon: <IconBilling size={28} color="#8B6F47" />,
    },
  ];

  return (
    <section
      style={{
        padding: "80px 24px 100px",
        background: "linear-gradient(180deg, #FEFCF6 0%, #FAF5EA 100%)",
      }}
    >
      <div
        ref={reveal.ref}
        className={`section-reveal ${reveal.visible ? "visible" : ""}`}
        style={{ maxWidth: 1000, margin: "0 auto" }}
      >
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <SectionLabel color="#8B6F47">Built for Every Role</SectionLabel>
          <SectionHeading>Who is WattleOS for?</SectionHeading>
        </div>
        <div
          className="desktop-two-col"
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}
        >
          {roles.map((r, i) => (
            <Link
              key={i}
              href={r.href}
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <div
                className="hover-lift"
                style={{
                  background: "#fff",
                  borderRadius: 18,
                  padding: "32px 30px",
                  border: "1px solid rgba(44, 24, 16, 0.05)",
                  height: "100%",
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 14,
                    background: `${r.color}0D`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 18,
                  }}
                >
                  {r.icon}
                </div>
                <h3
                  style={{
                    fontFamily: "'Fraunces', Georgia, serif",
                    fontSize: 22,
                    color: "#2C1810",
                    fontWeight: 500,
                    marginBottom: 10,
                  }}
                >
                  {r.title}
                </h3>
                <p
                  style={{
                    fontFamily: "'Outfit', sans-serif",
                    fontSize: 15,
                    color: "#6B5744",
                    lineHeight: 1.6,
                    marginBottom: 16,
                  }}
                >
                  {r.desc}
                </p>
                <span
                  style={{
                    fontFamily: "'Outfit', sans-serif",
                    fontSize: 14,
                    fontWeight: 600,
                    color: r.color,
                  }}
                >
                  Learn more →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================
// Pricing - Interactive Calculator
// ============================================================

function PricingSection() {
  const [studentCount, setStudentCount] = useState(60);
  const [annual, setAnnual] = useState(false);
  const reveal = useReveal();

  const perStudent = annual ? 7 : 8;
  const floor = 199;
  const monthlyPrice = Math.max(studentCount * perStudent, floor);
  const savings = annual ? studentCount * 12 : 0;

  return (
    <section id="pricing" style={{ padding: "100px 24px" }}>
      <div
        ref={reveal.ref}
        className={`section-reveal ${reveal.visible ? "visible" : ""}`}
        style={{ maxWidth: 1000, margin: "0 auto" }}
      >
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <SectionLabel>Transparent Pricing</SectionLabel>
          <SectionHeading>One price. Everything included.</SectionHeading>
          <SectionDescription maxWidth={500}>
            No feature tiers. No hidden costs. Every school gets every module.
            Pricing scales simply with your student count.
          </SectionDescription>
        </div>

        <div
          style={{
            background: "#fff",
            borderRadius: 24,
            padding: "48px 44px",
            border: "1px solid rgba(232, 168, 56, 0.1)",
            maxWidth: 800,
            margin: "0 auto 40px",
            boxShadow: "0 8px 40px rgba(44, 24, 16, 0.04)",
          }}
        >
          {/* Toggle */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginBottom: 40,
            }}
          >
            <div
              style={{
                display: "flex",
                background: "rgba(44, 24, 16, 0.04)",
                borderRadius: 10,
                padding: 4,
              }}
            >
              {[
                { label: "Monthly", isAnnual: false },
                { label: "Annual", isAnnual: true },
              ].map((opt) => (
                <button
                  key={opt.label}
                  onClick={() => setAnnual(opt.isAnnual)}
                  style={{
                    background:
                      annual === opt.isAnnual ? "#fff" : "transparent",
                    border: "none",
                    borderRadius: 8,
                    padding: "10px 24px",
                    fontFamily: "'Outfit', sans-serif",
                    fontSize: 14,
                    fontWeight: annual === opt.isAnnual ? 600 : 400,
                    color: annual === opt.isAnnual ? "#2C1810" : "#8B7355",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    boxShadow:
                      annual === opt.isAnnual
                        ? "0 2px 8px rgba(0,0,0,0.06)"
                        : "none",
                  }}
                >
                  {opt.label}
                  {opt.isAnnual && (
                    <span
                      style={{
                        marginLeft: 8,
                        background: "#5B8C5A",
                        color: "#fff",
                        fontSize: 11,
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: 100,
                      }}
                    >
                      SAVE
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div
            className="pricing-calc-layout"
            style={{ display: "flex", gap: 48, alignItems: "center" }}
          >
            <div style={{ flex: 1 }}>
              <label
                style={{
                  fontFamily: "'Outfit', sans-serif",
                  fontSize: 14,
                  fontWeight: 500,
                  color: "#5C4A32",
                  display: "block",
                  marginBottom: 12,
                }}
              >
                How many students at your school?
              </label>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  marginBottom: 8,
                }}
              >
                <input
                  type="range"
                  min={10}
                  max={300}
                  step={5}
                  value={studentCount}
                  onChange={(e) => setStudentCount(Number(e.target.value))}
                  style={{
                    flex: 1,
                    height: 6,
                    appearance: "none",
                    background: `linear-gradient(to right, #E8A838 ${((studentCount - 10) / 290) * 100}%, rgba(44,24,16,0.08) ${((studentCount - 10) / 290) * 100}%)`,
                    borderRadius: 100,
                    outline: "none",
                    cursor: "pointer",
                    accentColor: "#E8A838",
                  }}
                />
                <span
                  style={{
                    fontFamily: "'Fraunces', Georgia, serif",
                    fontSize: 28,
                    color: "#2C1810",
                    fontWeight: 600,
                    minWidth: 60,
                    textAlign: "right",
                  }}
                >
                  {studentCount}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontFamily: "'Outfit', sans-serif",
                  fontSize: 12,
                  color: "#8B7355",
                }}
              >
                <span>10 students</span>
                <span>300 students</span>
              </div>
            </div>

            <div
              style={{
                textAlign: "center",
                minWidth: 220,
                padding: "32px 28px",
                background: "rgba(232, 168, 56, 0.04)",
                borderRadius: 16,
              }}
            >
              <p
                style={{
                  fontFamily: "'Outfit', sans-serif",
                  fontSize: 13,
                  color: "#8B7355",
                  marginBottom: 8,
                  fontWeight: 500,
                }}
              >
                {annual ? "Monthly (billed annually)" : "Monthly"}
              </p>
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "center",
                  gap: 4,
                }}
              >
                <span
                  style={{
                    fontFamily: "'Outfit', sans-serif",
                    fontSize: 22,
                    color: "#8B7355",
                  }}
                >
                  $
                </span>
                <span
                  style={{
                    fontFamily: "'Fraunces', Georgia, serif",
                    fontSize: 52,
                    color: "#2C1810",
                    fontWeight: 600,
                    lineHeight: 1,
                  }}
                >
                  {monthlyPrice}
                </span>
              </div>
              <p
                style={{
                  fontFamily: "'Outfit', sans-serif",
                  fontSize: 13,
                  color: "#8B7355",
                  marginTop: 6,
                }}
              >
                ${perStudent}/student/month
              </p>
              {annual && savings > 0 && (
                <p
                  style={{
                    fontFamily: "'Outfit', sans-serif",
                    fontSize: 13,
                    color: "#5B8C5A",
                    fontWeight: 600,
                    marginTop: 8,
                  }}
                >
                  Save ${savings}/year
                </p>
              )}
              {studentCount * perStudent < floor && (
                <p
                  style={{
                    fontFamily: "'Outfit', sans-serif",
                    fontSize: 12,
                    color: "#C17D3A",
                    marginTop: 6,
                    fontStyle: "italic",
                  }}
                >
                  ${floor}/mo minimum applies
                </p>
              )}
            </div>
          </div>

          <div
            style={{
              marginTop: 32,
              paddingTop: 28,
              borderTop: "1px solid rgba(44, 24, 16, 0.06)",
              textAlign: "center",
            }}
          >
            <p
              style={{
                fontFamily: "'Outfit', sans-serif",
                fontSize: 14,
                color: "#6B5744",
                lineHeight: 1.6,
              }}
            >
              <strong style={{ color: "#2C1810" }}>
                $499 one-time onboarding
              </strong>{" "}
              - curriculum setup, school configuration, and a training session
              for your team.
            </p>
          </div>
        </div>

        {/* All features */}
        <div
          style={{
            background: "#fff",
            border: "1px solid rgba(44, 24, 16, 0.06)",
            borderRadius: 16,
            padding: "36px 40px",
            maxWidth: 800,
            margin: "0 auto",
          }}
        >
          <h4
            style={{
              fontFamily: "'Fraunces', Georgia, serif",
              fontSize: 20,
              color: "#2C1810",
              fontWeight: 500,
              marginBottom: 24,
              textAlign: "center",
            }}
          >
            Everything included. Always.
          </h4>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
              gap: "10px 28px",
            }}
          >
            {ALL_FEATURES.map((f, i) => (
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
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="8" fill="rgba(91, 140, 90, 0.1)" />
                  <path
                    d="M5 8l2 2 4-4"
                    stroke="#5B8C5A"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                {f}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================================
// Demo Form
// ============================================================

function DemoSection() {
  const [formState, setFormState] = useState<Record<FormField, string>>({
    name: "",
    school: "",
    email: "",
    phone: "",
    students: "",
    role: "",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const reveal = useReveal();

  const handleChange = (field: FormField, value: string) =>
    setFormState((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = () => {
    const subject = encodeURIComponent(
      `WattleOS Demo Request - ${formState.school || "New School"}`,
    );
    const body = encodeURIComponent(
      `Name: ${formState.name}\nSchool: ${formState.school}\nEmail: ${formState.email}\nPhone: ${formState.phone}\nStudent Count: ${formState.students}\nRole: ${formState.role}\n\nMessage:\n${formState.message}`,
    );
    window.open(
      `mailto:hello@wattleos.au?subject=${subject}&body=${body}`,
      "_self",
    );
    setSubmitted(true);
  };

  const inputStyle = {
    width: "100%",
    padding: "13px 16px",
    border: "1.5px solid rgba(44, 24, 16, 0.1)",
    borderRadius: 10,
    fontFamily: "'Outfit', sans-serif",
    fontSize: 15,
    color: "#2C1810",
    background: "#FEFCF6",
    outline: "none",
    transition: "border-color 0.2s",
    boxSizing: "border-box" as const,
  };
  const labelStyle = {
    display: "block" as const,
    fontFamily: "'Outfit', sans-serif",
    fontSize: 13,
    fontWeight: 500,
    color: "#5C4A32",
    marginBottom: 6,
  };

  if (submitted) {
    return (
      <section id="demo" style={{ padding: "100px 24px" }}>
        <div
          style={{
            maxWidth: 600,
            margin: "0 auto",
            textAlign: "center",
            background: "#fff",
            borderRadius: 20,
            padding: 60,
            border: "1px solid rgba(91, 140, 90, 0.15)",
          }}
        >
          <WattleLogo size={56} />
          <h3
            style={{
              fontFamily: "'Fraunces', Georgia, serif",
              fontSize: 28,
              color: "#2C1810",
              fontWeight: 400,
              margin: "20px 0 12px",
            }}
          >
            Thank you!
          </h3>
          <p
            style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: 16,
              color: "#6B5744",
              lineHeight: 1.6,
            }}
          >
            Your email client should have opened with your demo request. If not,
            email us at{" "}
            <a
              href="mailto:hello@wattleos.au"
              style={{
                color: "#E8A838",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              hello@wattleos.au
            </a>
          </p>
          <button
            onClick={() => setSubmitted(false)}
            style={{
              marginTop: 24,
              background: "none",
              border: "1.5px solid rgba(44, 24, 16, 0.15)",
              borderRadius: 8,
              padding: "10px 24px",
              fontFamily: "'Outfit', sans-serif",
              fontSize: 14,
              color: "#5C4A32",
              cursor: "pointer",
            }}
          >
            ← Back to form
          </button>
        </div>
      </section>
    );
  }

  return (
    <section
      id="demo"
      style={{
        padding: "100px 24px",
        background: "linear-gradient(180deg, #FAF5EA 0%, #FEFCF6 100%)",
      }}
    >
      <div
        ref={reveal.ref}
        className={`section-reveal ${reveal.visible ? "visible" : ""}`}
        style={{ maxWidth: 640, margin: "0 auto" }}
      >
        <div style={{ textAlign: "center", marginBottom: 44 }}>
          <SectionLabel color="#5B8C5A">Get Started</SectionLabel>
          <SectionHeading>Book a personalised demo</SectionHeading>
          <SectionDescription>
            We&apos;ll walk you through WattleOS with your school&apos;s
            curriculum, class structure, and actual workflow.
          </SectionDescription>
        </div>

        <div
          style={{
            background: "#fff",
            borderRadius: 20,
            padding: "40px 36px",
            border: "1px solid rgba(232, 168, 56, 0.1)",
            boxShadow: "0 8px 32px rgba(44, 24, 16, 0.03)",
          }}
        >
          <div
            className="desktop-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 16,
              marginBottom: 16,
            }}
          >
            {[
              {
                field: "name" as FormField,
                label: "Your Name *",
                type: "text",
                ph: "Jane Smith",
              },
              {
                field: "school" as FormField,
                label: "School Name *",
                type: "text",
                ph: "Banksia Montessori",
              },
              {
                field: "email" as FormField,
                label: "Email *",
                type: "email",
                ph: "jane@banksia.edu.au",
              },
              {
                field: "phone" as FormField,
                label: "Phone",
                type: "tel",
                ph: "04XX XXX XXX",
              },
            ].map((inp) => (
              <div key={inp.field}>
                <label style={labelStyle}>{inp.label}</label>
                <input
                  type={inp.type}
                  placeholder={inp.ph}
                  value={formState[inp.field]}
                  onChange={(e) => handleChange(inp.field, e.target.value)}
                  style={inputStyle}
                  onFocus={(e) =>
                    (e.currentTarget.style.borderColor = "#E8A838")
                  }
                  onBlur={(e) =>
                    (e.currentTarget.style.borderColor =
                      "rgba(44, 24, 16, 0.1)")
                  }
                />
              </div>
            ))}
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Your Role</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {[
                "Head of School",
                "Guide / Teacher",
                "Administrator",
                "Parent",
                "Other",
              ].map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => handleChange("role", opt)}
                  style={{
                    background: formState.role === opt ? "#E8A838" : "#FEFCF6",
                    color: formState.role === opt ? "#2C1810" : "#5C4A32",
                    border: `1.5px solid ${formState.role === opt ? "#E8A838" : "rgba(44, 24, 16, 0.1)"}`,
                    borderRadius: 8,
                    padding: "8px 18px",
                    fontFamily: "'Outfit', sans-serif",
                    fontSize: 13,
                    cursor: "pointer",
                    fontWeight: formState.role === opt ? 600 : 400,
                  }}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Approximate Student Count</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {["Under 30", "30–80", "80–150", "150+"].map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => handleChange("students", opt)}
                  style={{
                    background:
                      formState.students === opt ? "#E8A838" : "#FEFCF6",
                    color: formState.students === opt ? "#2C1810" : "#5C4A32",
                    border: `1.5px solid ${formState.students === opt ? "#E8A838" : "rgba(44, 24, 16, 0.1)"}`,
                    borderRadius: 8,
                    padding: "8px 18px",
                    fontFamily: "'Outfit', sans-serif",
                    fontSize: 13,
                    cursor: "pointer",
                    fontWeight: formState.students === opt ? 600 : 400,
                  }}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={labelStyle}>Anything else?</label>
            <textarea
              placeholder="Tell us about your school, what you're currently using, or what's not working..."
              value={formState.message}
              onChange={(e) => handleChange("message", e.target.value)}
              rows={4}
              style={{ ...inputStyle, resize: "vertical" as const }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#E8A838")}
              onBlur={(e) =>
                (e.currentTarget.style.borderColor = "rgba(44, 24, 16, 0.1)")
              }
            />
          </div>
          <button
            type="button"
            onClick={handleSubmit}
            style={{
              width: "100%",
              background: "#2C1810",
              color: "#FEFCF6",
              border: "none",
              borderRadius: 10,
              padding: "16px 24px",
              fontFamily: "'Outfit', sans-serif",
              fontSize: 16,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Request a Demo
          </button>
          <p
            style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: 13,
              color: "#8B7355",
              textAlign: "center",
              marginTop: 16,
            }}
          >
            Or email us directly at{" "}
            <a
              href="mailto:hello@wattleos.au"
              style={{
                color: "#E8A838",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              hello@wattleos.au
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}

// ============================================================
// Main Page
// ============================================================

export default function WattleOSMarketing() {
  return (
    <MarketingShell>
      <MarketingNav />
      <HeroSection />
      <ProblemSection />
      <FeaturesSection />
      <RolesSection />
      <PricingSection />
      <DemoSection />
      <MarketingFooter />
    </MarketingShell>
  );
}
