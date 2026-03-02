# The Admin Hub

The admin hub is the central navigation point for all school administration tasks in WattleOS. It organises administrative functions into logical groups and provides quick access to the most common workflows. Only users with administrative permissions can access the hub — the specific cards visible depend on the permissions held by the current user.

## Accessing the Admin Hub

Navigate to **Admin** from the sidebar. The hub page shows a grid of cards grouped into four sections, each linking to a specific administration area.

## Sections and Cards

**Core** contains the fundamental administration tools. School Settings covers school profile, branding, and appearance configuration. Integrations manages connections to external systems like Stripe, Xero, and Google Drive. Data Import provides the CSV migration wizard and mass invite tools.

**Student Lifecycle** covers the journey from inquiry to enrollment. Admissions Pipeline manages the Kanban board of prospective families through inquiry, tour, application, and offer stages. Enrollment manages enrollment periods, applications, and the approval workflow. Classes manages classroom environments, their assigned guides, and student rosters.

**Staff Operations** covers staff-facing administration. Timesheet Approvals is the approver's interface for reviewing, approving, and rejecting submitted timesheets. Payroll Settings configures pay cycles, default work hours, and the connection to Xero or KeyPay. Pay Period Management creates and manages the date ranges that staff log hours against.

**Financial** covers billing and payments. Billing manages fee schedules, invoice creation, Stripe sync, and payment tracking.

## Quick Links

Below the page header, quick links provide one-click access to frequently used administrative tasks. These are context-sensitive shortcuts to common workflows like creating a new enrollment period, reviewing pending timesheets, or accessing the billing dashboard.

## Permission-Based Visibility

The admin hub respects the role and permission system. A user who has MANAGE_ENROLLMENT but not MANAGE_INTEGRATIONS will see the Enrollment card but not the Integrations card. This means each administrator sees only the tools relevant to their responsibilities. The hub page itself requires at least one administrative permission to access — users with no administrative permissions are redirected to the dashboard.

## The Separation Between Admin and Settings

WattleOS makes a deliberate distinction between **Admin** (school-wide configuration that affects everyone) and **Settings** (personal preferences that affect only you). The admin hub at `/admin` is permission-gated for school administrators. The personal settings at `/settings` are available to every authenticated user. This separation ensures that a guide adjusting their display preferences cannot accidentally modify school-wide configuration, and an administrator managing enrollment does not have to navigate through personal preference screens.
