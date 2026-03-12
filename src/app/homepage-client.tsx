"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useCallback } from "react";

// ─── Design tokens ────────────────────────────────────────────
// Palette drawn from a Montessori classroom: beeswax, terracotta,
// sage leaf, linen, deep bark, golden wheat.
const C = {
  bark: "#2C1810",
  clay: "#C17D3A",
  wheat: "#E8A838",
  linen: "#FEFCF6",
  parchment: "#FAF5EA",
  sage: "#5B8C5A",
  dusty: "#8B7355",
  shell: "#D4877F",
  mist: "#6B5744",
  bone: "#EDE8DF",
};

// Pink Tower proportions - 9 cubes from 100px down to 36px
const TOWER_SIZES = [100, 92, 84, 76, 68, 60, 52, 44, 36];

// ─── Data ─────────────────────────────────────────────────────
const SYSTEMS_REPLACED = [
  { name: "Transparent Classroom", what: "Mastery tracking", module: "Curriculum & Mastery" },
  { name: "Storypark / Seesaw", what: "Observations & sharing", module: "Observation Engine" },
  { name: "FACTS / Spreadsheet SIS", what: "Student records", module: "Student Information" },
  { name: "QikKids / Xplor", what: "OSHC & programs", module: "Extended Day" },
  { name: "WhatsApp Groups", what: "Parent communication", module: "Community Hub" },
  { name: "Google Forms", what: "Enrolment & waitlist", module: "Admissions Pipeline" },
  { name: "Word Documents", what: "Term reports", module: "Report Builder" },
  { name: "Paper Attendance Rolls", what: "Attendance & safety", module: "Attendance & Safety" },
];

const FEATURES = [
  { title: "Observation Engine", desc: "Capture in 30 seconds on iPad. Tag outcomes, link children, done.", color: C.wheat, n: "01" },
  { title: "Curriculum & Mastery", desc: "AMI & AMS ages 0–18. Visual progression maps. Spot gaps instantly.", color: C.sage, n: "02" },
  { title: "Student Information", desc: "One record. Every module reads from it.", color: C.clay, n: "03" },
  { title: "Attendance & Safety", desc: "iPad roll call, medical alerts, pickup authorisation.", color: C.shell, n: "04" },
  { title: "Term Report Builder", desc: "Observations and mastery flow in. Edit, not author.", color: C.dusty, n: "05" },
  { title: "Parent Portal", desc: "Living portfolios, direct messaging, OSHC bookings.", color: C.sage, n: "06" },
  { title: "Admissions Pipeline", desc: "Public forms, waitlist management, one-click approval.", color: C.wheat, n: "07" },
  { title: "Extended Day & OSHC", desc: "Session bookings, check-in kiosk, billing. CCS-ready.", color: C.clay, n: "08" },
  { title: "Community Hub", desc: "Announcements, class threads, events, family directory.", color: C.shell, n: "09" },
];

const ALL_FEATURES = [
  "Observation capture & tagging", "AMI / AMS curriculum engine",
  "Mastery tracking & portfolios", "Student information system",
  "Attendance & safety kiosk", "Term report builder",
  "Parent portal & app", "OSHC & program bookings",
  "Enrolment & waitlist pipeline", "Community chat & events",
  "EYLF / NQS / ACARA compliance", "Stripe billing & invoicing",
  "Role-based permissions", "Unlimited staff accounts",
  "Data export anytime", "Australian data residency",
];

type FormField = "name" | "school" | "email" | "phone" | "students" | "role" | "message";

// ─── Intersection reveal hook ──────────────────────────────────
function useReveal(delay = 0) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setVisible(true), delay);
          obs.disconnect();
        }
      },
      { threshold: 0.08, rootMargin: "0px 0px -40px 0px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [delay]);
  return { ref, visible };
}

// ─── Shared overline label ─────────────────────────────────────
function Overline({ children, color = C.clay }: { children: React.ReactNode; color?: string }) {
  return (
    <p style={{
      fontFamily: "'DM Mono', monospace",
      fontSize: "0.68rem",
      fontWeight: 500,
      letterSpacing: "0.18em",
      textTransform: "uppercase",
      color,
      marginBottom: "1.1rem",
    }}>
      {children}
    </p>
  );
}

// ─── Grain texture overlay ─────────────────────────────────────
function Grain({ opacity = 0.025 }: { opacity?: number }) {
  return (
    <svg
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", opacity }}
      aria-hidden
    >
      <filter id="wattle-grain">
        <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#wattle-grain)" />
    </svg>
  );
}


// ══════════════════════════════════════════════════════════════
// HERO
// ══════════════════════════════════════════════════════════════
function Hero() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 80);
    return () => clearTimeout(t);
  }, []);

  return (
    <section style={{
      minHeight: "100svh", display: "flex", flexDirection: "column",
      justifyContent: "center", alignItems: "center", textAlign: "center",
      padding: "7rem 2rem 7rem", position: "relative", overflow: "hidden",
      background: C.linen,
    }}>
      <Grain opacity={0.035} />

      {/* Background radials - warm dappled light */}
      <div aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        <div style={{
          position: "absolute", top: "-10%", left: "50%", transform: "translateX(-50%)",
          width: "80vw", height: "60vh",
          background: `radial-gradient(ellipse at 50% 0%, ${C.wheat}18 0%, transparent 68%)`,
        }} />
        <div style={{
          position: "absolute", bottom: 0, right: "-5%",
          width: "40vw", height: "50vh",
          background: `radial-gradient(ellipse at 100% 100%, ${C.sage}0E 0%, transparent 60%)`,
        }} />
        <div style={{
          position: "absolute", bottom: "10%", left: "-8%",
          width: "30vw", height: "40vh",
          background: `radial-gradient(ellipse at 0% 100%, ${C.shell}0B 0%, transparent 60%)`,
        }} />
      </div>

      {/* Pink Tower - architectural silhouette */}
      <div aria-hidden style={{
        position: "absolute", right: "8%", bottom: "12%",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
        opacity: mounted ? 0.22 : 0,
        transition: "opacity 2s ease",
      }}>
        {TOWER_SIZES.map((size, i) => (
          <div key={i} style={{
            width: size, height: size * 0.32,
            background: C.shell, borderRadius: 3,
            transform: mounted ? "none" : `translateY(${(TOWER_SIZES.length - i) * 12}px)`,
            transition: `transform ${1.2 + i * 0.08}s cubic-bezier(0.34,1.56,0.64,1) ${i * 0.06}s, opacity 1.2s ease ${i * 0.06}s`,
          }} />
        ))}
      </div>

      {/* Golden Beads - left decorative */}
      <div aria-hidden style={{
        position: "absolute", left: "6%", top: "28%",
        display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 10,
        opacity: mounted ? 0.14 : 0,
        transition: "opacity 2s ease 0.4s",
      }}>
        {Array.from({ length: 25 }).map((_, i) => (
          <div key={i} style={{
            width: 10, height: 10, borderRadius: "50%",
            background: C.wheat,
            transform: mounted ? "scale(1)" : "scale(0)",
            transition: `transform 0.6s cubic-bezier(0.34,1.56,0.64,1) ${0.5 + i * 0.025}s`,
          }} />
        ))}
      </div>

      {/* Rotated side accent text */}
      <div aria-hidden style={{
        position: "absolute", left: -80, top: "50%",
        transform: "translateY(-50%) rotate(-90deg)",
        fontFamily: "'DM Mono', monospace", fontSize: "0.58rem",
        letterSpacing: "0.3em", textTransform: "uppercase",
        color: `${C.bark}22`, whiteSpace: "nowrap",
        opacity: mounted ? 1 : 0, transition: "opacity 1.5s ease 1s",
      }}>
        Australian Montessori Schools · Enter once, use everywhere
      </div>

      {/* Main content */}
      <div style={{
        position: "relative", zIndex: 1, maxWidth: 820,
        opacity: mounted ? 1 : 0,
        transform: mounted ? "translateY(0)" : "translateY(28px)",
        transition: "opacity 1s ease 0.15s, transform 1s cubic-bezier(0.16,1,0.3,1) 0.15s",
      }}>

        <h1 style={{
          fontFamily: "'Lora', Georgia, serif",
          fontSize: "clamp(3.2rem, 7vw, 6.5rem)",
          color: C.bark, lineHeight: 1.04, fontWeight: 600,
          letterSpacing: "-0.03em", margin: "0 auto 1.8rem",
        }}>
          Enter it once.<br />
          <span style={{
            fontStyle: "italic", color: C.clay,
            background: `linear-gradient(135deg, ${C.clay} 0%, ${C.wheat} 100%)`,
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
          }}>
            Use it everywhere.
          </span>
        </h1>

        <p style={{
          fontFamily: "'Lora', Georgia, serif",
          fontSize: "clamp(1.1rem, 2vw, 1.35rem)",
          color: C.mist, lineHeight: 1.65, maxWidth: 560, margin: "0 auto 3rem",
          fontWeight: 400, fontStyle: "italic",
        }}>
          WattleOS replaces the platforms your school juggles with one system
          that speaks Montessori - from first inquiry to graduation.
        </p>

        <div style={{ display: "flex", gap: "0.9rem", justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="#demo" style={{
            background: C.bark, color: C.linen,
            fontFamily: "'DM Mono', monospace", fontSize: "0.72rem", letterSpacing: "0.14em",
            textTransform: "uppercase", padding: "1rem 2.2rem", borderRadius: "4px",
            textDecoration: "none", transition: "background 0.25s, transform 0.2s",
            display: "inline-block",
          }}
            onMouseEnter={e => { e.currentTarget.style.background = C.clay; e.currentTarget.style.transform = "translateY(-2px)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = C.bark; e.currentTarget.style.transform = "none"; }}
          >
            Book a Demo
          </Link>
          <Link href="#features" style={{
            background: "transparent", color: C.bark,
            fontFamily: "'DM Mono', monospace", fontSize: "0.72rem", letterSpacing: "0.14em",
            textTransform: "uppercase", padding: "1rem 2.2rem", borderRadius: "4px",
            border: `1.5px solid ${C.bark}20`, textDecoration: "none",
            transition: "border-color 0.2s, transform 0.2s",
            display: "inline-block",
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = `${C.bark}60`; e.currentTarget.style.transform = "translateY(-2px)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = `${C.bark}20`; e.currentTarget.style.transform = "none"; }}
          >
            See What&apos;s Inside
          </Link>
        </div>
      </div>

      {/* Scroll indicator */}
      <div style={{
        position: "absolute", bottom: "2.5rem", left: "50%", transform: "translateX(-50%)",
        opacity: mounted ? 0.3 : 0, transition: "opacity 1s ease 1.5s",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
      }}>
        <span style={{
          fontFamily: "'DM Mono', monospace", fontSize: "0.55rem",
          letterSpacing: "0.2em", textTransform: "uppercase", color: C.bark,
        }}>
          scroll
        </span>
        <div style={{
          width: 1, height: 40,
          background: `linear-gradient(to bottom, ${C.bark}40, transparent)`,
          animation: "scrollLine 2s ease-in-out infinite",
        }} />
      </div>
    </section>
  );
}

// ══════════════════════════════════════════════════════════════
// PROBLEM SECTION
// ══════════════════════════════════════════════════════════════
function ProblemSection() {
  const heading = useReveal(0);
  const grid = useReveal(100);

  return (
    <section style={{ padding: "7rem 2rem 5rem", background: C.parchment, position: "relative", overflow: "hidden" }}>
      <Grain opacity={0.028} />

      {/* Ghost numeral */}
      <div aria-hidden style={{
        position: "absolute", right: "-2%", top: "5%",
        fontFamily: "'Lora', Georgia, serif",
        fontSize: "clamp(12rem, 22vw, 22rem)", fontWeight: 700,
        color: `${C.bark}04`, lineHeight: 1, userSelect: "none", pointerEvents: "none",
      }}>
        6→1
      </div>

      <div style={{ maxWidth: 1080, margin: "0 auto" }}>
        <div ref={heading.ref} style={{
          textAlign: "center", marginBottom: "4rem",
          opacity: heading.visible ? 1 : 0,
          transform: heading.visible ? "none" : "translateY(24px)",
          transition: "opacity 0.9s ease, transform 0.9s ease",
        }}>
          <Overline color={C.clay}>The Problem</Overline>
          <h2 style={{
            fontFamily: "'Lora', Georgia, serif",
            fontSize: "clamp(2.2rem, 5vw, 3.8rem)", color: C.bark,
            fontWeight: 600, letterSpacing: "-0.025em", lineHeight: 1.15, marginBottom: "1.2rem",
          }}>
            Your school runs on{" "}
            <span style={{ color: C.clay, fontStyle: "italic" }}>six platforms</span>{" "}
            that don&apos;t speak to each other
          </h2>
          <p style={{
            fontFamily: "'Lora', Georgia, serif",
            fontSize: "clamp(1rem, 1.8vw, 1.2rem)",
            color: C.mist, maxWidth: 560, margin: "0 auto", lineHeight: 1.7, fontStyle: "italic",
          }}>
            Every child entered into one system gets re-entered into five others.
            Every update risks something being missed. WattleOS replaces all of them.
          </p>
        </div>

        <div ref={grid.ref} style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))",
          gap: "1rem",
          opacity: grid.visible ? 1 : 0,
          transition: "opacity 0.7s ease 0.1s",
        }}>
          {SYSTEMS_REPLACED.map((sys, i) => (
            <div key={i} style={{
              background: C.linen,
              border: `1px solid ${C.bark}08`,
              borderRadius: 6,
              padding: "1.4rem 1.5rem",
              transform: grid.visible ? "none" : "translateY(20px)",
              transition: `transform 0.7s cubic-bezier(0.16,1,0.3,1) ${i * 0.06}s`,
              position: "relative", overflow: "hidden",
            }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `${C.clay}30` }} />
              <p style={{
                fontFamily: "'Lora', Georgia, serif",
                fontSize: "1.05rem", fontWeight: 700, color: C.bark,
                marginBottom: "0.2rem", opacity: 0.45,
                textDecoration: "line-through", textDecorationColor: `${C.clay}60`,
              }}>
                {sys.name}
              </p>
              <p style={{
                fontFamily: "'DM Mono', monospace", fontSize: "0.65rem",
                letterSpacing: "0.06em", color: C.dusty, marginBottom: "0.8rem",
              }}>
                {sys.what}
              </p>
              <p style={{
                fontFamily: "'DM Mono', monospace", fontSize: "0.65rem",
                letterSpacing: "0.08em", color: C.sage, textTransform: "uppercase",
              }}>
                → {sys.module}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ══════════════════════════════════════════════════════════════
// FEATURES - interactive selector with sticky detail panel
// ══════════════════════════════════════════════════════════════
function FeaturesSection() {
  const [active, setActive] = useState(0);
  const heading = useReveal(0);
  const body = useReveal(80);

  const feature = FEATURES[active];

  return (
    <section id="features" style={{ padding: "7rem 2rem 7rem", background: C.linen, position: "relative", overflow: "hidden" }}>
      <Grain opacity={0.025} />

      <div style={{ maxWidth: 1140, margin: "0 auto" }}>
        <div ref={heading.ref} style={{
          textAlign: "center", marginBottom: "4.5rem",
          opacity: heading.visible ? 1 : 0,
          transform: heading.visible ? "none" : "translateY(24px)",
          transition: "opacity 0.9s ease, transform 0.9s ease",
        }}>
          <Overline>The Complete Platform</Overline>
          <h2 style={{
            fontFamily: "'Lora', Georgia, serif",
            fontSize: "clamp(2.2rem, 5vw, 3.8rem)", color: C.bark,
            fontWeight: 600, letterSpacing: "-0.025em", lineHeight: 1.15,
          }}>
            Everything a Montessori school needs
          </h2>
          <p style={{
            fontFamily: "'Lora', Georgia, serif",
            fontSize: "1.1rem", color: C.mist, fontStyle: "italic",
            marginTop: "0.8rem",
          }}>
            Fourteen integrated modules. No feature gating. Every school gets the full platform.
          </p>
        </div>

        <div ref={body.ref} className="features-layout" style={{
          display: "grid", gridTemplateColumns: "1fr 1.6fr", gap: "3rem",
          alignItems: "start",
          opacity: body.visible ? 1 : 0,
          transition: "opacity 0.7s ease",
        }}>
          {/* Feature index */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
            {FEATURES.map((f, i) => (
              <button key={i} onClick={() => setActive(i)} style={{
                background: active === i ? C.bark : "transparent",
                border: `1px solid ${active === i ? C.bark : `${C.bark}10`}`,
                borderRadius: 5,
                padding: "0.9rem 1.1rem",
                cursor: "pointer",
                display: "flex", alignItems: "center", gap: "0.9rem",
                transition: "all 0.3s ease",
                textAlign: "left",
              }}>
                <span style={{
                  fontFamily: "'DM Mono', monospace", fontSize: "0.62rem",
                  letterSpacing: "0.1em", color: active === i ? `${C.linen}70` : C.dusty,
                  flexShrink: 0, transition: "color 0.3s",
                }}>
                  {f.n}
                </span>
                <div style={{
                  width: 10, height: 10, borderRadius: "50%",
                  background: active === i ? C.linen : f.color,
                  flexShrink: 0, transition: "background 0.3s",
                }} />
                <span style={{
                  fontFamily: "'Lora', Georgia, serif",
                  fontSize: "1rem", fontWeight: 600, letterSpacing: "-0.01em",
                  color: active === i ? C.linen : C.bark, transition: "color 0.3s",
                }}>
                  {f.title}
                </span>
              </button>
            ))}
          </div>

          {/* Feature detail */}
          <div style={{
            position: "sticky", top: "7rem",
            background: C.parchment, borderRadius: 8,
            border: `1px solid ${C.bark}08`,
            padding: "3rem 2.8rem", overflow: "hidden",
            minHeight: 340,
          }}>
            <Grain opacity={0.03} />
            <div style={{ position: "relative", zIndex: 1 }}>
              <div aria-hidden style={{
                position: "absolute", top: -20, right: -10,
                fontFamily: "'Lora', Georgia, serif",
                fontSize: "8rem", fontWeight: 700, lineHeight: 1,
                color: `${feature.color}12`, userSelect: "none",
              }}>
                {feature.n}
              </div>

              <div style={{
                display: "inline-block", background: `${feature.color}15`,
                border: `1px solid ${feature.color}25`, borderRadius: 4,
                padding: "0.3rem 0.75rem", marginBottom: "1.5rem",
              }}>
                <span style={{
                  fontFamily: "'DM Mono', monospace", fontSize: "0.62rem",
                  letterSpacing: "0.12em", textTransform: "uppercase", color: feature.color,
                }}>
                  Module {feature.n}
                </span>
              </div>

              <h3 style={{
                fontFamily: "'Lora', Georgia, serif",
                fontSize: "clamp(1.8rem, 3vw, 2.6rem)", color: C.bark,
                fontWeight: 600, letterSpacing: "-0.02em", lineHeight: 1.15,
                marginBottom: "1.2rem",
              }}>
                {feature.title}
              </h3>
              <p style={{
                fontFamily: "'Lora', Georgia, serif",
                fontSize: "1.15rem", color: C.mist, lineHeight: 1.7,
                fontStyle: "italic", maxWidth: 420, marginBottom: "2rem",
              }}>
                {feature.desc}
              </p>

              {/* Bead bar visualization */}
              <div style={{ display: "flex", gap: 5, alignItems: "flex-end" }}>
                {[0.4, 0.6, 0.75, 0.9, 1, 0.85, 0.65, 0.45, 0.3].map((h, i) => (
                  <div key={i} style={{
                    width: 8, borderRadius: 3,
                    height: `${h * 48}px`,
                    background: `${feature.color}${Math.round(h * 0.7 * 255).toString(16).padStart(2, "0")}`,
                    transition: `height 0.5s cubic-bezier(0.34,1.56,0.64,1) ${i * 0.04}s`,
                  }} />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* All features checklist */}
        <div style={{ marginTop: "4rem", paddingTop: "3rem", borderTop: `1px solid ${C.bark}08` }}>
          <div style={{ textAlign: "center", marginBottom: "2rem" }}>
            <Overline>Everything Included</Overline>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "0.6rem 2rem" }}>
            {ALL_FEATURES.map((f, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <div style={{
                  width: 5, height: 5, borderRadius: "50%",
                  background: [C.wheat, C.sage, C.clay, C.shell][i % 4],
                  flexShrink: 0,
                }} />
                <span style={{ fontFamily: "'Lora', Georgia, serif", fontSize: "1rem", color: C.mist }}>
                  {f}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ══════════════════════════════════════════════════════════════
// ROLES
// ══════════════════════════════════════════════════════════════
function RolesSection() {
  const heading = useReveal();
  const cards = useReveal(100);

  const roles = [
    {
      title: "For Guides",
      href: "/for-guides",
      accent: C.wheat,
      bg: `${C.wheat}0E`,
      desc: "Capture observations in 30 seconds. See mastery at a glance. Generate term reports from real data - not a blank page.",
      glyph: "◎",
    },
    {
      title: "For Parents",
      href: "/for-parents",
      accent: C.sage,
      bg: `${C.sage}0D`,
      desc: "Living portfolios of your child's journey. Attendance updates, direct messaging, OSHC booking - all in one place.",
      glyph: "◑",
    },
    {
      title: "For Staff",
      href: "/for-staff",
      accent: C.clay,
      bg: `${C.clay}0E`,
      desc: "Roll call in seconds. Medical info at your fingertips. Timesheets that push straight to payroll. No spreadsheets.",
      glyph: "◐",
    },
    {
      title: "For Administrators",
      href: "/for-admin",
      accent: C.shell,
      bg: `${C.shell}10`,
      desc: "Enrolment pipeline, billing, compliance reporting, and granular permissions. Your school's operating system.",
      glyph: "●",
    },
  ];

  return (
    <section style={{ padding: "7rem 2rem", background: C.parchment, position: "relative", overflow: "hidden" }}>
      <Grain opacity={0.03} />
      <div style={{
        position: "absolute", left: 0, right: 0, top: 0, height: 1,
        background: `linear-gradient(to right, transparent, ${C.wheat}40, ${C.sage}40, transparent)`,
      }} />

      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div ref={heading.ref} style={{
          textAlign: "center", marginBottom: "4rem",
          opacity: heading.visible ? 1 : 0,
          transform: heading.visible ? "none" : "translateY(20px)",
          transition: "opacity 0.9s ease, transform 0.9s ease",
        }}>
          <Overline color={C.dusty}>Built for Every Role</Overline>
          <h2 style={{
            fontFamily: "'Lora', Georgia, serif",
            fontSize: "clamp(2.2rem, 5vw, 3.8rem)", color: C.bark,
            fontWeight: 600, letterSpacing: "-0.025em",
          }}>
            Who is WattleOS for?
          </h2>
        </div>

        <div ref={cards.ref} className="roles-grid" style={{
          display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
          gap: "1.2rem",
          opacity: cards.visible ? 1 : 0,
          transition: "opacity 0.7s ease",
        }}>
          {roles.map((r, i) => (
            <Link key={i} href={r.href} style={{ textDecoration: "none", color: "inherit", display: "block" }}>
              <div style={{
                background: r.bg, border: `1px solid ${r.accent}18`,
                borderRadius: 8, padding: "2.2rem 2rem",
                transition: "transform 0.35s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.3s ease",
                cursor: "pointer", height: "100%", boxSizing: "border-box",
                position: "relative", overflow: "hidden",
                transform: cards.visible ? "none" : `translateY(${16 + i * 8}px)`,
              }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.transform = "translateY(-6px)";
                  (e.currentTarget as HTMLElement).style.boxShadow = `0 20px 48px ${r.accent}18`;
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.transform = "none";
                  (e.currentTarget as HTMLElement).style.boxShadow = "none";
                }}
              >
                <div aria-hidden style={{
                  position: "absolute", bottom: -20, right: -10,
                  fontFamily: "'Lora', Georgia, serif",
                  fontSize: "7rem", color: `${r.accent}0E`, lineHeight: 1, userSelect: "none",
                }}>
                  {r.glyph}
                </div>
                <div style={{
                  width: 36, height: 36, borderRadius: "50%",
                  background: `${r.accent}20`, border: `2px solid ${r.accent}30`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  marginBottom: "1.4rem",
                  fontFamily: "'Lora', Georgia, serif",
                  fontSize: "1.1rem", color: r.accent,
                }}>
                  {r.glyph}
                </div>
                <h3 style={{
                  fontFamily: "'Lora', Georgia, serif",
                  fontSize: "1.5rem", color: C.bark, fontWeight: 700,
                  letterSpacing: "-0.01em", marginBottom: "0.8rem",
                }}>
                  {r.title}
                </h3>
                <p style={{
                  fontFamily: "'Lora', Georgia, serif",
                  fontSize: "1rem", color: C.mist, lineHeight: 1.65,
                  fontStyle: "italic", marginBottom: "1.4rem",
                }}>
                  {r.desc}
                </p>
                <span style={{
                  fontFamily: "'DM Mono', monospace", fontSize: "0.65rem",
                  letterSpacing: "0.14em", textTransform: "uppercase", color: r.accent,
                }}>
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

// ══════════════════════════════════════════════════════════════
// PRICING
// ══════════════════════════════════════════════════════════════
function PricingSection() {
  const [studentCount, setStudentCount] = useState(60);
  const [annual, setAnnual] = useState(false);
  const heading = useReveal();
  const calc = useReveal(80);

  const perStudent = annual ? 7 : 8;
  const floor = 199;
  const monthlyPrice = Math.max(studentCount * perStudent, floor);
  const savings = annual ? studentCount * 12 : 0;
  const fillPct = ((studentCount - 10) / 290) * 100;

  return (
    <section id="pricing" style={{ padding: "7rem 2rem", background: C.linen, position: "relative", overflow: "hidden" }}>
      <Grain opacity={0.025} />

      <div style={{ maxWidth: 920, margin: "0 auto" }}>
        <div ref={heading.ref} style={{
          textAlign: "center", marginBottom: "4rem",
          opacity: heading.visible ? 1 : 0,
          transform: heading.visible ? "none" : "translateY(20px)",
          transition: "opacity 0.9s ease, transform 0.9s ease",
        }}>
          <Overline>Transparent Pricing</Overline>
          <h2 style={{
            fontFamily: "'Lora', Georgia, serif",
            fontSize: "clamp(2.2rem, 5vw, 3.8rem)", color: C.bark,
            fontWeight: 600, letterSpacing: "-0.025em", marginBottom: "1rem",
          }}>
            One price. Everything included.
          </h2>
          <p style={{
            fontFamily: "'Lora', Georgia, serif",
            fontSize: "1.1rem", color: C.mist, fontStyle: "italic",
          }}>
            No feature tiers. No hidden costs. Pricing scales simply with your student count.
          </p>
        </div>

        <div ref={calc.ref} style={{
          opacity: calc.visible ? 1 : 0,
          transform: calc.visible ? "none" : "translateY(24px)",
          transition: "opacity 0.9s ease, transform 0.9s ease",
        }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "2.5rem", gap: "0.5rem" }}>
            {[{ label: "Monthly", v: false }, { label: "Annual - Save 12%", v: true }].map(opt => (
              <button key={opt.label} onClick={() => setAnnual(opt.v)} style={{
                background: annual === opt.v ? C.bark : "transparent",
                color: annual === opt.v ? C.linen : C.dusty,
                border: `1px solid ${annual === opt.v ? C.bark : `${C.bark}15`}`,
                borderRadius: 4, padding: "0.55rem 1.3rem",
                fontFamily: "'DM Mono', monospace", fontSize: "0.66rem",
                letterSpacing: "0.1em", textTransform: "uppercase",
                cursor: "pointer", transition: "all 0.25s ease",
              }}>
                {opt.label}
              </button>
            ))}
          </div>

          <div className="pricing-layout" style={{
            display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2px",
            background: `${C.bark}08`, borderRadius: 10, overflow: "hidden",
          }}>
            <div style={{ background: C.parchment, padding: "2.8rem 3rem" }}>
              <p style={{
                fontFamily: "'DM Mono', monospace", fontSize: "0.66rem",
                letterSpacing: "0.12em", textTransform: "uppercase",
                color: C.dusty, marginBottom: "2rem",
              }}>
                How many students?
              </p>
              <input type="range" min={10} max={300} step={5} value={studentCount}
                onChange={e => setStudentCount(Number(e.target.value))}
                style={{
                  width: "100%", height: 4, appearance: "none",
                  background: `linear-gradient(to right, ${C.clay} ${fillPct}%, ${C.bark}15 ${fillPct}%)`,
                  borderRadius: 2, outline: "none", cursor: "pointer", accentColor: C.clay,
                  marginBottom: "1rem",
                }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.62rem", color: C.dusty }}>10</span>
                <span style={{
                  fontFamily: "'Lora', Georgia, serif",
                  fontSize: "2.8rem", color: C.bark, fontWeight: 700, lineHeight: 1,
                }}>
                  {studentCount}
                </span>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.62rem", color: C.dusty }}>300</span>
              </div>
            </div>

            <div style={{
              background: C.bark, padding: "2.8rem 3rem",
              display: "flex", flexDirection: "column", justifyContent: "center",
            }}>
              <p style={{
                fontFamily: "'DM Mono', monospace", fontSize: "0.62rem",
                letterSpacing: "0.12em", textTransform: "uppercase",
                color: `${C.linen}50`, marginBottom: "1rem",
              }}>
                {annual ? "Per month, billed annually" : "Per month"}
              </p>
              <div style={{ display: "flex", alignItems: "flex-start", gap: "0.3rem" }}>
                <span style={{
                  fontFamily: "'Lora', Georgia, serif",
                  fontSize: "1.5rem", color: `${C.linen}60`, marginTop: "0.5rem",
                }}>
                  $
                </span>
                <span style={{
                  fontFamily: "'Lora', Georgia, serif",
                  fontSize: "clamp(3.5rem, 7vw, 5.5rem)", color: C.linen,
                  fontWeight: 700, lineHeight: 1,
                }}>
                  {monthlyPrice}
                </span>
              </div>
              <p style={{
                fontFamily: "'DM Mono', monospace", fontSize: "0.62rem",
                letterSpacing: "0.08em", color: `${C.linen}50`, marginTop: "0.6rem",
              }}>
                ${perStudent} / student / month
              </p>
              {annual && savings > 0 && (
                <p style={{
                  fontFamily: "'DM Mono', monospace", fontSize: "0.62rem",
                  letterSpacing: "0.08em", color: C.wheat, marginTop: "0.6rem",
                }}>
                  ↑ Save ${savings}/year
                </p>
              )}
              {studentCount * perStudent < floor && (
                <p style={{
                  fontFamily: "'DM Mono', monospace", fontSize: "0.6rem",
                  color: `${C.linen}40`, marginTop: "0.5rem",
                }}>
                  ${floor}/mo minimum applies
                </p>
              )}
            </div>
          </div>

          <div style={{
            marginTop: "1.5rem", padding: "1.4rem 1.8rem",
            background: `${C.wheat}0C`, border: `1px solid ${C.wheat}1E`,
            borderRadius: 6,
          }}>
            <p style={{
              fontFamily: "'Lora', Georgia, serif",
              fontSize: "1rem", color: C.mist, fontStyle: "italic", margin: 0,
            }}>
              <strong style={{ color: C.bark, fontStyle: "normal" }}>$499 one-time onboarding</strong>{" "}
              - curriculum setup, school configuration, and a training session for your team.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ══════════════════════════════════════════════════════════════
// DEMO FORM
// ══════════════════════════════════════════════════════════════
function DemoSection() {
  const [formState, setFormState] = useState<Record<FormField, string>>({
    name: "", school: "", email: "", phone: "", students: "", role: "", message: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);
  const heading = useReveal();

  const handleChange = useCallback((field: FormField, value: string) =>
    setFormState(prev => ({ ...prev, [field]: value })), []);

  const handleSubmit = () => {
    const subject = encodeURIComponent(`WattleOS Demo Request - ${formState.school || "New School"}`);
    const body = encodeURIComponent(
      `Name: ${formState.name}\nSchool: ${formState.school}\nEmail: ${formState.email}\nPhone: ${formState.phone}\nStudent Count: ${formState.students}\nRole: ${formState.role}\n\nMessage:\n${formState.message}`
    );
    window.open(`mailto:hello@wattleos.au?subject=${subject}&body=${body}`, "_self");
    setSubmitted(true);
  };

  const inputStyle = (field: string): React.CSSProperties => ({
    width: "100%", boxSizing: "border-box",
    padding: "0.85rem 1rem",
    border: `1px solid ${focused === field ? C.clay : `${C.bark}14`}`,
    borderRadius: 4,
    fontFamily: "'Lora', Georgia, serif",
    fontSize: "1.05rem", color: C.bark, background: C.linen,
    outline: "none", transition: "border-color 0.2s",
  });

  if (submitted) {
    return (
      <section id="demo" style={{ padding: "7rem 2rem", background: C.parchment }}>
        <div style={{
          maxWidth: 520, margin: "0 auto", textAlign: "center",
          padding: "4rem 3rem",
          background: C.linen, borderRadius: 8,
          border: `1px solid ${C.sage}20`,
        }}>
          <h3 style={{
            fontFamily: "'Lora', Georgia, serif",
            fontSize: "2.2rem", color: C.bark, fontWeight: 600,
            margin: "1.5rem 0 0.8rem", letterSpacing: "-0.02em",
          }}>
            Thank you
          </h3>
          <p style={{
            fontFamily: "'Lora', Georgia, serif",
            fontSize: "1.05rem", color: C.mist, lineHeight: 1.7, fontStyle: "italic",
          }}>
            Your email client should have opened with your demo request. If not, reach us at{" "}
            <a href="mailto:hello@ecodia.au" style={{ color: C.clay, textDecoration: "none", fontStyle: "normal", fontWeight: 700 }}>
              hello@ecodia.au
            </a>
          </p>
          <button onClick={() => setSubmitted(false)} style={{
            marginTop: "1.5rem", background: "none", cursor: "pointer",
            border: `1px solid ${C.bark}18`, borderRadius: 4,
            padding: "0.6rem 1.4rem",
            fontFamily: "'DM Mono', monospace", fontSize: "0.66rem",
            letterSpacing: "0.1em", textTransform: "uppercase", color: C.mist,
          }}>
            ← Back
          </button>
        </div>
      </section>
    );
  }

  return (
    <section id="demo" style={{ padding: "7rem 2rem", background: C.parchment, position: "relative", overflow: "hidden" }}>
      <Grain opacity={0.03} />

      <div style={{ maxWidth: 680, margin: "0 auto" }}>
        <div ref={heading.ref} style={{
          textAlign: "center", marginBottom: "3.5rem",
          opacity: heading.visible ? 1 : 0,
          transform: heading.visible ? "none" : "translateY(20px)",
          transition: "opacity 0.9s ease, transform 0.9s ease",
        }}>
          <Overline color={C.sage}>Get Started</Overline>
          <h2 style={{
            fontFamily: "'Lora', Georgia, serif",
            fontSize: "clamp(2.2rem, 5vw, 3.6rem)", color: C.bark,
            fontWeight: 600, letterSpacing: "-0.025em", marginBottom: "0.9rem",
          }}>
            Book a personalised demo
          </h2>
          <p style={{
            fontFamily: "'Lora', Georgia, serif",
            fontSize: "1.1rem", color: C.mist, fontStyle: "italic",
          }}>
            We&apos;ll walk you through WattleOS with your school&apos;s curriculum and actual workflow.
          </p>
        </div>

        <div style={{
          background: C.linen, borderRadius: 8,
          border: `1px solid ${C.bark}08`,
          padding: "3rem 3rem 2.5rem",
        }}>
          <div className="form-grid" style={{
            display: "grid", gridTemplateColumns: "1fr 1fr",
            gap: "1rem 1.5rem", marginBottom: "1rem",
          }}>
            {([
              { field: "name" as FormField, label: "Your Name *", type: "text", ph: "Jane Smith" },
              { field: "school" as FormField, label: "School Name *", type: "text", ph: "Banksia Montessori" },
              { field: "email" as FormField, label: "Email *", type: "email", ph: "jane@banksia.edu.au" },
              { field: "phone" as FormField, label: "Phone", type: "tel", ph: "04XX XXX XXX" },
            ]).map(inp => (
              <div key={inp.field}>
                <label style={{
                  display: "block", fontFamily: "'DM Mono', monospace",
                  fontSize: "0.62rem", letterSpacing: "0.1em", textTransform: "uppercase",
                  color: C.dusty, marginBottom: "0.5rem",
                }}>
                  {inp.label}
                </label>
                <input
                  type={inp.type} placeholder={inp.ph}
                  value={formState[inp.field]}
                  onChange={e => handleChange(inp.field, e.target.value)}
                  onFocus={() => setFocused(inp.field)}
                  onBlur={() => setFocused(null)}
                  style={inputStyle(inp.field)}
                />
              </div>
            ))}
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <label style={{
              display: "block", fontFamily: "'DM Mono', monospace",
              fontSize: "0.62rem", letterSpacing: "0.1em", textTransform: "uppercase",
              color: C.dusty, marginBottom: "0.6rem",
            }}>
              Your Role
            </label>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              {["Head of School", "Guide / Teacher", "Administrator", "Parent", "Other"].map(opt => (
                <button key={opt} type="button" onClick={() => handleChange("role", opt)} style={{
                  background: formState.role === opt ? C.bark : "transparent",
                  color: formState.role === opt ? C.linen : C.mist,
                  border: `1px solid ${formState.role === opt ? C.bark : `${C.bark}18`}`,
                  borderRadius: 4, padding: "0.45rem 1rem",
                  fontFamily: "'DM Mono', monospace", fontSize: "0.62rem",
                  letterSpacing: "0.08em", cursor: "pointer",
                  transition: "all 0.2s ease",
                }}>
                  {opt}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <label style={{
              display: "block", fontFamily: "'DM Mono', monospace",
              fontSize: "0.62rem", letterSpacing: "0.1em", textTransform: "uppercase",
              color: C.dusty, marginBottom: "0.6rem",
            }}>
              Student Count
            </label>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              {["Under 30", "30–80", "80–150", "150+"].map(opt => (
                <button key={opt} type="button" onClick={() => handleChange("students", opt)} style={{
                  background: formState.students === opt ? C.clay : "transparent",
                  color: formState.students === opt ? C.linen : C.mist,
                  border: `1px solid ${formState.students === opt ? C.clay : `${C.bark}18`}`,
                  borderRadius: 4, padding: "0.45rem 1rem",
                  fontFamily: "'DM Mono', monospace", fontSize: "0.62rem",
                  letterSpacing: "0.08em", cursor: "pointer",
                  transition: "all 0.2s ease",
                }}>
                  {opt}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: "1.8rem" }}>
            <label style={{
              display: "block", fontFamily: "'DM Mono', monospace",
              fontSize: "0.62rem", letterSpacing: "0.1em", textTransform: "uppercase",
              color: C.dusty, marginBottom: "0.5rem",
            }}>
              Anything else?
            </label>
            <textarea
              placeholder="Tell us about your school, what you're currently using, or what's not working..."
              value={formState.message}
              onChange={e => handleChange("message", e.target.value)}
              onFocus={() => setFocused("message")}
              onBlur={() => setFocused(null)}
              rows={4}
              style={{ ...inputStyle("message"), resize: "vertical", fontStyle: "italic" }}
            />
          </div>

          <button type="button" onClick={handleSubmit} style={{
            width: "100%", background: C.bark, color: C.linen, border: "none",
            borderRadius: 4, padding: "1.05rem",
            fontFamily: "'DM Mono', monospace", fontSize: "0.72rem",
            letterSpacing: "0.15em", textTransform: "uppercase", cursor: "pointer",
            transition: "background 0.2s, transform 0.15s",
          }}
            onMouseEnter={e => {
              e.currentTarget.style.background = C.clay;
              e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = C.bark;
              e.currentTarget.style.transform = "none";
            }}
          >
            Request a Demo
          </button>
          <p style={{
            fontFamily: "'DM Mono', monospace", fontSize: "0.62rem",
            letterSpacing: "0.06em", color: C.dusty,
            textAlign: "center", marginTop: "1rem",
          }}>
            Or email us at{" "}
            <a href="mailto:hello@ecodia.au" style={{ color: C.clay, textDecoration: "none", fontWeight: 500 }}>
              hello@ecodia.au
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}

// ══════════════════════════════════════════════════════════════
// MAIN EXPORT
// ══════════════════════════════════════════════════════════════
export default function HomepageClient() {
  return (
    <div style={{ background: C.linen, color: C.bark, overflowX: "clip", minHeight: "100vh" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600&family=DM+Mono:wght@400;500&display=swap');

        html { scroll-behavior: smooth; }
        ::selection { background: rgba(232,168,56,0.2); color: #2C1810; }

        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 18px; height: 18px;
          border-radius: 50%;
          background: #C17D3A;
          border: 2px solid #FEFCF6;
          box-shadow: 0 2px 6px rgba(44,24,16,0.2);
          cursor: pointer;
        }
        input[type="range"]::-moz-range-thumb {
          width: 18px; height: 18px;
          border-radius: 50%;
          background: #C17D3A;
          border: 2px solid #FEFCF6;
          cursor: pointer;
        }

        @keyframes scrollLine {
          0%, 100% { transform: scaleY(1); opacity: 0.4; }
          50% { transform: scaleY(0.6); opacity: 0.8; }
        }

        @media (max-width: 900px) {
          .features-layout { grid-template-columns: 1fr !important; }
          .roles-grid { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 640px) {
          .pricing-layout { grid-template-columns: 1fr !important; }
          .form-grid { grid-template-columns: 1fr !important; }
          .roles-grid { grid-template-columns: 1fr !important; }
          .nav-links-desktop { display: none !important; }
        }
      `}</style>

      <Hero />
      <ProblemSection />
      <FeaturesSection />
      <RolesSection />
      <PricingSection />
      <DemoSection />
    </div>
  );
}
