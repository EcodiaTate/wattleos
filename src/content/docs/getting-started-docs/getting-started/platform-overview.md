# WattleOS Platform Overview

WattleOS is a school management platform built specifically for Montessori schools in Australia. It replaces the need for multiple separate systems by bringing student records, curriculum tracking, observations, attendance, reporting, billing, and parent communication into a single platform.

The core principle behind WattleOS is "enter it once." When a student's information is added during enrollment, it flows through to attendance, reporting, portfolios, billing, and parent communication automatically. No re-typing, no copying between systems, no spreadsheets.

## Who Uses WattleOS

WattleOS is used by four types of people, each with a different experience:

**Guides** (Montessori teachers) spend most of their time in the Pedagogy section. They create observations, track mastery progress, take attendance, and write term reports. The observation capture is designed for iPad - quick photo, tag the students, link to curriculum, done in under 30 seconds.

**Parents** access the Parent Portal, where they can see their children's portfolios, read observations shared by guides, view attendance records, receive school announcements, and manage enrollment and billing. Parents log in with Google and see only their own children's information.

**Administrators** manage the school-wide settings, enrollment pipeline, staff roles and permissions, billing, integrations with external systems (Stripe, Xero, KeyPay), and compliance reporting. Administrators can access everything guides and parents can see, plus the Admin section.

**Staff** (office coordinators, specialists, assistants) have customisable permissions. A music specialist might see students across multiple classes but only create observations for their sessions. An office coordinator might manage attendance and enrollment but not see pedagogy data.

## What WattleOS Replaces

WattleOS is designed to be the only platform your school needs for day-to-day operations. Here is what it replaces:

- **Transparent Classroom** → Mastery tracking (Module 4)
- **Storypark or Seesaw** → Observations and portfolios (Module 3)
- **FACTS SIS or spreadsheets** → Student Information System (Module 5)
- **Paper rolls or attendance apps** → Attendance and safety (Module 6)
- **Word document reports** → Term reports with templates (Module 7)
- **Google Forms enrollment** → Online enrollment portal (Module 10)
- **QikKids, Xplor, or Harmony** → Programs and OSHC (Module 11)
- **WhatsApp parent groups** → School communications (Module 12)
- **Spreadsheet waitlists** → Admissions pipeline (Module 13)
- **Printed curriculum albums** → Curriculum content library (Module 14)

The only external systems your school still touches are Xero (accounting), KeyPay (payroll), Stripe (payments), and Google Workspace - all of which WattleOS pushes data to automatically via integrations.

## Navigating the Platform

The left sidebar organises everything by function. The sidebar only shows items you have permission to access - a parent sees a very different sidebar than an administrator.

**For Guides and Staff**, the sidebar includes:

- **Dashboard** - Quick overview with actions relevant to your role
- **Observations** - Create, view, and manage observation records
- **Curriculum** - Browse and manage curriculum frameworks and outcomes
- **Content Library** - Shared curriculum templates, materials, and cross-mappings
- **Mastery** - Student mastery grids showing progress against curriculum outcomes
- **Students** - Student profiles, medical records, emergency contacts, and family information
- **Classes** - Class rosters, enrollments, and class management
- **Attendance** - Daily roll call, attendance history, and absence reports
- **Reports** - Term reports, progress reports, and templates
- **Programs** - Before/after school care, OSHC, holiday programs, and session bookings
- **Communications** - School announcements, events, and messaging
- **Timesheets** - Staff time tracking and payroll integration
- **Settings** - Personal display preferences (theme, density, text size)

**For Administrators**, additional items appear:

- **Enrollment** - Enrollment periods, applications, and parent invitations
- **Admissions** - Waitlist pipeline, tour management, and inquiry tracking
- **Admin** - School settings, roles and permissions, data import, and integrations

**For Parents**, the sidebar shows:

- **Dashboard** - Overview of your children
- **My Children** - Each child's portfolio, attendance, and reports
- **Announcements** - School announcements requiring your attention
- **Messages** - Direct messages with guides and staff
- **Events** - School events with RSVP

On iPad and mobile devices, the sidebar collapses to a slim icon bar. Tap any icon to expand the full navigation. On desktop, you can collapse the sidebar manually by clicking the arrow tab on its right edge. The collapsed state is remembered between sessions.

## Authentication and Access

WattleOS uses Google Sign-In exclusively - there are no separate passwords to manage. Your school administrator sends you an invitation email. Click the link, sign in with Google, and your account is created with the appropriate role and permissions.

If you belong to multiple schools (common for relief teachers or network administrators), you will see a school picker after signing in. Select which school to access, and you can switch between them using the "Switch School" button in the sidebar at any time.

Your role determines what you can see and do. Roles are customisable per school - an administrator can create new roles like "Lead Guide" or "Office Coordinator" and assign specific permissions to each one. This means every school can tailor access to match their organisational structure.

For security, WattleOS automatically signs you out after 15 minutes of inactivity. This is especially important on shared iPads in classrooms. A warning appears 60 seconds before logout, giving you the chance to click "Stay Signed In" if you are still working.

## Key Concepts

### Observations

Observations are the heart of WattleOS. A guide documents a child's work by taking a photo or video, tagging the students involved, and optionally linking the observation to curriculum outcomes. Observations start as drafts and must be published before they appear in the parent portal. Published observations become part of each tagged student's portfolio. Observations can tag multiple students (for group lessons) and link to multiple curriculum outcomes.

### Curriculum and Mastery

WattleOS comes with pre-loaded Montessori curriculum frameworks (AMI 3–6, AMI 6–12, AMS scope and sequence) in the Content Library. Schools fork these templates into their own curriculum instances and can customise them. When observations are linked to curriculum outcomes, mastery evidence accumulates automatically. The mastery grid shows each student's progress - from "not started" through "presented," "practicing," to "mastered" - across every outcome in the curriculum.

### Attendance

Daily roll call is a tap-to-mark interface designed for speed. Guides can mark an entire class present in under 30 seconds. Late arrivals, absences, and excused absences are tracked with timestamps and optional notes. Critical medical alerts (severe and life-threatening conditions) are surfaced directly on the roll call screen so guides are always aware. Parents can submit absence notifications through the Parent Portal.

### Reports

Term reports are built from templates that each school designs. A report template can include narrative sections (written by the guide), mastery grids (auto-populated from observation data), attendance summaries (auto-calculated), and custom sections. Reports go through a draft, review, approved, and published workflow. Published reports appear in the Parent Portal and can be exported as PDF.

### Enrollment

New students enter the system through the enrollment portal. Parents complete a multi-step online form covering child details, medical conditions, emergency contacts, custody restrictions, and required documents - all without needing a WattleOS account. When an administrator approves the application, a single click creates the student record, guardian links, medical records, class enrollment, and sends the parent an invitation to create their account. This is the "enter it once" promise in action.

### Programs and OSHC

Schools offering before-school care, after-school care, or holiday programs manage these through the Programs module. Programs have configurable schedules, capacity limits, pricing, and age eligibility. Parents can book sessions through the Parent Portal. A kiosk mode allows sign-in and sign-out at the program entrance, with attendance syncing to the main system in real time.

### Communications

School announcements reach parents via the Communications section. Announcements can be school-wide, class-specific, or program-specific. Urgent announcements can require acknowledgement - administrators can see which parents have read and acknowledged the message. The Events system handles school events with RSVP tracking. Direct messaging allows guides to communicate with individual families.

### Billing and Integrations

WattleOS integrates with Stripe for payment processing, Xero for accounting, and KeyPay for payroll. School fees can be configured as recurring invoices through Stripe. Timesheet data from the Timesheets module can be pushed to KeyPay for payroll processing. Google Drive integration enables automatic creation of portfolio folders for each student.

## Getting Help

Ask Wattle is available on every page of WattleOS via the chat button in the bottom-right corner. Ask any question about how the platform works, and Wattle will search the documentation and give you a specific, actionable answer.

For account or billing issues, contact your school administrator. For technical support, administrators can reach the WattleOS team at support@wattleos.au.

## Keyboard Shortcuts

- `Ctrl/Cmd + K` - Quick search (find students, pages, or actions)
- `Ctrl/Cmd + N` - New observation (from any page)
- `Ctrl/Cmd + /` - Open Ask Wattle
- `Escape` - Close any open panel or modal
