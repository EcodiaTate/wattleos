# Display Settings

Every WattleOS user can personalise how the platform looks. Your personal display settings override the school-wide defaults set by your administrator, so you can tailor your experience without affecting anyone else.

## Accessing Display Settings

Go to **Settings** in the sidebar, then select **Display**. You can also navigate directly to `/settings/display`.

## Theme

Choose how WattleOS handles light and dark mode:

- **School Default** — Uses whatever your administrator has set as the school-wide theme. If you are unsure what to pick, this is a safe choice.
- **Light** — Always uses the light colour scheme with a white background.
- **Dark** — Always uses the dark colour scheme with a dark background. Easier on the eyes in low-light environments.
- **System** — Follows your device's system preference. If your computer or iPad is set to dark mode, WattleOS will be dark. If it is set to light mode, WattleOS will be light.

Changes preview immediately as you select them, so you can see the effect before saving.

## Layout Density

Controls how much space appears between elements across the platform:

- **School Default** — Uses the administrator's chosen density for this school.
- **Compact** — Reduces padding and spacing. Fits more content on screen, which is useful for desktop users with large screens or anyone who prefers a dense information layout.
- **Comfortable** — The balanced middle ground. This is the default for most schools.
- **Spacious** — Increases padding and spacing. Better for touch devices like iPads and for users who prefer larger tap targets and more breathing room between elements.

The density setting affects padding in cards, spacing between sections, button heights, and overall layout proportions throughout the entire platform.

## Text Size

Scale all text up or down across WattleOS:

- **Small** — Slightly smaller than default text
- **Base** — The standard text size (default)
- **Large** — Slightly larger text
- **Extra Large** — Noticeably larger text, useful for accessibility

## How Settings Are Applied

WattleOS uses a three-layer configuration system:

1. **Platform defaults** — Built into WattleOS (comfortable density, light theme, base text size)
2. **School defaults** — Set by your administrator in the Admin Appearance Settings. These override platform defaults for everyone at the school.
3. **Your personal preferences** — Set on this page. These override school defaults for you only.

If you set a preference to "School Default," it falls back to whatever your administrator has configured. If you explicitly choose a value (like "Dark" for theme), it overrides the school default regardless of what the administrator changes later.

## Live Preview

All changes preview live in the interface as you adjust them. You can experiment with different combinations of theme, density, and text size to find what works best for you. Changes are not saved until you click the **Save** button.

After saving, the page briefly reloads to apply the new settings across the entire application. Your preferences are stored in the database and will apply on any device you sign in to.

## Sidebar Appearance

The sidebar style (light, dark, or brand-coloured) is controlled by the school administrator, not by individual users. If you prefer a different sidebar style, ask your administrator to adjust it in the Admin Appearance Settings. The sidebar style can use your school's brand colours for a customised look.
