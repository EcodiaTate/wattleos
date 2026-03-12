# Roles and Permissions

WattleOS uses a role-based access control (RBAC) system where each staff member is assigned a role, and each role contains a set of granular permissions. Permissions control what a user can see and do throughout the platform.

## How It Works

Each user at a school (tenant) is assigned exactly one role. Roles are defined per school - your school's "Guide" role can have different permissions from another school's "Guide" role. When a user attempts an action (like creating an observation or approving a timesheet), WattleOS checks whether their role includes the required permission.

Permissions are enforced at two levels for defence in depth: first at the application layer (Server Actions check `requirePermission()` before executing), and second at the database layer (Row Level Security policies call `has_permission()` to verify access before returning data).

## Permission Categories

WattleOS defines permissions across ten modules. Each permission is grouped under a module for the admin UI, but they can be mixed and matched freely when building roles.

### Administration

- **Manage Tenant Settings** - Edit school name, logo, timezone, currency. Access billing and subscription information.
- **Manage Users** - Create, edit, and deactivate staff accounts. Assign and change roles.
- **View Audit Logs** - Access the audit trail of security-sensitive actions (custody restriction changes, permission changes, etc.).
- **Manage Integrations** - Configure external service connections (Google Drive, Stripe, Xero, KeyPay). View sync history.

### Pedagogy

- **Create Observation** - Write observations and save as drafts. Edit own draft observations.
- **Publish Observation** - Publish draft observations (making them visible to parents). Archive published observations.
- **View All Observations** - See observations created by other staff members, not just your own.
- **Manage Curriculum** - Fork templates, create blank instances, add/edit/delete/reorder curriculum nodes, toggle visibility.
- **Manage Mastery** - Update student mastery statuses. Access the class heatmap.
- **Manage Reports** - Create, edit, and publish student report cards.

### Student Information

- **View Students** - See student profiles, demographics, and enrollment information.
- **Manage Students** - Create, edit, and deactivate student records. Manage class enrollments.
- **View Medical Records** - See student medical conditions and allergy information.
- **Manage Medical Records** - Add, edit, and delete medical conditions for students.
- **Manage Safety Records** - Access and manage custody restrictions and court order information. This is the most sensitive student permission - it is only granted to roles that need to manage child safety documentation.
- **Manage Enrollment** - Enroll and withdraw students from classes.

### Attendance

- **Manage Attendance** - Take the daily roll, mark individual attendance, check students in and out.
- **View Attendance Reports** - Access the absence report and attendance history views.

### Communications

- **Send Announcements** - Send school-wide announcements to all parents.
- **Send Class Messages** - Send messages to parents of students in specific classes.
- **Manage Events** - Create and manage school events on the calendar.
- **Moderate Chat** - View and moderate parent-staff chat threads.
- **Manage Directory** - Control visibility settings for the school directory.
- **View Message Analytics** - Access read receipts and engagement data for communications.

### Timesheets and Payroll

- **Log Time** - Submit timesheet entries for yourself.
- **Approve Timesheets** - Review and approve/reject other staff members' timesheets.
- **View All Timesheets** - See timesheet submissions from all staff, not just direct reports.

### Enrollment and Onboarding

- **Manage Enrollment Periods** - Create and configure enrollment periods with dates and capacity.
- **Review Applications** - View submitted parent applications during enrollment.
- **Approve Applications** - Accept or reject enrollment applications.
- **Manage Parent Invitations** - Send and manage invitation links for parents to join the platform.
- **View Enrollment Dashboard** - Access enrollment statistics and pipeline overview.

### Programs and OSHC

- **Manage Programs** - Create and configure before/after school care and extracurricular programs.
- **Manage Bookings** - Handle student bookings for program sessions.
- **Check-in / Check-out** - Record student arrivals and departures for program sessions.
- **View Program Reports** - Access program attendance and utilisation reports.
- **Manage CCS Settings** - Configure Child Care Subsidy integration settings.

### Admissions and Waitlist

- **Manage Waitlist** - Add, edit, move, and remove entries in the admissions pipeline.
- **View Waitlist** - See the waitlist pipeline in read-only mode.
- **Manage Tours** - Schedule and manage school tours for prospective families.
- **Manage Email Templates** - Edit automated email templates for admissions communications.
- **View Admissions Analytics** - Access conversion rates, pipeline metrics, and inquiry sources.

### Curriculum Content

- **Manage Cross-Mappings** - Create and edit cross-framework curriculum mappings.
- **View Compliance Reports** - Generate and view compliance evidence reports.
- **Manage Curriculum Templates** - Import and manage global curriculum templates (typically reserved for platform administrators).

## Default Roles

WattleOS provides default roles that schools can use as-is or customise:

**Administrator** - Full access to all permissions. Intended for school owners and directors.

**Guide** - Pedagogy-focused permissions: create and publish observations, manage mastery, take attendance, view students, log time. The core working role for Montessori teachers.

**Assistant** - Reduced pedagogy permissions: create observations (but not publish), view students, manage attendance, log time. Designed for teaching assistants who create observation drafts for lead guides to review and publish.

**Office Staff** - Administrative permissions without pedagogy: manage students, enrollment, admissions, attendance reports, communications. For administrative team members who do not work directly with curriculum.

**Parent** - No staff permissions. Parents access the Parent Portal with read-only views of their children's portfolios, attendance, and reports. The parent role is assigned automatically when a parent account is created through the enrollment or invitation process.

## Customising Roles

Administrators with the Manage Users permission can create custom roles and adjust which permissions are included. The role management interface groups permissions by module, making it easy to build a role by checking the relevant boxes.

When you change a role's permissions, the change takes effect immediately for all users assigned to that role. There is no need to re-assign users - the role is the single point of control.

## Best Practices

- **Principle of least privilege**: Assign the minimum permissions needed for each role. A guide who does not handle enrollment should not have enrollment permissions.

- **Separate sensitive permissions**: Manage Safety Records (custody restrictions) and Manage Users should be limited to administrators. These permissions control access to highly sensitive information.

- **Use the Assistant role for new staff**: Start new guides with the Assistant role (draft-only observations), then promote to Guide once they are trained on the observation workflow.

- **Review roles termly**: At the start of each term, review which staff have which roles and adjust as responsibilities change.
