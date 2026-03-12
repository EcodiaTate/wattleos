# Switching Between Schools

If you work at more than one school that uses WattleOS - for example, as a relief teacher, network administrator, or consultant - you can switch between schools without signing out.

## How It Works

When you first sign in and belong to multiple schools, you see the school picker page. Each school is listed with its name, logo, and your role at that school (for example, "Guide" at one school and "Administrator" at another). Tap a school to enter it.

Once inside a school, everything you see - students, observations, attendance, settings - is scoped to that school only. You cannot see data from one school while working in another. This is enforced at the database level for security.

## Switching Schools

To switch to a different school, look for the **Switch School** button in the sidebar near your profile section at the bottom. Clicking it takes you back to the school picker, where you can select a different school. Your session updates immediately with the new school's data and your permissions at that school.

If you only belong to one school, the Switch School button does not appear - there is nothing to switch to.

## Different Roles at Different Schools

You may have different roles at different schools. For example, you might be a Guide at one school and an Administrator at another. When you switch schools, your permissions update to match your role at the new school. The sidebar navigation, quick actions, and available features all change accordingly.

## Technical Details

When you select a school, WattleOS stamps that school's identity into your session token (JWT). All data queries use this token to ensure you only see data for the selected school. Row Level Security (RLS) policies in the database enforce this - even if something went wrong in the application layer, the database would still prevent cross-school data access.

When you switch schools, WattleOS clears the current school from your session, refreshes your authentication token, and redirects you to the school picker. This ensures a clean context switch with no data leakage between schools.
