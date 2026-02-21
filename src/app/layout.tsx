// src/app/layout.tsx
//
// ============================================================
// WattleOS V2 - Root Layout
// ============================================================
// Reads the display cookie (set by the (app) layout on auth)
// and applies theme class, density, font scale, brand color,
// accent color, and sidebar style as data attributes / CSS
// custom properties on <html>.
//
// WHY here and not in (app) layout: These must be on <html>
// before first paint to prevent FOUC. The root layout is the
// only place guaranteed to wrap every route.
// ============================================================

import { DISPLAY_COOKIE_NAME, parseDisplayCookie } from "@/types/display";
import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "WattleOS",
    template: "%s · WattleOS",
  },
  description: "Montessori-native school operating system",
  applicationName: "WattleOS",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "hsl(40, 30%, 98%)" },
    { media: "(prefers-color-scheme: dark)", color: "hsl(25, 15%, 8%)" },
  ],
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Read display config from cookie (set by (app) layout on auth pages)
  const cookieStore = await cookies();
  const displayCookie = cookieStore.get(DISPLAY_COOKIE_NAME)?.value;
  const display = parseDisplayCookie(displayCookie);

  // Resolve theme class.
  // "system" means no class - the inline script below handles it.
  const themeClass = display.theme === "dark" ? "dark" : "";

  // Build inline styles for brand + accent overrides.
  // WHY inline style: CSS [style*="--brand-hue"] selectors in
  // globals.css detect these and recalculate the entire palette.
  const inlineStyle: Record<string, string> = {};

  if (display.brandHue !== null) {
    inlineStyle["--brand-hue"] = String(display.brandHue);
  }
  if (display.brandSaturation !== null) {
    inlineStyle["--brand-sat"] = `${display.brandSaturation}%`;
  }
  if (display.accentHue !== null) {
    inlineStyle["--accent-hue"] = String(display.accentHue);
  }
  if (display.accentSaturation !== null) {
    inlineStyle["--accent-sat"] = `${display.accentSaturation}%`;
  }

  const hasStyle = Object.keys(inlineStyle).length > 0;

  return (
    <html
      lang="en"
      className={themeClass}
      data-density={display.density}
      data-font-scale={display.fontScale}
      data-sidebar-style={display.sidebarStyle}
      style={hasStyle ? (inlineStyle as React.CSSProperties) : undefined}
      suppressHydrationWarning
    >
      <head>
        {/* Inline script to handle "system" theme without FOUC.
            Runs before paint, checks prefers-color-scheme, adds/removes .dark.
            Only activates when theme is "system". */}
        {display.theme === "system" && (
          <script
            dangerouslySetInnerHTML={{
              __html: `(function(){try{if(window.matchMedia('(prefers-color-scheme:dark)').matches){document.documentElement.classList.add('dark')}else{document.documentElement.classList.remove('dark')}}catch(e){}})()`,
            }}
          />
        )}
      </head>
      <body>{children}</body>
    </html>
  );
}