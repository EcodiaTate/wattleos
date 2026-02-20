"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MarketingFooter, MarketingNav, MarketingShell } from "../../page";

// ============================================================
// Types
// ============================================================

interface DetailFeature {
  icon: string;
  title: string;
  desc: string;
  detail: string;
}

interface ComplianceItem {
  framework: string;
  desc: string;
  tag: string;
}

// ============================================================
// Data
// ============================================================

const HERO_COLOR = "#8B6F47";

const FEATURES: DetailFeature[] = [
  {
    icon: "🏫",
    title: "Multi-Campus Dashboard",
    desc: "One login, every campus, full visibility.",
    detail:
      "Manage multiple campuses from a single admin panel. View attendance across sites, compare enrollment numbers, and push policy changes school-wide. Each campus maintains its own data isolation while you get the aggregate view you need for strategic decisions.",
  },
  {
    icon: "💰",
    title: "Billing & Invoicing",
    desc: "Stripe-powered payments with CCS integration.",
    detail:
      "Automated fee schedules, recurring invoices, and online payment processing through Stripe. CCS (Child Care Subsidy) claims are tracked and reconciled. Parents pay on time because the process is frictionless. You spend less time chasing overdue accounts.",
  },
  {
    icon: "📊",
    title: "Compliance Reporting",
    desc: "NQS, EYLF, QCAA — audit-ready at all times.",
    detail:
      "Attendance records, staff-to-child ratios, curriculum coverage, and learning outcomes are all tracked continuously. When an assessor visits, you don't need to compile anything — the data is already structured, timestamped, and exportable. Cross-mapping between Montessori curriculum and national frameworks happens automatically.",
  },
  {
    icon: "🔐",
    title: "Role-Based Permissions",
    desc: "Everyone sees exactly what they need, nothing more.",
    detail:
      "Define custom roles with granular permissions down to individual actions. Guides access pedagogy tools, office staff handle admin functions, parents see only their children. New staff get the right access on day one. Departing staff are cleanly offboarded.",
  },
  {
    icon: "👥",
    title: "Enrollment Pipeline",
    desc: "Waitlist to first day, managed end-to-end.",
    detail:
      "Track every family from initial inquiry through tour, offer, acceptance, and enrolment. Automated stage transitions, email templates, and document collection reduce your administrative overhead. See conversion rates and demand by program to inform capacity planning.",
  },
  {
    icon: "📈",
    title: "Analytics & Insights",
    desc: "Data-driven decisions about your school's future.",
    detail:
      "Enrollment trends, attendance patterns, staff utilisation, revenue forecasting, and program demand — all visualised in dashboards designed for school leaders. Export any report to PDF or CSV for board meetings and grant applications.",
  },
];

const COMPLIANCE: ComplianceItem[] = [
  {
    framework: "NQS",
    desc: "National Quality Standard tracking across all 7 quality areas",
    tag: "Quality",
  },
  {
    framework: "EYLF",
    desc: "Early Years Learning Framework outcome mapping",
    tag: "Curriculum",
  },
  {
    framework: "QCAA",
    desc: "Queensland Curriculum and Assessment Authority alignment",
    tag: "Assessment",
  },
  {
    framework: "CCS",
    desc: "Child Care Subsidy claims processing and reconciliation",
    tag: "Billing",
  },
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
            radial-gradient(ellipse 70% 50% at 30% 20%, rgba(139,111,71,0.10) 0%, transparent 60%),
            radial-gradient(ellipse 50% 40% at 80% 70%, rgba(139,111,71,0.06) 0%, transparent 50%)
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
            For Administrators
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
          Your school&apos;s
          <br />
          <span style={{ color: HERO_COLOR }}>operating system</span>
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
          Enrollment, billing, compliance, staff management, and reporting —
          everything a school administrator needs, unified in one platform that
          understands Montessori.
        </p>

        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
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
          <Link
            href="/wattleos#pricing"
            style={{
              display: "inline-block",
              background: "transparent",
              color: "#2C1810",
              border: "2px solid rgba(44, 24, 16, 0.2)",
              borderRadius: 10,
              padding: "14px 36px",
              fontFamily: "'Outfit', sans-serif",
              fontSize: 16,
              fontWeight: 500,
              textDecoration: "none",
              letterSpacing: "0.02em",
            }}
          >
            See Pricing →
          </Link>
        </div>
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
          Everything You Need to Run a School
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
          Built for the complexity of school leadership
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

function ComplianceSection() {
  return (
    <section
      style={{
        padding: "80px 24px",
        background: "linear-gradient(180deg, #FEFBF3 0%, #F8F1E4 100%)",
      }}
    >
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <p
            style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: 13,
              fontWeight: 600,
              color: "#5B8C5A",
              textTransform: "uppercase",
              letterSpacing: "0.12em",
              marginBottom: 12,
            }}
          >
            Australian Compliance
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
            Always audit-ready, never scrambling
          </h2>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: 20,
          }}
        >
          {COMPLIANCE.map((c: ComplianceItem, i: number) => (
            <div
              key={i}
              style={{
                background: "#fff",
                borderRadius: 14,
                padding: 28,
                border: "1px solid rgba(232, 168, 56, 0.1)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 12,
                }}
              >
                <h4
                  style={{
                    fontFamily: "'DM Serif Display', Georgia, serif",
                    fontSize: 24,
                    color: "#2C1810",
                    fontWeight: 400,
                    margin: 0,
                  }}
                >
                  {c.framework}
                </h4>
                <span
                  style={{
                    fontFamily: "'Outfit', sans-serif",
                    fontSize: 11,
                    fontWeight: 600,
                    color: HERO_COLOR,
                    background: `${HERO_COLOR}15`,
                    padding: "4px 10px",
                    borderRadius: 100,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  {c.tag}
                </span>
              </div>
              <p
                style={{
                  fontFamily: "'Outfit', sans-serif",
                  fontSize: 14,
                  color: "#6B5744",
                  lineHeight: 1.6,
                  margin: 0,
                }}
              >
                {c.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SecuritySection() {
  const items: { title: string; desc: string }[] = [
    {
      title: "Row-Level Security",
      desc: "Every database query is tenant-isolated at the Postgres level. Schools can never see each other's data.",
    },
    {
      title: "Encrypted at Rest & Transit",
      desc: "All data encrypted with AES-256 at rest and TLS 1.3 in transit. Hosted on Australian infrastructure.",
    },
    {
      title: "Granular Audit Trails",
      desc: "Every data mutation is logged with timestamp, user, and action. Full accountability for sensitive operations.",
    },
    {
      title: "SOC 2 Infrastructure",
      desc: "Built on Supabase and Vercel — both SOC 2 Type II compliant. Your data lives on enterprise-grade infrastructure.",
    },
  ];

  return (
    <section style={{ padding: "80px 24px", maxWidth: 900, margin: "0 auto" }}>
      <div style={{ textAlign: "center", marginBottom: 48 }}>
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
          Data Security
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
          Security you can explain to parents
        </h2>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 20,
        }}
      >
        {items.map((item, i: number) => (
          <div
            key={i}
            style={{
              background: "#FEFBF3",
              borderRadius: 14,
              padding: 28,
              border: "1px solid rgba(232, 168, 56, 0.12)",
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "#5B8C5A15",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 14,
                fontSize: 16,
              }}
            >
              🔒
            </div>
            <h4
              style={{
                fontFamily: "'DM Serif Display', Georgia, serif",
                fontSize: 18,
                color: "#2C1810",
                fontWeight: 400,
                marginBottom: 6,
              }}
            >
              {item.title}
            </h4>
            <p
              style={{
                fontFamily: "'Outfit', sans-serif",
                fontSize: 14,
                color: "#6B5744",
                lineHeight: 1.6,
                margin: 0,
              }}
            >
              {item.desc}
            </p>
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
          Run your school like it&apos;s 2026
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
          See WattleOS in action with a personalised demo for your school.
        </p>
        <Link
          href="/wattleos#contact"
          style={{
            display: "inline-block",
            background: "#E8A838",
            color: "#2C1810",
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

export default function ForAdminPage() {
  return (
    <MarketingShell>
      <MarketingNav />
      <HeroBanner />
      <FeatureDeepDive />
      <ComplianceSection />
      <SecuritySection />
      <CTABanner />
      <MarketingFooter />
    </MarketingShell>
  );
}
