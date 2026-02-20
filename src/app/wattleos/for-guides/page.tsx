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

interface Testimonial {
  quote: string;
  name: string;
  role: string;
  school: string;
}

// ============================================================
// Data
// ============================================================

const HERO_COLOR = "#E8A838";

const FEATURES: DetailFeature[] = [
  {
    icon: "📸",
    title: "30-Second Observations",
    desc: "From sighting to saved record in under half a minute.",
    detail:
      "Tap the capture button on your iPad, snap a photo of the learning moment, tag the students involved, link the relevant curriculum node, and add a quick note. WattleOS auto-timestamps, auto-links to the child's portfolio, and flags mastery progression. No paperwork, no end-of-day data entry.",
  },
  {
    icon: "🌿",
    title: "Montessori Curriculum Tree",
    desc: "AMI 3–6 built in. Your shelves, your materials, your language.",
    detail:
      "Navigate a visual curriculum tree that mirrors how your classroom is actually organised — Practical Life, Sensorial, Language, Mathematics, Culture. Each node maps to specific materials and presentations. When you tag an observation, you're building a real picture of each child's journey through the curriculum.",
  },
  {
    icon: "📊",
    title: "Mastery Dashboard",
    desc: "See every child's progression at a glance.",
    detail:
      "A colour-coded grid shows you who has been introduced to what, who is practising, and who has mastered each area. Spot the child who hasn't been presented new Sensorial work in weeks. Notice the one who's ready to move from concrete to abstract in Mathematics. Let the data inform your planning without replacing your intuition.",
  },
  {
    icon: "📝",
    title: "Reports That Build Themselves",
    desc: "Term reports pre-populated from your observation data.",
    detail:
      "When report time comes, WattleOS pulls your observations, mastery records, and attendance data into a structured template. You review, add your personal insights, and publish. What used to take an entire weekend now takes an afternoon. Parents receive rich, evidence-based reports instead of generic comments.",
  },
  {
    icon: "🔗",
    title: "EYLF & QCAA Cross-Mapping",
    desc: "Australian compliance without extra work.",
    detail:
      "Every Montessori curriculum node is cross-mapped to EYLF outcomes and QCAA standards. When you record an observation against a Montessori material, the compliance mapping happens automatically. Auditors get the data they need; you never have to think about it.",
  },
  {
    icon: "🤝",
    title: "Collaborative Planning",
    desc: "Share observations across your teaching team.",
    detail:
      "Co-guides and assistants can all contribute observations for the same children. The curriculum dashboard aggregates everyone's input, giving the lead guide a complete picture. No more comparing notebooks at the end of the week.",
  },
];

const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      "I used to spend my Sunday afternoons entering observation notes into spreadsheets. Now I capture everything during the work cycle and my weekends are mine again.",
    name: "Sarah M.",
    role: "Lead Guide, 3–6 Classroom",
    school: "Sunshine Coast Montessori",
  },
  {
    quote:
      "The curriculum tree finally speaks our language. I don't have to translate Montessori into generic learning outcomes — it just works the way we actually teach.",
    name: "Tom K.",
    role: "Guide, 6–9 Classroom",
    school: "Brisbane Montessori School",
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
            radial-gradient(ellipse 70% 50% at 30% 20%, rgba(232,168,56,0.15) 0%, transparent 60%),
            radial-gradient(ellipse 50% 40% at 80% 70%, rgba(232,168,56,0.08) 0%, transparent 50%)
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
            For Guides
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
          Capture learning moments,
          <br />
          <span style={{ color: HERO_COLOR }}>not paperwork</span>
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
          WattleOS is built around the way Montessori guides actually work.
          Observe, record, track mastery — all from your iPad, all in the flow
          of your day. Spend your energy on children, not data entry.
        </p>

        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <Link
            href="/wattleos#contact"
            style={{
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
          How It Works for Guides
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
          Every feature, designed for the prepared environment
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

function DayInTheLife() {
  const steps: { time: string; action: string; detail: string }[] = [
    {
      time: "8:30 AM",
      action: "Morning set-up",
      detail:
        "Glance at your dashboard to see yesterday's observations and any flagged follow-ups. Note which children haven't had a presentation recorded recently.",
    },
    {
      time: "9:00 AM",
      action: "Work cycle begins",
      detail:
        "As children settle into their work, you circulate. You notice Mila choosing the pink tower independently for the first time — tap, snap, tag, done. 15 seconds.",
    },
    {
      time: "10:30 AM",
      action: "Small group presentation",
      detail:
        "You present the stamp game to three children. Afterwards, record a group observation linking all three students and the Mathematics > Operations node.",
    },
    {
      time: "12:00 PM",
      action: "Lunch break",
      detail:
        "Your co-guide recorded four observations during the morning. You can see them all in the shared dashboard — no need to debrief over sandwich crumbs.",
    },
    {
      time: "3:00 PM",
      action: "End of day",
      detail:
        "Zero data entry backlog. Your observations are recorded, mastery is updated, and parent portfolios are current. You go home on time.",
    },
  ];

  return (
    <section
      style={{
        padding: "80px 24px",
        background: "linear-gradient(180deg, #FEFBF3 0%, #F8F1E4 100%)",
      }}
    >
      <div style={{ maxWidth: 700, margin: "0 auto" }}>
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
            A Day with WattleOS
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
            What your day actually looks like
          </h2>
        </div>

        <div style={{ position: "relative", paddingLeft: 40 }}>
          {/* Timeline line */}
          <div
            style={{
              position: "absolute",
              left: 15,
              top: 8,
              bottom: 8,
              width: 2,
              background: `linear-gradient(to bottom, ${HERO_COLOR}, #5B8C5A)`,
              borderRadius: 1,
            }}
          />

          {steps.map((step, i: number) => (
            <div key={i} style={{ position: "relative", marginBottom: 32 }}>
              {/* Timeline dot */}
              <div
                style={{
                  position: "absolute",
                  left: -33,
                  top: 6,
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  background: HERO_COLOR,
                  border: "3px solid #FEFBF3",
                  boxShadow: `0 0 0 2px ${HERO_COLOR}40`,
                }}
              />

              <p
                style={{
                  fontFamily: "'Outfit', sans-serif",
                  fontSize: 12,
                  fontWeight: 600,
                  color: HERO_COLOR,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  marginBottom: 4,
                }}
              >
                {step.time}
              </p>
              <h4
                style={{
                  fontFamily: "'DM Serif Display', Georgia, serif",
                  fontSize: 20,
                  color: "#2C1810",
                  fontWeight: 400,
                  marginBottom: 6,
                }}
              >
                {step.action}
              </h4>
              <p
                style={{
                  fontFamily: "'Outfit', sans-serif",
                  fontSize: 15,
                  color: "#6B5744",
                  lineHeight: 1.6,
                  margin: 0,
                }}
              >
                {step.detail}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TestimonialSection() {
  return (
    <section style={{ padding: "80px 24px", maxWidth: 900, margin: "0 auto" }}>
      <div style={{ textAlign: "center", marginBottom: 48 }}>
        <h2
          style={{
            fontFamily: "'DM Serif Display', Georgia, serif",
            fontSize: "clamp(28px, 3.5vw, 42px)",
            color: "#2C1810",
            fontWeight: 400,
            letterSpacing: "-0.02em",
          }}
        >
          What guides are saying
        </h2>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: 24,
        }}
      >
        {TESTIMONIALS.map((t: Testimonial, i: number) => (
          <div
            key={i}
            style={{
              background: "#fff",
              borderRadius: 16,
              padding: 32,
              border: "1px solid rgba(232, 168, 56, 0.1)",
            }}
          >
            <div style={{ fontSize: 32, marginBottom: 16, color: HERO_COLOR }}>
              &ldquo;
            </div>
            <p
              style={{
                fontFamily: "'Outfit', sans-serif",
                fontSize: 15,
                color: "#5C4A32",
                lineHeight: 1.7,
                marginBottom: 24,
                fontStyle: "italic",
              }}
            >
              {t.quote}
            </p>
            <div>
              <p
                style={{
                  fontFamily: "'Outfit', sans-serif",
                  fontSize: 15,
                  color: "#2C1810",
                  fontWeight: 600,
                  margin: 0,
                }}
              >
                {t.name}
              </p>
              <p
                style={{
                  fontFamily: "'Outfit', sans-serif",
                  fontSize: 13,
                  color: "#8B7355",
                  margin: 0,
                }}
              >
                {t.role} · {t.school}
              </p>
            </div>
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
          Ready to reclaim your weekends?
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
          Book a demo and we&apos;ll show you how WattleOS fits into your
          prepared environment.
        </p>
        <Link
          href="/wattleos#contact"
          style={{
            display: "inline-block",
            background: HERO_COLOR,
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

export default function ForGuidesPage() {
  return (
    <MarketingShell>
      <MarketingNav />
      <HeroBanner />
      <FeatureDeepDive />
      <DayInTheLife />
      <TestimonialSection />
      <CTABanner />
      <MarketingFooter />
    </MarketingShell>
  );
}
