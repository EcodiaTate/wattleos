# Roles and Permissions

WattleOS uses a role-based access control system. Every user at a school is assigned a role, and each role has a set of permissions that determine what the user can see and do. This means your experience of WattleOS is tailored to your responsibilities.

## How Roles Work

A role is a named collection of permissions. Your school starts with default system roles, and administrators can create additional custom roles to match your school's organisational structure.

Each user is assigned exactly one role per school. If you belong to multiple schools, you may have a different role at each one — for example, "Guide" at one school and "Administrator" at another.

## Default System Roles

Every WattleOS school is provisioned with these system roles:

**Administrator** — Full access to all features, including school settings, user management, enrollment, billing, and integrations. Administrators can create and modify roles, assign permissions, and manage the school's WattleOS configuration.

**Guide** — Access to the core Montessori workflow: creating and publishing observations, managing curriculum and mastery, taking attendance, writing reports, and communicating with parents. Guides can view students in their classes but cannot manage school-wide settings.

**Staff** — A flexible role for non-teaching staff. The default permissions may vary, but typically include viewing students and managing attendance. Administrators can customise what staff members can access.

**Parent** — Access to the Parent Portal only. Parents can view their children's portfolios, attendance records, published reports, school announcements, and messages. Parents cannot see other families' data or any staff-level features.

System roles cannot be deleted but their permissions can be modified by administrators.

## Custom Roles

Administrators can create custom roles for specific positions. Common examples include:

- **Lead Guide** — Same as Guide, plus the ability to manage curriculum and approve reports for other guides
- **Office Coordinator** — Attendance management, enrollment, and communications, but no access to pedagogy data
- **Music Specialist** — Can create observations for students across multiple classes, but only for their music sessions
- **Relief Teacher** — Limited view-only access to students and attendance, without the ability to publish observations

To create a custom role, go to **Admin** in the sidebar, then **Roles**. Click **New Role**, give it a name, and select which permissions to assign.

## Permission Categories

Permissions are grouped by module:

**Administration** — Manage school settings, manage users, view audit logs, manage integrations.

**Pedagogy** — Create observations, publish observations, view all observations, manage curriculum, manage mastery, manage reports.

**Student Information** — View students, manage students, view medical records, manage medical records, manage safety records, manage enrollment.

**Attendance** — Manage attendance (take roll call, mark students), view attendance reports.

**Communications** — Send announcements, send class messages, manage events, moderate chat, manage the family directory, view message analytics.

**Timesheets and Payroll** — Log time, approve timesheets, view all timesheets.

**Enrollment and Onboarding** — Manage enrollment periods, review applications, approve or reject applications, manage parent invitations, view the enrollment dashboard.

**Programs and OSHC** — Manage programs, manage bookings, check in and check out students, view program reports, manage CCS settings.

**Admissions and Waitlist** — Manage the waitlist pipeline, view the waitlist, manage tours, manage email templates, view admissions analytics.

**Curriculum Content** — Manage cross-mappings between curriculum frameworks, view compliance reports, manage curriculum templates.

## How Permissions Affect Navigation

The sidebar only shows links to sections where you have at least one relevant permission. For example, if your role does not include any attendance permissions, the Attendance item does not appear in your sidebar. Similarly, Quick Actions on the Dashboard only show for features you have access to.

This permission gating happens on the server when the page loads — it is not just hidden in the UI. If someone manually types a URL they do not have permission to access, the page will either redirect them or show an error.

## Checking Your Role

Your current role is displayed in two places:

1. At the bottom of the sidebar, below your name and email
2. On the Dashboard, below the welcome greeting (for example, "Green Valley Montessori · Lead Guide")

If you believe your role or permissions are incorrect, contact your school administrator. They can view and modify role assignments from the Admin section.

## Parent Permissions

Parents are identified by the absence of staff-level permissions rather than by specific parent permissions. If a user has no pedagogy, student management, or attendance permissions, WattleOS shows them the parent navigation (My Children, Announcements, Messages, Events). Parent data access is enforced at the database level — parents can only see data for students they are linked to as guardians.
