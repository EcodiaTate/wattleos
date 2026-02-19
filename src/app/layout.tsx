// src/app/layout.tsx
//
// ============================================================
// WattleOS V2 — Root Layout
// ============================================================
// WHY cookie-based theme: This layout wraps BOTH authenticated
// pages (the app) and unauthenticated pages (login, tenant-picker).
// It cannot call getTenantContext(). Instead, it reads a cookie
// that the (app) layout's server action maintains.
//
// The cookie contains the resolved display config (theme, density,
// font scale, brand hue). When no cookie exists (first visit,
// logged out), sensible defaults are used.
//
// WHY no next/font import: DM Sans and Source Serif 4 are loaded
// via @import in globals.css. Using next/font/google would conflict
// with the Google Fonts CDN approach that gives us the full
// optical size (opsz) axis.
//
// DATA ATTRIBUTES ON <html>:
//   data-density  = "compact" | "comfortable" | "spacious"
//   data-font-scale = "sm" | "base" | "lg" | "xl"
//   class         = "" (light) | "dark"
//   style         = --brand-hue: N; --brand-sat: N%;
// ============================================================

import type { Metadata, Viewport } from 'next';
import { cookies } from 'next/headers';
import './globals.css';
import {
  parseDisplayCookie,
  DISPLAY_COOKIE_NAME,
} from '@/types/display';

export const metadata: Metadata = {
  title: {
    default: 'WattleOS',
    template: '%s · WattleOS',
  },
  description: 'Montessori-native school operating system',
  applicationName: 'WattleOS',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'hsl(40, 30%, 98%)' },
    { media: '(prefers-color-scheme: dark)', color: 'hsl(25, 15%, 8%)' },
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
  // "system" means no class — CSS prefers-color-scheme handles it.
  // For "system" to work with .dark class, we'd need client JS.
  // For now, "system" defaults to light on the server; a tiny
  // inline script below handles the flash-free client detection.
  const themeClass = display.theme === 'dark' ? 'dark' : '';

  // Build brand style if custom hue is set
  const brandStyle: React.CSSProperties = {};
  if (display.brandHue !== null) {
    (brandStyle as Record<string, string>)['--brand-hue'] = String(display.brandHue);
  }
  if (display.brandSaturation !== null) {
    (brandStyle as Record<string, string>)['--brand-sat'] = `${display.brandSaturation}%`;
  }

  return (
    <html
      lang="en"
      className={themeClass}
      data-density={display.density}
      data-font-scale={display.fontScale}
      style={Object.keys(brandStyle).length > 0 ? brandStyle : undefined}
      suppressHydrationWarning
    >
      <head>
        {/* Inline script to handle "system" theme without FOUC.
            Runs before paint, checks prefers-color-scheme, adds/removes .dark.
            Only activates when theme is "system". */}
        {display.theme === 'system' && (
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