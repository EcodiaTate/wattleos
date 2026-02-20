"use client";

import { useState, useEffect, type CSSProperties } from "react";
import Link from "next/link";

// ============================================================
// Types
// ============================================================

type RoleKey = "guides" | "parents" | "staff" | "admin";

interface RoleFeature {
  icon: string;
  title: string;
  desc: string;
}

interface RoleData {
  title: string;
  subtitle: string;
  color: string;
  href: string;
  features: RoleFeature[];
}

interface NavBarProps {
  activeSection: string;
  onNavigate: (id: string) => void;
}

interface FormState {
  name: string;
  school: string;
  email: string;
  phone: string;
  students: string;
  message: string;
}

type FormField = keyof FormState;

interface PricingPlan {
  name: string;
  students: string;
  price: number;
  period: string;
  desc: string;
  highlight: boolean;
  icon: string;
}

interface FeatureCardData {
  icon: string;
  title: string;
  desc: string;
  color: string;
}

// ============================================================
// Data
// ============================================================

const ROLES: Record<RoleKey, RoleData> = {
  guides: {
    title: "For Guides",
    subtitle: "Capture learning moments, not paperwork",
    color: "#E8A838",
    href: "/wattleos/for-guides",
    features: [
      {
        icon: "📸",
        title: "Tap-and-Capture Observations",
        desc: "Photograph a learning moment on your iPad, tag students and curriculum nodes, done. Under 30 seconds from sighting to record.",
      },
      {
        icon: "🌿",
        title: "Montessori-Native Curriculum",
        desc: "AMI 3–6 curriculum tree built in. No retrofitting generic standards — your shelves, your materials, your language.",
      },
      {
        icon: "📊",
        title: "Mastery at a Glance",
        desc: "See where every child is across the curriculum. Spot who needs a new presentation. Let the data guide your planning, not replace your intuition.",
      },
      {
        icon: "📝",
        title: "Reports That Write Themselves",
        desc: "Term reports pull from your observations and mastery records. Review and personalise, but never start from a blank page again.",
      },
    ],
  },
  parents: {
    title: "For Parents",
    subtitle: "See what your child is actually learning",
    color: "#5B8C5A",
    href: "/wattleos/for-parents",
    features: [
      {
        icon: "📖",
        title: "Living Portfolios",
        desc: "Photos, observations, and mastery milestones — a real picture of your child's Montessori journey, not just a term grade.",
      },
      {
        icon: "✅",
        title: "Attendance & Safety",
        desc: "Real-time check-in notifications. Know your child arrived safely. Emergency contacts and medical info always current.",
      },
      {
        icon: "💬",
        title: "Direct Communication",
        desc: "Message guides, receive school announcements, RSVP to events — all in one place. No more lost notes in schoolbags.",
      },
      {
        icon: "📋",
        title: "Easy Enrolment",
        desc: "Digital forms, document uploads, and enrollment tracking. From waitlist to first day, everything managed smoothly online.",
      },
    ],
  },
  staff: {
    title: "For Staff",
    subtitle: "Run your classroom, not spreadsheets",
    color: "#C17D3A",
    href: "/wattleos/for-staff",
    features: [
      {
        icon: "📋",
        title: "Roll Call in Seconds",
        desc: "iPad-optimised attendance. Tap through your class list, flag absences, record late arrivals. Compliance handled automatically.",
      },
      {
        icon: "🏥",
        title: "Medical Info at Your Fingertips",
        desc: "Allergies, action plans, emergency contacts — instantly accessible for every child in your care. Colour-coded severity.",
      },
      {
        icon: "⏰",
        title: "Timesheets & Scheduling",
        desc: "Clock in and out, view your roster, submit leave requests. No paper forms, no chasing signatures.",
      },
      {
        icon: "📁",
        title: "Student Records",
        desc: "Complete profiles with family info, medical details, and learning history. Everything you need to know about each child, organised.",
      },
    ],
  },
  admin: {
    title: "For Administrators",
    subtitle: "Your school's operating system",
    color: "#8B6F47",
    href: "/wattleos/for-admin",
    features: [
      {
        icon: "🏫",
        title: "Multi-Campus Management",
        desc: "One login, every campus. Manage staff, students, and settings across your entire school network from a single dashboard.",
      },
      {
        icon: "💰",
        title: "Billing & CCS Integration",
        desc: "Stripe-powered invoicing, CCS claims processing, fee schedules — get paid on time with less admin work.",
      },
      {
        icon: "📊",
        title: "Compliance Reporting",
        desc: "NQS, EYLF, and state curriculum cross-mapping. Generate compliance reports that satisfy auditors without manual compilation.",
      },
      {
        icon: "🔐",
        title: "Granular Permissions",
        desc: "Role-based access control down to individual actions. Guides see pedagogy, office staff see admin, parents see their children.",
      },
    ],
  },
};

const PRICING: PricingPlan[] = [
  {
    name: "Seedling",
    students: "Up to 50 students",
    price: 249,
    period: "/month",
    desc: "For smaller settings and startup schools",
    highlight: false,
    icon: "🌱",
  },
  {
    name: "Sapling",
    students: "Up to 150 students",
    price: 499,
    period: "/month",
    desc: "For single-campus Montessori schools",
    highlight: true,
    icon: "🌿",
  },
  {
    name: "Canopy",
    students: "Unlimited students",
    price: 899,
    period: "/month",
    desc: "For large or multi-campus schools",
    highlight: false,
    icon: "🌳",
  },
];

const FEATURES_ALL: string[] = [
  "Observation capture & tagging",
  "Montessori curriculum engine",
  "Mastery tracking & portfolios",
  "Student information system",
  "Attendance & safety",
  "Term reporting",
  "Parent portal",
  "Role-based permissions",
  "Australian compliance (NQS, EYLF)",
  "Unlimited staff accounts",
  "Email & chat support",
  "Data export anytime",
];

// ============================================================
// Shared Components (exported for role pages)
// ============================================================

export function WattleLogo({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="24" cy="12" r="5" fill="#E8A838" />
      <circle cx="16" cy="18" r="4" fill="#EDBA5A" />
      <circle cx="32" cy="18" r="4" fill="#EDBA5A" />
      <circle cx="20" cy="24" r="3.5" fill="#F0C96E" />
      <circle cx="28" cy="24" r="3.5" fill="#F0C96E" />
      <circle cx="24" cy="20" r="4.5" fill="#E8A838" />
      <path
        d="M24 28 C24 28 22 36 20 42 M24 28 C24 28 26 36 28 42 M24 28 L24 44"
        stroke="#5B8C5A"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <ellipse cx="18" cy="36" rx="4" ry="2" fill="#5B8C5A" opacity="0.7" transform="rotate(-20 18 36)" />
      <ellipse cx="30" cy="38" rx="4" ry="2" fill="#5B8C5A" opacity="0.7" transform="rotate(15 30 38)" />
    </svg>
  );
}

export function MarketingShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: "#FEFBF3",
        minHeight: "100vh",
        color: "#2C1810",
        overflowX: "hidden",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Outfit:wght@300;400;500;600;700&display=swap');
        
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-12px); }
        }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes bounce {
          0%, 100% { transform: translateX(-50%) translateY(0); }
          50% { transform: translateX(-50%) translateY(8px); }
        }
        
        ::selection {
          background: rgba(232, 168, 56, 0.3);
          color: #2C1810;
        }
        
        input::placeholder, textarea::placeholder {
          color: rgba(44, 24, 16, 0.3);
        }
      `}</style>
      {children}
    </div>
  );
}

export function MarketingNav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  const links: { href: string; label: string }[] = [
    { href: "/wattleos#features", label: "Features" },
    { href: "/wattleos#roles", label: "Who It's For" },
    { href: "/wattleos#pricing", label: "Pricing" },
    { href: "/wattleos#contact", label: "Contact" },
  ];

  return (
    <nav
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        padding: scrolled ? "12px 24px" : "20px 24px",
        background: scrolled ? "rgba(254, 251, 243, 0.95)" : "transparent",
        backdropFilter: scrolled ? "blur(12px)" : "none",
        borderBottom: scrolled ? "1px solid rgba(232, 168, 56, 0.15)" : "none",
        transition: "all 0.3s ease",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        maxWidth: 1200,
        margin: "0 auto",
      }}
    >
      <Link href="/wattleos" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
        <WattleLogo size={36} />
        <span
          style={{
            fontFamily: "'DM Serif Display', Georgia, serif",
            fontSize: 22,
            color: "#2C1810",
            fontWeight: 400,
            letterSpacing: "-0.02em",
          }}
        >
          WattleOS
        </span>
      </Link>
      <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: 15,
              color: "#5C4A32",
              fontWeight: 400,
              letterSpacing: "0.01em",
              textDecoration: "none",
              transition: "color 0.2s",
            }}
          >
            {l.label}
          </Link>
        ))}
        <Link
          href="/wattleos#contact"
          style={{
            background: "#E8A838",
            color: "#2C1810",
            borderRadius: 8,
            padding: "10px 22px",
            fontFamily: "'Outfit', sans-serif",
            fontSize: 14,
            fontWeight: 600,
            textDecoration: "none",
            letterSpacing: "0.02em",
          }}
        >
          Book a Demo
        </Link>
      </div>
    </nav>
  );
}

export function MarketingFooter() {
  return (
    <footer
      style={{
        background: "#2C1810",
        padding: "60px 24px 40px",
        color: "rgba(254, 251, 243, 0.7)",
      }}
    >
      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "2fr 1fr 1fr 1fr",
          gap: 48,
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <WattleLogo size={32} />
            <span
              style={{
                fontFamily: "'DM Serif Display', Georgia, serif",
                fontSize: 20,
                color: "#FEFBF3",
                fontWeight: 400,
              }}
            >
              WattleOS
            </span>
          </div>
          <p
            style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: 14,
              lineHeight: 1.6,
              maxWidth: 280,
              margin: 0,
            }}
          >
            The Montessori-native school operating system.
            Built in Australia, for Australian schools.
          </p>
          <p
            style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: 13,
              marginTop: 16,
              opacity: 0.5,
            }}
          >
            A product of Ecodia Code
          </p>
        </div>

        {[
          {
            title: "Platform",
            links: [
              { label: "Features", href: "/wattleos#features" },
              { label: "Pricing", href: "/wattleos#pricing" },
              { label: "For Guides", href: "/wattleos/for-guides" },
              { label: "For Parents", href: "/wattleos/for-parents" },
              { label: "For Admin", href: "/wattleos/for-admin" },
            ],
          },
          {
            title: "Company",
            links: [
              { label: "About Ecodia", href: "/" },
              { label: "Blog", href: "#" },
              { label: "Careers", href: "#" },
              { label: "Contact", href: "/wattleos#contact" },
            ],
          },
          {
            title: "Legal",
            links: [
              { label: "Privacy Policy", href: "#" },
              { label: "Terms of Service", href: "#" },
              { label: "Data Processing", href: "#" },
            ],
          },
        ].map((col) => (
          <div key={col.title}>
            <h4
              style={{
                fontFamily: "'Outfit', sans-serif",
                fontSize: 13,
                fontWeight: 600,
                color: "#E8A838",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                marginBottom: 16,
              }}
            >
              {col.title}
            </h4>
            {col.links.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                style={{
                  display: "block",
                  fontFamily: "'Outfit', sans-serif",
                  fontSize: 14,
                  color: "rgba(254, 251, 243, 0.6)",
                  textDecoration: "none",
                  marginBottom: 10,
                  transition: "color 0.2s",
                }}
              >
                {link.label}
              </Link>
            ))}
          </div>
        ))}
      </div>

      <div
        style={{
          maxWidth: 1100,
          margin: "48px auto 0",
          paddingTop: 24,
          borderTop: "1px solid rgba(254, 251, 243, 0.1)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 13, opacity: 0.4, margin: 0 }}>
          © 2026 Ecodia Code Pty Ltd. All rights reserved.
        </p>
        <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 13, opacity: 0.4, margin: 0 }}>
          Made with care in Brisbane, Australia 🇦🇺
        </p>
      </div>
    </footer>
  );
}

// ============================================================
// Page-Specific Sections
// ============================================================

function NavBar({ activeSection, onNavigate }: NavBarProps) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  const links: { id: string; label: string }[] = [
    { id: "features", label: "Features" },
    { id: "roles", label: "Who It's For" },
    { id: "pricing", label: "Pricing" },
    { id: "contact", label: "Contact" },
  ];

  return (
    <nav
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        padding: scrolled ? "12px 24px" : "20px 24px",
        background: scrolled ? "rgba(254, 251, 243, 0.95)" : "transparent",
        backdropFilter: scrolled ? "blur(12px)" : "none",
        borderBottom: scrolled ? "1px solid rgba(232, 168, 56, 0.15)" : "none",
        transition: "all 0.3s ease",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        maxWidth: 1200,
        margin: "0 auto",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <WattleLogo size={36} />
        <span
          style={{
            fontFamily: "'DM Serif Display', Georgia, serif",
            fontSize: 22,
            color: "#2C1810",
            fontWeight: 400,
            letterSpacing: "-0.02em",
          }}
        >
          WattleOS
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
        {links.map((l) => (
          <button
            key={l.id}
            onClick={() => onNavigate(l.id)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontFamily: "'Outfit', sans-serif",
              fontSize: 15,
              color: activeSection === l.id ? "#E8A838" : "#5C4A32",
              fontWeight: activeSection === l.id ? 600 : 400,
              letterSpacing: "0.01em",
              transition: "color 0.2s",
              padding: 0,
            }}
          >
            {l.label}
          </button>
        ))}
        <button
          onClick={() => onNavigate("contact")}
          style={{
            background: "#E8A838",
            color: "#2C1810",
            border: "none",
            borderRadius: 8,
            padding: "10px 22px",
            fontFamily: "'Outfit', sans-serif",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
            transition: "all 0.2s",
            letterSpacing: "0.02em",
          }}
        >
          Book a Demo
        </button>
      </div>
    </nav>
  );
}

function HeroSection() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    setTimeout(() => setVisible(true), 100);
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
        padding: "120px 24px 80px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `
            radial-gradient(ellipse 80% 60% at 50% 0%, rgba(232,168,56,0.12) 0%, transparent 60%),
            radial-gradient(ellipse 60% 40% at 80% 80%, rgba(91,140,90,0.08) 0%, transparent 50%),
            radial-gradient(ellipse 40% 30% at 10% 60%, rgba(232,168,56,0.06) 0%, transparent 50%)
          `,
          zIndex: 0,
        }}
      />

      {Array.from({ length: 12 }).map((_, i) => {
        const width = 6 + (((i * 7 + 3) % 11) / 11) * 10;
        const left = 5 + (((i * 13 + 5) % 17) / 17) * 90;
        const top = 5 + (((i * 11 + 7) % 13) / 13) * 90;
        const opacity = 0.1 + (((i * 3 + 2) % 7) / 7) * 0.15;
        const duration = 4 + (((i * 5 + 1) % 9) / 9) * 4;
        const delay = (((i * 4 + 3) % 7) / 7) * 3;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              width,
              height: width,
              borderRadius: "50%",
              background: `rgba(232, 168, 56, ${opacity})`,
              left: `${left}%`,
              top: `${top}%`,
              animation: `float ${duration}s ease-in-out infinite`,
              animationDelay: `${delay}s`,
              zIndex: 0,
            }}
          />
        );
      })}

      <div
        style={{
          position: "relative",
          zIndex: 1,
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(30px)",
          transition: "all 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            background: "rgba(232, 168, 56, 0.12)",
            borderRadius: 100,
            padding: "6px 18px",
            marginBottom: 32,
            border: "1px solid rgba(232, 168, 56, 0.2)",
          }}
        >
          <span style={{ fontSize: 13, color: "#B8862D", fontFamily: "'Outfit', sans-serif", fontWeight: 500 }}>
            Built for Australian Montessori Schools
          </span>
        </div>

        <h1
          style={{
            fontFamily: "'DM Serif Display', Georgia, serif",
            fontSize: "clamp(40px, 6vw, 72px)",
            color: "#2C1810",
            lineHeight: 1.08,
            fontWeight: 400,
            maxWidth: 800,
            margin: "0 auto 24px",
            letterSpacing: "-0.03em",
          }}
        >
          Your school&apos;s
          <br />
          <span style={{ color: "#E8A838" }}>operating system</span>
        </h1>

        <p
          style={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: "clamp(17px, 2vw, 20px)",
            color: "#6B5744",
            lineHeight: 1.6,
            maxWidth: 540,
            margin: "0 auto 40px",
            fontWeight: 400,
          }}
        >
          From observation to portfolio, attendance to reporting.
          WattleOS is the Montessori-native platform that lets
          guides teach and parents see.
        </p>

        <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
          <Link
            href="#contact"
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
            href="#features"
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
            See Features →
          </Link>
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          bottom: 40,
          left: "50%",
          transform: "translateX(-50%)",
          opacity: 0.4,
          animation: "bounce 2s ease-in-out infinite",
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M12 5v14M5 12l7 7 7-7" stroke="#2C1810" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
    </section>
  );
}

function FeaturesSection() {
  const features: FeatureCardData[] = [
    {
      icon: "👁️",
      title: "Observation Engine",
      desc: "Capture learning moments in under 30 seconds. Photo, tag students, link curriculum. Done.",
      color: "#E8A838",
    },
    {
      icon: "🌳",
      title: "Curriculum Tree",
      desc: "AMI 3–6 built in. EYLF and QCAA cross-mapped. Your Montessori language, not a generic LMS.",
      color: "#5B8C5A",
    },
    {
      icon: "📈",
      title: "Mastery Tracking",
      desc: "Visual progression from introduced to mastered. Spot gaps, celebrate growth, plan presentations.",
      color: "#C17D3A",
    },
    {
      icon: "📋",
      title: "Attendance & Safety",
      desc: "iPad roll call, emergency info, medical alerts. Australian regulatory compliance built in.",
      color: "#8B6F47",
    },
    {
      icon: "📄",
      title: "Term Reports",
      desc: "Pull observations and mastery data into beautiful reports. Review, personalise, publish.",
      color: "#E8A838",
    },
    {
      icon: "👨‍👩‍👧",
      title: "Parent Portal",
      desc: "Living portfolios, attendance updates, direct messaging. Parents see the Montessori magic.",
      color: "#5B8C5A",
    },
  ];

  return (
    <section id="features" style={{ padding: "100px 24px", maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ textAlign: "center", marginBottom: 64 }}>
        <p
          style={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: 13,
            fontWeight: 600,
            color: "#E8A838",
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            marginBottom: 12,
          }}
        >
          Everything Your School Needs
        </p>
        <h2
          style={{
            fontFamily: "'DM Serif Display', Georgia, serif",
            fontSize: "clamp(32px, 4vw, 48px)",
            color: "#2C1810",
            fontWeight: 400,
            letterSpacing: "-0.02em",
            marginBottom: 16,
          }}
        >
          One platform, zero compromises
        </h2>
        <p
          style={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: 17,
            color: "#6B5744",
            maxWidth: 500,
            margin: "0 auto",
            lineHeight: 1.6,
          }}
        >
          Every module designed from the ground up for Montessori pedagogy and Australian schools.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: 24,
        }}
      >
        {features.map((f: FeatureCardData, i: number) => (
          <div
            key={i}
            style={{
              background: "#FEFBF3",
              border: "1px solid rgba(232, 168, 56, 0.12)",
              borderRadius: 16,
              padding: 32,
              transition: "all 0.3s ease",
              cursor: "default",
            }}
            onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => {
              e.currentTarget.style.transform = "translateY(-4px)";
              e.currentTarget.style.boxShadow = "0 12px 40px rgba(44, 24, 16, 0.08)";
              e.currentTarget.style.borderColor = f.color;
            }}
            onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "none";
              e.currentTarget.style.borderColor = "rgba(232, 168, 56, 0.12)";
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: `${f.color}15`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 22,
                marginBottom: 20,
              }}
            >
              {f.icon}
            </div>
            <h3
              style={{
                fontFamily: "'DM Serif Display', Georgia, serif",
                fontSize: 22,
                color: "#2C1810",
                fontWeight: 400,
                marginBottom: 10,
              }}
            >
              {f.title}
            </h3>
            <p
              style={{
                fontFamily: "'Outfit', sans-serif",
                fontSize: 15,
                color: "#6B5744",
                lineHeight: 1.6,
                margin: 0,
              }}
            >
              {f.desc}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function RolesSection() {
  const [activeRole, setActiveRole] = useState<RoleKey>("guides");
  const role = ROLES[activeRole];

  return (
    <section
      id="roles"
      style={{
        padding: "100px 24px",
        background: "linear-gradient(180deg, #FEFBF3 0%, #F8F1E4 100%)",
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
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
            Built for Every Role
          </p>
          <h2
            style={{
              fontFamily: "'DM Serif Display', Georgia, serif",
              fontSize: "clamp(32px, 4vw, 48px)",
              color: "#2C1810",
              fontWeight: 400,
              letterSpacing: "-0.02em",
            }}
          >
            Who is WattleOS for?
          </h2>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 8,
            marginBottom: 48,
            flexWrap: "wrap",
          }}
        >
          {(Object.entries(ROLES) as [RoleKey, RoleData][]).map(([key, r]) => (
            <button
              key={key}
              onClick={() => setActiveRole(key)}
              style={{
                background: activeRole === key ? r.color : "rgba(44, 24, 16, 0.05)",
                color: activeRole === key ? "#fff" : "#5C4A32",
                border: "none",
                borderRadius: 100,
                padding: "10px 24px",
                fontFamily: "'Outfit', sans-serif",
                fontSize: 15,
                fontWeight: activeRole === key ? 600 : 400,
                cursor: "pointer",
                transition: "all 0.25s ease",
                letterSpacing: "0.01em",
              }}
            >
              {r.title}
            </button>
          ))}
        </div>

        <div key={activeRole} style={{ animation: "fadeIn 0.3s ease" }}>
          <p
            style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: 20,
              color: role.color,
              textAlign: "center",
              marginBottom: 20,
              fontWeight: 500,
            }}
          >
            {role.subtitle}
          </p>

          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <Link
              href={role.href}
              style={{
                fontFamily: "'Outfit', sans-serif",
                fontSize: 14,
                fontWeight: 600,
                color: role.color,
                textDecoration: "none",
                borderBottom: `2px solid ${role.color}`,
                paddingBottom: 2,
              }}
            >
              Learn more about WattleOS {role.title.toLowerCase()} →
            </Link>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 20,
            }}
          >
            {role.features.map((f: RoleFeature, i: number) => (
              <div
                key={i}
                style={{
                  background: "#fff",
                  borderRadius: 14,
                  padding: 28,
                  border: "1px solid rgba(232, 168, 56, 0.1)",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => {
                  e.currentTarget.style.borderColor = role.color;
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => {
                  e.currentTarget.style.borderColor = "rgba(232, 168, 56, 0.1)";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                <div style={{ fontSize: 28, marginBottom: 14 }}>{f.icon}</div>
                <h4
                  style={{
                    fontFamily: "'DM Serif Display', Georgia, serif",
                    fontSize: 19,
                    color: "#2C1810",
                    fontWeight: 400,
                    marginBottom: 8,
                  }}
                >
                  {f.title}
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
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function PricingSection() {
  return (
    <section id="pricing" style={{ padding: "100px 24px", maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ textAlign: "center", marginBottom: 56 }}>
        <p
          style={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: 13,
            fontWeight: 600,
            color: "#E8A838",
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            marginBottom: 12,
          }}
        >
          Simple, Transparent Pricing
        </p>
        <h2
          style={{
            fontFamily: "'DM Serif Display', Georgia, serif",
            fontSize: "clamp(32px, 4vw, 48px)",
            color: "#2C1810",
            fontWeight: 400,
            letterSpacing: "-0.02em",
            marginBottom: 16,
          }}
        >
          One feature set. Every plan.
        </h2>
        <p
          style={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: 17,
            color: "#6B5744",
            maxWidth: 480,
            margin: "0 auto",
            lineHeight: 1.6,
          }}
        >
          No feature gating. No hidden costs. Every school gets the full platform — pricing scales with your student count.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 20,
          marginBottom: 56,
        }}
      >
        {PRICING.map((plan: PricingPlan, i: number) => (
          <div
            key={i}
            style={{
              background: plan.highlight ? "#2C1810" : "#FEFBF3",
              borderRadius: 20,
              padding: 36,
              border: plan.highlight ? "none" : "1px solid rgba(232, 168, 56, 0.15)",
              position: "relative",
              overflow: "hidden",
              transition: "all 0.3s ease",
            }}
            onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => {
              if (!plan.highlight) {
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.boxShadow = "0 16px 48px rgba(44, 24, 16, 0.1)";
              }
            }}
            onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => {
              if (!plan.highlight) {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }
            }}
          >
            {plan.highlight && (
              <div
                style={{
                  position: "absolute",
                  top: 16,
                  right: 16,
                  background: "#E8A838",
                  color: "#2C1810",
                  fontFamily: "'Outfit', sans-serif",
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "4px 12px",
                  borderRadius: 100,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                Most Popular
              </div>
            )}
            <div style={{ fontSize: 32, marginBottom: 16 }}>{plan.icon}</div>
            <h3
              style={{
                fontFamily: "'DM Serif Display', Georgia, serif",
                fontSize: 28,
                color: plan.highlight ? "#FEFBF3" : "#2C1810",
                fontWeight: 400,
                marginBottom: 4,
              }}
            >
              {plan.name}
            </h3>
            <p
              style={{
                fontFamily: "'Outfit', sans-serif",
                fontSize: 14,
                color: plan.highlight ? "rgba(254,251,243,0.6)" : "#8B7355",
                marginBottom: 24,
              }}
            >
              {plan.students}
            </p>
            <div style={{ marginBottom: 24 }}>
              <span
                style={{
                  fontFamily: "'DM Serif Display', Georgia, serif",
                  fontSize: 48,
                  color: plan.highlight ? "#E8A838" : "#2C1810",
                  fontWeight: 400,
                  lineHeight: 1,
                }}
              >
                ${plan.price}
              </span>
              <span
                style={{
                  fontFamily: "'Outfit', sans-serif",
                  fontSize: 16,
                  color: plan.highlight ? "rgba(254,251,243,0.5)" : "#8B7355",
                }}
              >
                {plan.period}
              </span>
            </div>
            <p
              style={{
                fontFamily: "'Outfit', sans-serif",
                fontSize: 14,
                color: plan.highlight ? "rgba(254,251,243,0.7)" : "#6B5744",
                lineHeight: 1.5,
                marginBottom: 28,
              }}
            >
              {plan.desc}
            </p>
            <Link
              href="#contact"
              style={{
                display: "block",
                width: "100%",
                background: plan.highlight ? "#E8A838" : "transparent",
                color: "#2C1810",
                border: plan.highlight ? "none" : "2px solid rgba(44, 24, 16, 0.15)",
                borderRadius: 10,
                padding: "14px 24px",
                fontFamily: "'Outfit', sans-serif",
                fontSize: 15,
                fontWeight: 600,
                textDecoration: "none",
                textAlign: "center",
                letterSpacing: "0.02em",
                boxSizing: "border-box",
              }}
            >
              Get Started
            </Link>
          </div>
        ))}
      </div>

      <div
        style={{
          background: "#FEFBF3",
          border: "1px solid rgba(232, 168, 56, 0.12)",
          borderRadius: 16,
          padding: 40,
        }}
      >
        <h4
          style={{
            fontFamily: "'DM Serif Display', Georgia, serif",
            fontSize: 22,
            color: "#2C1810",
            fontWeight: 400,
            marginBottom: 24,
            textAlign: "center",
          }}
        >
          Everything included in every plan
        </h4>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "12px 32px",
          }}
        >
          {FEATURES_ALL.map((f: string, i: number) => (
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
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <circle cx="9" cy="9" r="9" fill="rgba(91, 140, 90, 0.12)" />
                <path d="M5.5 9l2.5 2.5L12.5 7" stroke="#5B8C5A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {f}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ContactSection() {
  const [formState, setFormState] = useState<FormState>({
    name: "",
    school: "",
    email: "",
    phone: "",
    students: "",
    message: "",
  });

  const handleChange = (field: FormField, value: string) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const inputFields: { field: FormField; label: string; type: string; placeholder: string }[] = [
    { field: "name", label: "Your Name", type: "text", placeholder: "Jane Smith" },
    { field: "school", label: "School Name", type: "text", placeholder: "Banksia Montessori" },
    { field: "email", label: "Email", type: "email", placeholder: "jane@banksia.edu.au" },
    { field: "phone", label: "Phone", type: "tel", placeholder: "04XX XXX XXX" },
  ];

  return (
    <section
      id="contact"
      style={{
        padding: "100px 24px",
        background: "linear-gradient(180deg, #F8F1E4 0%, #FEFBF3 100%)",
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
            Get in Touch
          </p>
          <h2
            style={{
              fontFamily: "'DM Serif Display', Georgia, serif",
              fontSize: "clamp(32px, 4vw, 48px)",
              color: "#2C1810",
              fontWeight: 400,
              letterSpacing: "-0.02em",
              marginBottom: 16,
            }}
          >
            Ready to see WattleOS?
          </h2>
          <p
            style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: 17,
              color: "#6B5744",
              lineHeight: 1.6,
            }}
          >
            Book a personalised demo for your school.
            We&apos;ll walk you through the platform and answer all your questions.
          </p>
        </div>

        <div
          style={{
            background: "#fff",
            borderRadius: 20,
            padding: 40,
            border: "1px solid rgba(232, 168, 56, 0.12)",
            boxShadow: "0 8px 32px rgba(44, 24, 16, 0.04)",
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            {inputFields.map((input) => (
              <div key={input.field}>
                <label
                  style={{
                    display: "block",
                    fontFamily: "'Outfit', sans-serif",
                    fontSize: 13,
                    fontWeight: 500,
                    color: "#5C4A32",
                    marginBottom: 6,
                  }}
                >
                  {input.label}
                </label>
                <input
                  type={input.type}
                  placeholder={input.placeholder}
                  value={formState[input.field]}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange(input.field, e.target.value)}
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    border: "1px solid rgba(44, 24, 16, 0.12)",
                    borderRadius: 10,
                    fontFamily: "'Outfit', sans-serif",
                    fontSize: 15,
                    color: "#2C1810",
                    background: "#FEFBF3",
                    outline: "none",
                    transition: "border-color 0.2s",
                    boxSizing: "border-box",
                  }}
                  onFocus={(e: React.FocusEvent<HTMLInputElement>) => (e.currentTarget.style.borderColor = "#E8A838")}
                  onBlur={(e: React.FocusEvent<HTMLInputElement>) => (e.currentTarget.style.borderColor = "rgba(44, 24, 16, 0.12)")}
                />
              </div>
            ))}
          </div>

          <div style={{ marginBottom: 16 }}>
            <label
              style={{
                display: "block",
                fontFamily: "'Outfit', sans-serif",
                fontSize: 13,
                fontWeight: 500,
                color: "#5C4A32",
                marginBottom: 6,
              }}
            >
              Approximate Student Count
            </label>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {["Under 30", "30–80", "80–150", "150+"].map((opt: string) => (
                <button
                  key={opt}
                  onClick={() => handleChange("students", opt)}
                  type="button"
                  style={{
                    background: formState.students === opt ? "#E8A838" : "#FEFBF3",
                    color: formState.students === opt ? "#2C1810" : "#5C4A32",
                    border: `1px solid ${formState.students === opt ? "#E8A838" : "rgba(44, 24, 16, 0.12)"}`,
                    borderRadius: 8,
                    padding: "8px 18px",
                    fontFamily: "'Outfit', sans-serif",
                    fontSize: 14,
                    cursor: "pointer",
                    transition: "all 0.2s",
                    fontWeight: formState.students === opt ? 600 : 400,
                  }}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 24 }}>
            <label
              style={{
                display: "block",
                fontFamily: "'Outfit', sans-serif",
                fontSize: 13,
                fontWeight: 500,
                color: "#5C4A32",
                marginBottom: 6,
              }}
            >
              Anything else we should know?
            </label>
            <textarea
              placeholder="Tell us about your school..."
              value={formState.message}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleChange("message", e.target.value)}
              rows={4}
              style={{
                width: "100%",
                padding: "12px 14px",
                border: "1px solid rgba(44, 24, 16, 0.12)",
                borderRadius: 10,
                fontFamily: "'Outfit', sans-serif",
                fontSize: 15,
                color: "#2C1810",
                background: "#FEFBF3",
                outline: "none",
                resize: "vertical",
                transition: "border-color 0.2s",
                boxSizing: "border-box",
              }}
              onFocus={(e: React.FocusEvent<HTMLTextAreaElement>) => (e.currentTarget.style.borderColor = "#E8A838")}
              onBlur={(e: React.FocusEvent<HTMLTextAreaElement>) => (e.currentTarget.style.borderColor = "rgba(44, 24, 16, 0.12)")}
            />
          </div>

          <button
            type="button"
            style={{
              width: "100%",
              background: "#2C1810",
              color: "#FEFBF3",
              border: "none",
              borderRadius: 10,
              padding: "16px 24px",
              fontFamily: "'Outfit', sans-serif",
              fontSize: 16,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s",
              letterSpacing: "0.02em",
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
              marginBottom: 0,
            }}
          >
            Or email us directly at{" "}
            <a href="mailto:hello@wattleos.au" style={{ color: "#E8A838", fontWeight: 500, textDecoration: "none" }}>
              hello@wattleos.au
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer
      style={{
        background: "#2C1810",
        padding: "60px 24px 40px",
        color: "rgba(254, 251, 243, 0.7)",
      }}
    >
      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "2fr 1fr 1fr 1fr",
          gap: 48,
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <WattleLogo size={32} />
            <span
              style={{
                fontFamily: "'DM Serif Display', Georgia, serif",
                fontSize: 20,
                color: "#FEFBF3",
                fontWeight: 400,
              }}
            >
              WattleOS
            </span>
          </div>
          <p
            style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: 14,
              lineHeight: 1.6,
              maxWidth: 280,
              margin: 0,
            }}
          >
            The Montessori-native school operating system.
            Built in Australia, for Australian schools.
          </p>
          <p
            style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: 13,
              marginTop: 16,
              opacity: 0.5,
            }}
          >
            A product of Ecodia Code
          </p>
        </div>

        {[
          {
            title: "Platform",
            links: [
              { label: "Features", href: "/wattleos#features" },
              { label: "Pricing", href: "/wattleos#pricing" },
              { label: "For Guides", href: "/wattleos/for-guides" },
              { label: "For Parents", href: "/wattleos/for-parents" },
              { label: "For Admin", href: "/wattleos/for-admin" },
            ],
          },
          {
            title: "Company",
            links: [
              { label: "About Ecodia", href: "/" },
              { label: "Blog", href: "#" },
              { label: "Careers", href: "#" },
              { label: "Contact", href: "/wattleos#contact" },
            ],
          },
          {
            title: "Legal",
            links: [
              { label: "Privacy Policy", href: "#" },
              { label: "Terms of Service", href: "#" },
              { label: "Data Processing", href: "#" },
            ],
          },
        ].map((col) => (
          <div key={col.title}>
            <h4
              style={{
                fontFamily: "'Outfit', sans-serif",
                fontSize: 13,
                fontWeight: 600,
                color: "#E8A838",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                marginBottom: 16,
              }}
            >
              {col.title}
            </h4>
            {col.links.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                style={{
                  display: "block",
                  fontFamily: "'Outfit', sans-serif",
                  fontSize: 14,
                  color: "rgba(254, 251, 243, 0.6)",
                  textDecoration: "none",
                  marginBottom: 10,
                }}
              >
                {link.label}
              </Link>
            ))}
          </div>
        ))}
      </div>

      <div
        style={{
          maxWidth: 1100,
          margin: "48px auto 0",
          paddingTop: 24,
          borderTop: "1px solid rgba(254, 251, 243, 0.1)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 13, opacity: 0.4, margin: 0 }}>
          © 2026 Ecodia Code Pty Ltd. All rights reserved.
        </p>
        <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 13, opacity: 0.4, margin: 0 }}>
          Made with care in Brisbane, Australia 🇦🇺
        </p>
      </div>
    </footer>
  );
}

// ============================================================
// Main Page Export
// ============================================================

export default function WattleOSMarketing() {
  const [activeSection, setActiveSection] = useState("");

  const handleNavigate = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        }
      },
      { threshold: 0.3 }
    );

    const sectionIds = ["features", "roles", "pricing", "contact"];
    const elements: Element[] = [];

    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) {
        observer.observe(el);
        elements.push(el);
      }
    });

    return () => {
      elements.forEach((el) => observer.unobserve(el));
      observer.disconnect();
    };
  }, []);

  return (
    <MarketingShell>
      <NavBar activeSection={activeSection} onNavigate={handleNavigate} />
      <HeroSection />
      <FeaturesSection />
      <RolesSection />
      <PricingSection />
      <ContactSection />
      <Footer />
    </MarketingShell>
  );
}