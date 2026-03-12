# School Settings

School Settings lets administrators configure their school's identity, regional preferences, and visual appearance. Navigate to **Admin → School Settings** to access these options.

## General Settings

The general settings section controls your school's core identity:

**School Name** - The name displayed throughout the platform, in the sidebar header, on report cards, and in parent-facing communications. This should match your school's official registered name.

**Logo URL** - A URL to your school's logo image. The logo appears in the sidebar, on the login screen, and on exported documents like report cards. Upload your logo to a hosting service and paste the URL here, or use Supabase Storage to host it.

**Timezone** - Your school's local timezone, used for timestamps on observations, attendance records, communications, and session timeout calculations. WattleOS provides all Australian timezones (Sydney, Melbourne, Brisbane, Adelaide, Perth, Hobart, Darwin, Lord Howe Island, Norfolk Island) and can be extended internationally.

**Country** - Your school's country, used for date formatting, currency defaults, and compliance framework suggestions. Currently supports Australia, New Zealand, United States, and United Kingdom.

**Currency** - The currency used for billing, tuition invoicing, and financial displays. Options include AUD, NZD, USD, and GBP.

Changes to general settings take effect immediately across the platform.

## Appearance Settings

The appearance section controls how WattleOS looks for all users at your school. These settings are configured by administrators and apply school-wide as the default, though individual users can override some preferences through their personal display settings.

**Theme** - Light or Dark mode. Controls the overall colour scheme.

**Font Scale** - Adjust the base font size for accessibility. Options range from smaller to larger text.

**Density** - Controls spacing and padding throughout the interface. Comfortable provides more whitespace; Compact fits more information on screen.

**Sidebar Style** - Choose between an expanded sidebar (always showing labels) or a collapsed sidebar (icons only, expanding on hover).

These appearance settings use a three-layer configuration model: platform defaults are overridden by school-level settings, which can be overridden by individual user preferences. When an administrator changes the school's theme to Dark, all users who have not set a personal preference will see Dark mode. Users who have explicitly chosen Light in their personal display settings will keep their choice.

## Permissions

Modifying School Settings requires the **Manage Tenant Settings** permission. This permission is included in the default Administrator role.

All users can view the school name and logo (it appears in the sidebar), but only administrators can change them.
