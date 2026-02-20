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
  detail: string;
}

// ============================================================
// Data
// ============================================================

const HERO_COLOR = "#5B8C5A";

const FEATURES: DetailFeature[] = [
  {
    icon: "📖",
    title: "Living Portfolios",
    desc: "A real picture of your child's learning, not just a report card.",
    detail:
      "See timestamped observations with photos showing your child engaged in their work. Watch their mastery progression across the Montessori curriculum — from being introduced to a material, through practice, to full mastery. This isn't a generic progress report — it's a window into what your child actually does each day.",
  },
  {
    icon: "✅",
    title: "Attendance Notifications",
    desc: "Know your child arrived safely, every morning.",
    detail:
      "Receive a notification when your child is checked in each morning. If they're marked absent and you haven't notified the school, you'll get an alert. Emergency contacts, authorised pickups, and medical information are always current and accessible to staff.",
  },
  {
    icon: "💬",
    title: "Direct Messaging",
    desc: "Talk to your child's guide without playing phone tag.",
    detail:
      "Send a message to your child's classroom guide, receive school-wide announcements, and RSVP to events — all in one place. No more notes lost in schoolbags, no more missed emails buried in your inbox. Communication that actually reaches you.",
  },
  {
    icon: "📋",
    title: "Digital Enrolment",
    desc: "From waitlist to first day, managed online.",
    detail:
      "Submit your enrolment application, upload required documents, track your application status, and complete all onboarding forms digitally. When your child is accepted, medical forms, emergency contacts, and consent forms are all handled through the portal.",
  },
  {
    icon: "📄",
    title: "Term Reports",
    desc: "Rich, evidence-based reports with real observations.",
    detail:
      "Instead of generic comments, your child's term report includes actual observations from their guide, linked to specific curriculum areas. See what they've been working on, where they've grown, and what's coming next — backed by real evidence from the classroom.",
  },
  {
    icon: "📅",
    title: "School Calendar & Events",
    desc: "Never miss a sports day, excursion, or parent evening.",
    detail:
      "View the school calendar, RSVP to events, receive reminders before important dates, and see your child's specific schedule including any extended day or extracurricular programs they're booked into.",
  },
];

const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      "For the first time I actually understand what my daughter does at school. The photos of her working with the golden beads — I could see her concentrating, I could see her learning. A report card never did that.",
    name: "Michelle R.",
    detail: "Parent of a 4-year-old, Gold Coast Montessori",
  },
  {
    quote:
      "I love that I get a notification when he's checked in each morning. And being able to message his guide directly instead of writing notes that never make it home — game changer.",
    name: "David L.",
    detail: "Parent of two, Bayside Montessori",
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
            radial-gradient(ellipse 70% 50% at 30% 20%, rgba(91,140,90,0.12) 0%, transparent 60%),
            radial-gradient(ellipse 50% 40% at 80% 70%, rgba(91,140,90,0.08) 0%, transparent 50%)
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
            For Parents
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
          See what your child
          <br />
          <span style={{ color: HERO_COLOR }}>is actually learning</span>
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
          Montessori education is extraordinary — but it can feel opaque from
          the outside. WattleOS gives you a window into your child&apos;s
          classroom with real observations, living portfolios, and direct
          communication with their guide.
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
            Ask Your School About WattleOS
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
          Your Window into the Classroom
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
          Finally understand the Montessori magic
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

function BeforeAfter() {
  const comparisons: { before: string; after: string }[] = [
    {
      before: '"What did you do at school today?" "Nothing."',
      after:
        "Open the portfolio and see photos of your child deep in concentration with the golden beads.",
    },
    {
      before: "A one-page report card with ticked boxes and generic comments.",
      after:
        "A rich term report with specific observations, mastery milestones, and your child's actual learning story.",
    },
    {
      before: "Writing a note, putting it in the schoolbag, hoping it arrives.",
      after: "Direct message to the guide. Response before pickup.",
    },
    {
      before: "Filling in paper forms by hand for the third time this year.",
      after: "Digital forms, once. Updated when needed. Always current.",
    },
  ];

  return (
    <section
      style={{
        padding: "80px 24px",
        background: "linear-gradient(180deg, #FEFBF3 0%, #F8F1E4 100%)",
      }}
    >
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
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
            Before &amp; after WattleOS
          </h2>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {comparisons.map((c, i: number) => (
            <div
              key={i}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 16,
                alignItems: "stretch",
              }}
            >
              <div
                style={{
                  background: "rgba(44, 24, 16, 0.04)",
                  borderRadius: 14,
                  padding: 24,
                  borderLeft: "3px solid rgba(44, 24, 16, 0.15)",
                }}
              >
                <p
                  style={{
                    fontFamily: "'Outfit', sans-serif",
                    fontSize: 11,
                    fontWeight: 600,
                    color: "#8B7355",
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    marginBottom: 8,
                  }}
                >
                  Before
                </p>
                <p
                  style={{
                    fontFamily: "'Outfit', sans-serif",
                    fontSize: 15,
                    color: "#6B5744",
                    lineHeight: 1.6,
                    margin: 0,
                  }}
                >
                  {c.before}
                </p>
              </div>
              <div
                style={{
                  background: `${HERO_COLOR}08`,
                  borderRadius: 14,
                  padding: 24,
                  borderLeft: `3px solid ${HERO_COLOR}`,
                }}
              >
                <p
                  style={{
                    fontFamily: "'Outfit', sans-serif",
                    fontSize: 11,
                    fontWeight: 600,
                    color: HERO_COLOR,
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    marginBottom: 8,
                  }}
                >
                  With WattleOS
                </p>
                <p
                  style={{
                    fontFamily: "'Outfit', sans-serif",
                    fontSize: 15,
                    color: "#2C1810",
                    lineHeight: 1.6,
                    margin: 0,
                  }}
                >
                  {c.after}
                </p>
              </div>
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
          What parents are saying
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
                {t.detail}
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
          Want WattleOS at your school?
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
          Share this page with your school&apos;s administration. We&apos;ll
          take it from there.
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
          Tell Your School
        </Link>
      </div>
    </section>
  );
}

// ============================================================
// Page Export
// ============================================================

export default function ForParentsPage() {
  return (
    <MarketingShell>
      <MarketingNav />
      <HeroBanner />
      <FeatureDeepDive />
      <BeforeAfter />
      <TestimonialSection />
      <CTABanner />
      <MarketingFooter />
    </MarketingShell>
  );
}
