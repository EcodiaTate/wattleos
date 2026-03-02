# School Settings

School settings control your school's identity and default appearance within WattleOS. The settings page combines two sections — your school profile (name, logo, timezone, country, currency) and appearance customisation (brand colours, theme, density, sidebar style). Both are managed from a single page to keep administration streamlined.

## Accessing School Settings

Navigate to **Admin → School Settings**. This page requires the **MANAGE_TENANT_SETTINGS** permission. The page loads your current profile and appearance settings in parallel for a fast experience with no loading delays.

## School Profile

The profile section covers the core identity fields for your school.

**School name** is displayed throughout the platform — in the sidebar, on reports, on the parent portal, and in communications. Changing the name takes effect immediately across all pages. The URL slug (for example, `greenvalley` in `greenvalley.wattleos.au`) does not change when you rename the school. Slugs are set during initial provisioning and remain stable.

**School logo** can be uploaded by dragging and dropping an image or clicking to browse. A live preview shows immediately. The logo appears in the sidebar, on printed reports, and on the parent-facing portal. Supported formats include PNG, JPG, and SVG.

**Timezone** determines how times are displayed throughout the platform — attendance check-in/out times, observation timestamps, report dates, and scheduled communications. WattleOS supports all Australian timezones (AEST, ACST, AWST, and their daylight saving variants).

**Country** and **currency** are set for the school and affect billing defaults. Currency is stored as a three-letter ISO code (for example, "AUD" for Australian Dollars) and is used across fee schedules, invoices, and financial displays.

## Appearance and Branding

The appearance section lets you customise how WattleOS looks for your school. Changes here set the school-wide defaults — individual staff members can override theme and density in their personal display settings.

**Brand colour** is controlled by a hue slider (0–360 on the colour wheel) and a saturation slider. The default is golden wattle amber (hue 38, saturation 92%). Adjusting these values changes the primary colour used across buttons, active states, focus rings, and the sidebar. WattleOS recalculates the entire colour scale from your chosen hue, ensuring that contrast ratios remain accessible regardless of your choice.

**Accent colour** works the same way as brand colour but controls secondary highlights. The default is eucalyptus green (hue 152, saturation 35%).

**Sidebar style** offers three options: light (default), dark, or brand-coloured. The brand option tints the sidebar with your primary brand colour.

**Default theme** sets the school-wide colour mode: light, dark, or system (follows the user's operating system preference). Individual users can override this.

**Default density** controls how compact or spacious the interface is: compact (fits more information on screen), comfortable (balanced — the default), or spacious (larger touch targets, more breathing room). Individual users can override this.

## How the Three-Layer Configuration Works

WattleOS uses a three-layer configuration approach for display settings. Platform defaults provide a baseline (wattle amber, comfortable density, light theme). Tenant settings override platform defaults — this is what you configure on the school settings page. User preferences override tenant settings — individual staff set these in their personal display settings.

This means a school can set dark mode as their default, and a guide who prefers light mode can override it without affecting anyone else.

## Technical Detail: Why Cookies

Display settings are stored in cookies rather than the database for user preferences. The root layout is a server component that needs display configuration before authentication runs — it sets data attributes on the HTML element to prevent a flash of unstyled content. Cookies are readable in server components without a database round-trip. User preferences are also inherently per-device (you might want dark mode on your phone and light mode on your desktop), which cookies naturally support.

## Permissions

Viewing and editing school settings (both profile and appearance) requires the **MANAGE_TENANT_SETTINGS** permission. This is typically held by the Owner and Administrator roles.
