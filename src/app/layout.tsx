// src/app/layout.tsx
//
// ============================================================
// WattleOS V2 - Root Layout
// ============================================================

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
  // "system" means no class - CSS prefers-color-scheme handles it.
  // For "system" to work with .dark class, we'd need client JS.
  // For now, "system" defaults to light on the server; a tiny
  // inline script below handles the flash-free client detection.
  const themeClass = display.theme === "dark" ? "dark" : "";

  // Build brand style if custom hue is set
  const brandStyle: React.CSSProperties = {};
  if (display.brandHue !== null) {
    (brandStyle as Record<string, string>)["--brand-hue"] = String(
      display.brandHue,
    );
  }
  if (display.brandSaturation !== null) {
    (brandStyle as Record<string, string>)["--brand-sat"] =
      `${display.brandSaturation}%`;
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
