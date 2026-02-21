"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

// ============================================================
// Intersection Observer hook for reveal animations
// ============================================================

export function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -60px 0px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return { ref, visible };
}

// ============================================================
// Wattle Logo SVG
// ============================================================

export function WattleLogo({ size = 32 }: { size?: number }) {
  return (
    <img
      src="/wattle-logo.png"
      alt="WattleOS"
      width={size}
      height={size}
      style={{ objectFit: "contain" }}
    />
  );
}

// ============================================================
// SVG Icons - organic, hand-drawn feel
// ============================================================

export function IconObserve({
  size = 24,
  color = "currentColor",
}: {
  size?: number;
  color?: string;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <circle
        cx="16"
        cy="14"
        r="8"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle cx="16" cy="14" r="3" fill={color} opacity="0.2" />
      <circle cx="16" cy="14" r="1.2" fill={color} />
      <path
        d="M22 22l6 6"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconTree({
  size = 24,
  color = "currentColor",
}: {
  size?: number;
  color?: string;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <path
        d="M16 4c-4 6-8 10-8 16a8 8 0 0016 0c0-6-4-10-8-16z"
        fill={color}
        opacity="0.12"
        stroke={color}
        strokeWidth="1.5"
      />
      <path
        d="M16 14v14M12 20l4-4 4 4"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconMastery({
  size = 24,
  color = "currentColor",
}: {
  size?: number;
  color?: string;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <rect
        x="4"
        y="18"
        width="5"
        height="10"
        rx="1.5"
        fill={color}
        opacity="0.15"
        stroke={color}
        strokeWidth="1.2"
      />
      <rect
        x="13.5"
        y="12"
        width="5"
        height="16"
        rx="1.5"
        fill={color}
        opacity="0.25"
        stroke={color}
        strokeWidth="1.2"
      />
      <rect
        x="23"
        y="6"
        width="5"
        height="22"
        rx="1.5"
        fill={color}
        opacity="0.4"
        stroke={color}
        strokeWidth="1.2"
      />
    </svg>
  );
}

export function IconShield({
  size = 24,
  color = "currentColor",
}: {
  size?: number;
  color?: string;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <path
        d="M16 3l10 4v8c0 6.5-4.5 12-10 14C10.5 27 6 21.5 6 15V7l10-4z"
        fill={color}
        opacity="0.1"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M11 16l3 3 7-7"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconReport({
  size = 24,
  color = "currentColor",
}: {
  size?: number;
  color?: string;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <rect
        x="6"
        y="3"
        width="20"
        height="26"
        rx="3"
        fill={color}
        opacity="0.08"
        stroke={color}
        strokeWidth="1.5"
      />
      <path
        d="M11 10h10M11 15h7M11 20h10"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconFamily({
  size = 24,
  color = "currentColor",
}: {
  size?: number;
  color?: string;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <circle
        cx="11"
        cy="10"
        r="4"
        fill={color}
        opacity="0.15"
        stroke={color}
        strokeWidth="1.3"
      />
      <circle
        cx="21"
        cy="10"
        r="4"
        fill={color}
        opacity="0.15"
        stroke={color}
        strokeWidth="1.3"
      />
      <circle
        cx="16"
        cy="22"
        r="3.5"
        fill={color}
        opacity="0.2"
        stroke={color}
        strokeWidth="1.3"
      />
      <path
        d="M11 14v3a5 5 0 005 5M21 14v3a5 5 0 01-5 5"
        stroke={color}
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconCalendar({
  size = 24,
  color = "currentColor",
}: {
  size?: number;
  color?: string;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <rect
        x="4"
        y="6"
        width="24"
        height="22"
        rx="3"
        fill={color}
        opacity="0.08"
        stroke={color}
        strokeWidth="1.5"
      />
      <path d="M4 13h24" stroke={color} strokeWidth="1.5" />
      <path
        d="M10 3v6M22 3v6"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="10" cy="19" r="1.5" fill={color} opacity="0.4" />
      <circle cx="16" cy="19" r="1.5" fill={color} opacity="0.4" />
      <circle cx="22" cy="19" r="1.5" fill={color} opacity="0.4" />
    </svg>
  );
}

export function IconChat({
  size = 24,
  color = "currentColor",
}: {
  size?: number;
  color?: string;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <path
        d="M6 8a3 3 0 013-3h14a3 3 0 013 3v10a3 3 0 01-3 3h-6l-5 4v-4H9a3 3 0 01-3-3V8z"
        fill={color}
        opacity="0.1"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M12 11h8M12 15h5"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconEnroll({
  size = 24,
  color = "currentColor",
}: {
  size?: number;
  color?: string;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <path
        d="M8 6h16a2 2 0 012 2v16a2 2 0 01-2 2H8a2 2 0 01-2-2V8a2 2 0 012-2z"
        fill={color}
        opacity="0.08"
        stroke={color}
        strokeWidth="1.5"
      />
      <path
        d="M12 16h8M16 12v8"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconOSHC({
  size = 24,
  color = "currentColor",
}: {
  size?: number;
  color?: string;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <circle
        cx="16"
        cy="16"
        r="12"
        fill={color}
        opacity="0.08"
        stroke={color}
        strokeWidth="1.5"
      />
      <path
        d="M16 8v8l5 3"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconBilling({
  size = 24,
  color = "currentColor",
}: {
  size?: number;
  color?: string;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <rect
        x="4"
        y="8"
        width="24"
        height="16"
        rx="3"
        fill={color}
        opacity="0.08"
        stroke={color}
        strokeWidth="1.5"
      />
      <path d="M4 14h24" stroke={color} strokeWidth="1.5" />
      <path
        d="M8 20h6"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconPermissions({
  size = 24,
  color = "currentColor",
}: {
  size?: number;
  color?: string;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <rect
        x="8"
        y="14"
        width="16"
        height="14"
        rx="3"
        fill={color}
        opacity="0.1"
        stroke={color}
        strokeWidth="1.5"
      />
      <path
        d="M12 14v-3a4 4 0 018 0v3"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="16" cy="21" r="2" fill={color} opacity="0.4" />
    </svg>
  );
}

export function IconCamera({
  size = 24,
  color = "currentColor",
}: {
  size?: number;
  color?: string;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <path
        d="M4 11a3 3 0 013-3h3l2-3h8l2 3h3a3 3 0 013 3v12a3 3 0 01-3 3H7a3 3 0 01-3-3V11z"
        fill={color}
        opacity="0.08"
        stroke={color}
        strokeWidth="1.5"
      />
      <circle cx="16" cy="17" r="5" stroke={color} strokeWidth="1.5" />
      <circle cx="16" cy="17" r="2" fill={color} opacity="0.25" />
    </svg>
  );
}

export function IconPortfolio({
  size = 24,
  color = "currentColor",
}: {
  size?: number;
  color?: string;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <rect
        x="4"
        y="4"
        width="24"
        height="24"
        rx="3"
        fill={color}
        opacity="0.06"
        stroke={color}
        strokeWidth="1.5"
      />
      <rect
        x="8"
        y="8"
        width="8"
        height="6"
        rx="1"
        fill={color}
        opacity="0.15"
      />
      <path
        d="M8 18h16M8 22h10"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconPipeline({
  size = 24,
  color = "currentColor",
}: {
  size?: number;
  color?: string;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <circle
        cx="8"
        cy="16"
        r="4"
        fill={color}
        opacity="0.12"
        stroke={color}
        strokeWidth="1.3"
      />
      <circle
        cx="16"
        cy="16"
        r="4"
        fill={color}
        opacity="0.2"
        stroke={color}
        strokeWidth="1.3"
      />
      <circle
        cx="24"
        cy="16"
        r="4"
        fill={color}
        opacity="0.35"
        stroke={color}
        strokeWidth="1.3"
      />
      <path
        d="M12 16h-0M20 16h-0"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconCompliance({
  size = 24,
  color = "currentColor",
}: {
  size?: number;
  color?: string;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <rect
        x="5"
        y="4"
        width="22"
        height="24"
        rx="3"
        fill={color}
        opacity="0.06"
        stroke={color}
        strokeWidth="1.5"
      />
      <path
        d="M10 12l3 3 6-6"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 22h12"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ============================================================
// Decorative Illustrations
// ============================================================

export function PinkTowerIllustration({
  opacity = 0.18,
}: {
  opacity?: number;
}) {
  return (
    <svg
      width="120"
      height="160"
      viewBox="0 0 120 160"
      fill="none"
      style={{ opacity }}
    >
      {[...Array(10)].map((_, i) => {
        const size = 12 + i * 6;
        const x = 60 - size / 2;
        const y = 150 - (10 - i) * 14;
        return (
          <rect
            key={i}
            x={x}
            y={y}
            width={size}
            height={12}
            rx={2}
            fill="#D4877F"
          />
        );
      })}
    </svg>
  );
}

export function GoldenBeadsIllustration({
  opacity = 0.15,
}: {
  opacity?: number;
}) {
  return (
    <svg
      width="140"
      height="140"
      viewBox="0 0 140 140"
      fill="none"
      style={{ opacity }}
    >
      {[...Array(5)].map((_, row) =>
        [...Array(5)].map((_, col) => (
          <circle
            key={`${row}-${col}`}
            cx={30 + col * 20}
            cy={30 + row * 20}
            r={6}
            fill="#E8A838"
          />
        )),
      )}
      {[...Array(4)].map((_, i) => (
        <line
          key={`h${i}`}
          x1="30"
          y1={40 + i * 20}
          x2="110"
          y2={40 + i * 20}
          stroke="#E8A838"
          strokeWidth="1.5"
          opacity="0.4"
        />
      ))}
      {[...Array(4)].map((_, i) => (
        <line
          key={`v${i}`}
          x1={40 + i * 20}
          y1="30"
          x2={40 + i * 20}
          y2="110"
          stroke="#E8A838"
          strokeWidth="1.5"
          opacity="0.4"
        />
      ))}
    </svg>
  );
}

// ============================================================
// Shell & Global Styles
// ============================================================

export function MarketingShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: "#FEFCF6",
        minHeight: "100vh",
        color: "#2C1810",
        overflowX: "hidden",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,500;0,9..144,600;0,9..144,700;1,9..144,400&family=Outfit:wght@300;400;500;600;700&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html { scroll-behavior: smooth; }
        ::selection { background: rgba(232, 168, 56, 0.25); color: #2C1810; }
        input::placeholder, textarea::placeholder { color: rgba(44, 24, 16, 0.35); }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes gentleFloat { 0%, 100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-8px) rotate(1deg); } }
        @keyframes scrollHint { 0%, 100% { transform: translateY(0); opacity: 0.4; } 50% { transform: translateY(6px); opacity: 0.7; } }
        .hover-lift { transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s ease; }
        .hover-lift:hover { transform: translateY(-4px); box-shadow: 0 16px 48px rgba(44, 24, 16, 0.08); }
        .section-reveal { opacity: 0; transform: translateY(32px); transition: opacity 0.7s ease, transform 0.7s ease; }
        .section-reveal.visible { opacity: 1; transform: translateY(0); }
        @media (max-width: 768px) {
          .desktop-grid { grid-template-columns: 1fr !important; }
          .desktop-two-col { grid-template-columns: 1fr !important; }
          .footer-grid { grid-template-columns: 1fr 1fr !important; }
          .hero-heading { font-size: 38px !important; }
          .nav-links { display: none !important; }
          .pricing-calc-layout { flex-direction: column !important; }
          .page-hero-heading { font-size: 36px !important; }
        }
      `}</style>
      {children}
    </div>
  );
}

// ============================================================
// Navigation
// ============================================================

export function MarketingNav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <nav
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        padding: scrolled ? "10px 24px" : "18px 24px",
        background: scrolled ? "rgba(254, 252, 246, 0.92)" : "transparent",
        backdropFilter: scrolled ? "blur(16px)" : "none",
        borderBottom: scrolled ? "1px solid rgba(232, 168, 56, 0.12)" : "none",
        transition: "all 0.35s ease",
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            textDecoration: "none",
          }}
        >
          <WattleLogo size={34} />
          <span
            style={{
              fontFamily: "'Fraunces', Georgia, serif",
              fontSize: 22,
              color: "#2C1810",
              fontWeight: 500,
            }}
          >
            WattleOS
          </span>
        </Link>
        <div
          className="nav-links"
          style={{ display: "flex", alignItems: "center", gap: 28 }}
        >
          {[
            { href: "/#features", label: "Features" },
            { href: "/wattleos/curriculum", label: "Curriculum" },
            { href: "/#pricing", label: "Pricing" },
            { href: "/wattleos/for-guides", label: "For Guides" },
            { href: "/wattleos/for-parents", label: "For Parents" },
          ].map((l) => (
            <Link
              key={l.href}
              href={l.href}
              style={{
                fontFamily: "'Outfit', sans-serif",
                fontSize: 14,
                color: "#5C4A32",
                fontWeight: 400,
                textDecoration: "none",
                transition: "color 0.2s",
              }}
            >
              {l.label}
            </Link>
          ))}
          <Link
            href="/#demo"
            style={{
              background: "#2C1810",
              color: "#FEFCF6",
              borderRadius: 8,
              padding: "10px 24px",
              fontFamily: "'Outfit', sans-serif",
              fontSize: 14,
              fontWeight: 600,
              textDecoration: "none",
              letterSpacing: "0.01em",
            }}
          >
            Book a Demo
          </Link>
        </div>
      </div>
    </nav>
  );
}

// ============================================================
// Footer
// ============================================================

export function MarketingFooter() {
  return (
    <footer
      style={{
        background: "#2C1810",
        padding: "64px 24px 44px",
        color: "rgba(254, 252, 246, 0.65)",
      }}
    >
      <div
        className="footer-grid"
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "2fr 1fr 1fr 1fr",
          gap: 48,
        }}
      >
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 16,
            }}
          >
            <WattleLogo size={30} />
            <span
              style={{
                fontFamily: "'Fraunces', Georgia, serif",
                fontSize: 20,
                color: "#FEFCF6",
                fontWeight: 500,
              }}
            >
              WattleOS
            </span>
          </div>
          <p
            style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: 14,
              lineHeight: 1.65,
              maxWidth: 280,
              margin: "0 0 16px",
            }}
          >
            The Montessori-native school operating system. Built in Australia,
            for Australian schools.
          </p>
          <p
            style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: 13,
              opacity: 0.65,
              margin: 0,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            An
            <span style={{ display: "inline-flex" }}>
              <span
                style={{
                  display: "inline-block",
                  background: "#FFFFFF",
                  color: "#000000",
                  padding: "2px 8px",
                  fontSize: 13,
                  fontWeight: 600,
                  letterSpacing: "0.02em",
                  lineHeight: 1.4,
                }}
              >
                Ecodia
              </span>
              <span
                style={{
                  display: "inline-block",
                  background: "#000000",
                  color: "#FFFFFF",
                  padding: "2px 8px",
                  fontSize: 13,
                  fontWeight: 600,
                  letterSpacing: "0.02em",
                  lineHeight: 1.4,
                }}
              >
                Code
              </span>
            </span>
            project
          </p>
        </div>

        {[
          {
            title: "Platform",
            links: [
              { label: "Features", href: "/#features" },
              { label: "Curriculum", href: "/wattleos/curriculum" },
              { label: "Pricing", href: "/#pricing" },
              { label: "For Guides", href: "/wattleos/for-guides" },
              { label: "For Parents", href: "/wattleos/for-parents" },
              { label: "For Staff", href: "/wattleos/for-staff" },
              { label: "For Admin", href: "/wattleos/for-admin" },
            ],
          },
          {
            title: "Company",
            links: [
              { label: "About Ecodia", href: "/" },
              { label: "Contact", href: "/#demo" },
              { label: "Blog", href: "#" },
            ],
          },
          {
            title: "Legal",
            links: [
              { label: "Privacy Policy", href: "/legal/privacy" },
              { label: "Terms of Service", href: "/legal/terms" },
              { label: "Data Residency", href: "/legal/data-processing" },
            ],
          },
        ].map((col) => (
          <div key={col.title}>
            <h4
              style={{
                fontFamily: "'Outfit', sans-serif",
                fontSize: 12,
                fontWeight: 600,
                color: "#E8A838",
                textTransform: "uppercase",
                letterSpacing: "0.12em",
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
                  color: "rgba(254, 252, 246, 0.55)",
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
          borderTop: "1px solid rgba(254, 252, 246, 0.08)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <p
          style={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: 13,
            opacity: 0.35,
            margin: 0,
          }}
        >
          © 2026 Ecodia Pty Ltd. All rights reserved.
        </p>
        <p
          style={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: 13,
            opacity: 0.35,
            margin: 0,
          }}
        >
          Made on Gubbi Gubbi country - Sunshine Coast, Australia 🇦🇺
        </p>
      </div>
    </footer>
  );
}

// ============================================================
// Shared Section Components
// ============================================================

export function SectionLabel({
  children,
  color = "#E8A838",
}: {
  children: React.ReactNode;
  color?: string;
}) {
  return (
    <p
      style={{
        fontFamily: "'Outfit', sans-serif",
        fontSize: 13,
        fontWeight: 600,
        color,
        textTransform: "uppercase",
        letterSpacing: "0.14em",
        marginBottom: 14,
      }}
    >
      {children}
    </p>
  );
}

export function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        fontFamily: "'Fraunces', Georgia, serif",
        fontSize: "clamp(30px, 4vw, 46px)",
        color: "#2C1810",
        fontWeight: 400,
        letterSpacing: "-0.02em",
        marginBottom: 16,
        lineHeight: 1.2,
      }}
    >
      {children}
    </h2>
  );
}

export function SectionDescription({
  children,
  maxWidth = 540,
}: {
  children: React.ReactNode;
  maxWidth?: number;
}) {
  return (
    <p
      style={{
        fontFamily: "'Outfit', sans-serif",
        fontSize: 17,
        color: "#6B5744",
        maxWidth,
        margin: "0 auto",
        lineHeight: 1.65,
      }}
    >
      {children}
    </p>
  );
}

export function PageHero({
  label,
  labelColor,
  title,
  description,
  ctaText = "Book a Demo",
  ctaHref = "/#demo",
}: {
  label: string;
  labelColor: string;
  title: React.ReactNode;
  description: string;
  ctaText?: string;
  ctaHref?: string;
}) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    setTimeout(() => setVisible(true), 150);
  }, []);

  return (
    <section
      style={{
        padding: "160px 24px 80px",
        textAlign: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 0,
          background: `radial-gradient(ellipse 70% 50% at 50% 0%, ${labelColor}12 0%, transparent 70%)`,
        }}
      />
      <div
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: 700,
          margin: "0 auto",
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(24px)",
          transition: "all 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            background: `${labelColor}0D`,
            borderRadius: 100,
            padding: "7px 20px",
            marginBottom: 32,
            border: `1px solid ${labelColor}1A`,
          }}
        >
          <span
            style={{
              fontSize: 13,
              color: labelColor,
              fontFamily: "'Outfit', sans-serif",
              fontWeight: 600,
            }}
          >
            {label}
          </span>
        </div>
        <h1
          className="page-hero-heading"
          style={{
            fontFamily: "'Fraunces', Georgia, serif",
            fontSize: "clamp(38px, 5.5vw, 58px)",
            color: "#2C1810",
            lineHeight: 1.1,
            fontWeight: 400,
            margin: "0 auto 24px",
            letterSpacing: "-0.03em",
          }}
        >
          {title}
        </h1>
        <p
          style={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: "clamp(16px, 2vw, 19px)",
            color: "#6B5744",
            lineHeight: 1.65,
            maxWidth: 520,
            margin: "0 auto 36px",
          }}
        >
          {description}
        </p>
        <Link
          href={ctaHref}
          style={{
            display: "inline-block",
            background: "#2C1810",
            color: "#FEFCF6",
            borderRadius: 10,
            padding: "15px 32px",
            fontFamily: "'Outfit', sans-serif",
            fontSize: 15,
            fontWeight: 600,
            textDecoration: "none",
            letterSpacing: "0.01em",
          }}
        >
          {ctaText}
        </Link>
      </div>
    </section>
  );
}

export function FeatureRow({
  icon,
  title,
  description,
  reverse = false,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  reverse?: boolean;
  color: string;
}) {
  const reveal = useReveal();

  return (
    <div
      ref={reveal.ref}
      className={`section-reveal ${reveal.visible ? "visible" : ""}`}
      style={{
        display: "flex",
        flexDirection: reverse ? "row-reverse" : "row",
        gap: 48,
        alignItems: "center",
        padding: "48px 0",
        flexWrap: "wrap",
      }}
    >
      {/* Visual block */}
      <div
        style={{
          flex: "1 1 300px",
          background: `${color}08`,
          borderRadius: 20,
          padding: "56px 40px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: `1px solid ${color}12`,
        }}
      >
        <div style={{ transform: "scale(2.5)" }}>{icon}</div>
      </div>
      {/* Text block */}
      <div style={{ flex: "1 1 340px" }}>
        <h3
          style={{
            fontFamily: "'Fraunces', Georgia, serif",
            fontSize: 28,
            color: "#2C1810",
            fontWeight: 500,
            marginBottom: 14,
            letterSpacing: "-0.01em",
          }}
        >
          {title}
        </h3>
        <p
          style={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: 16,
            color: "#6B5744",
            lineHeight: 1.7,
          }}
        >
          {description}
        </p>
      </div>
    </div>
  );
}

export function CTABanner() {
  return (
    <section style={{ padding: "60px 24px 80px" }}>
      <div
        style={{
          maxWidth: 800,
          margin: "0 auto",
          background: "#2C1810",
          borderRadius: 24,
          padding: "48px 44px",
          textAlign: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(ellipse 60% 50% at 30% 20%, rgba(232,168,56,0.08) 0%, transparent 60%)",
          }}
        />
        <div style={{ position: "relative", zIndex: 1 }}>
          <h2
            style={{
              fontFamily: "'Fraunces', Georgia, serif",
              fontSize: "clamp(24px, 3vw, 34px)",
              color: "#FEFCF6",
              fontWeight: 400,
              marginBottom: 14,
              letterSpacing: "-0.02em",
            }}
          >
            Ready to see WattleOS in action?
          </h2>
          <p
            style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: 16,
              color: "rgba(254, 252, 246, 0.6)",
              maxWidth: 440,
              margin: "0 auto 28px",
              lineHeight: 1.6,
            }}
          >
            Book a personalised demo with your school&apos;s curriculum, class
            structure, and actual workflow.
          </p>
          <div
            style={{
              display: "flex",
              gap: 12,
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <Link
              href="/#demo"
              style={{
                display: "inline-block",
                background: "#E8A838",
                color: "#2C1810",
                borderRadius: 10,
                padding: "14px 32px",
                fontFamily: "'Outfit', sans-serif",
                fontSize: 15,
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Book a Demo
            </Link>
            <Link
              href="/#pricing"
              style={{
                display: "inline-block",
                background: "transparent",
                color: "#FEFCF6",
                border: "1.5px solid rgba(254,252,246,0.2)",
                borderRadius: 10,
                padding: "13px 32px",
                fontFamily: "'Outfit', sans-serif",
                fontSize: 15,
                fontWeight: 500,
                textDecoration: "none",
              }}
            >
              See Pricing
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
