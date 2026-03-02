# Personal Display Settings

Every WattleOS user can personalise how the platform looks on their device. Personal display settings override the school-wide defaults set by the administrator, letting each staff member work in the mode that suits them best without affecting anyone else.

## Accessing Display Settings

Navigate to **Settings → Display** from the sidebar. This page is available to all authenticated users — no special permissions are required.

The page shows your current settings with clear indicators when you are using the school default rather than a personal choice.

## Theme

The theme controls whether WattleOS uses a light or dark colour scheme. Four options are available.

**School Default** uses whatever the administrator has set as the school-wide theme. A label shows the current school default (for example, "School Default (light)") so you know what you will get. **Light** is a bright background with dark text. **Dark** reverses the scheme — dark background with light text, easier on the eyes in low-light environments. **System** follows your operating system's preference, switching automatically when your device switches between light and dark mode.

Selecting any option other than School Default means your choice persists regardless of what the administrator changes. Selecting School Default means your display will automatically update if the administrator changes the school theme.

## Layout Density

Density controls how much space appears between elements — padding, margins, font sizes, and touch targets.

**Compact** fits the most information on screen. Tables have tighter rows, cards have smaller padding, and buttons are more condensed. This is ideal for administrators working on large monitors who want to see more data at once.

**Comfortable** is the balanced middle ground and the platform default. It provides adequate spacing for readability without wasting screen real estate.

**Spacious** uses generous spacing with larger touch targets. This is optimised for tablet use and is recommended for guides working on iPads in the classroom, where tap accuracy matters more than information density.

As with theme, you can select School Default to inherit whatever the administrator has configured, or choose a specific density that persists regardless of school-wide changes.

## Font Scale

Font scale adjusts the base text size across the entire interface. Four sizes are available: small, base (default), large, and extra large. This is particularly useful for accessibility — users who find the default text too small can increase it without affecting the layout of other users.

## Live Preview

All changes take effect immediately in your browser as you make them. You can see the impact of a new theme, density, or font scale before saving. The preview is applied to the DOM in real-time, so you are always looking at the actual result rather than a mockup.

## Saving

Click **Save** to persist your preferences. The settings are stored in a browser cookie, which means they are per-device. If you use WattleOS on both a laptop and an iPad, you can have different settings on each device. After saving, the page reloads briefly to ensure the root layout picks up the new settings across all pages.

## How Overrides Work

Your personal settings are stored separately from the school defaults. WattleOS maintains two pieces of information: the effective value (what is actually applied, for example "dark") and whether that value was explicitly chosen by you or inherited from the school. This is why the interface can show "(using school default)" next to options — it knows the difference between "I chose light" and "the school default is light and I have not overridden it."
