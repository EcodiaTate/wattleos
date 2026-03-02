# Admin Hub

The Admin hub is the central management console for school administrators. It provides access to all configuration, staff operations, student lifecycle, and financial tools in WattleOS.

## Accessing Admin

Click **Admin** in the sidebar to open the hub. The Admin link only appears for users who have at least one admin-level permission. If you do not see Admin in the sidebar, your role does not include any administrative permissions — contact your school's administrator.

## Hub Layout

The Admin hub organises its tools into four sections:

### Core Configuration

**School Settings** — School name, logo, timezone, country, currency, and appearance customisation. Requires the Manage Tenant Settings permission.

**Integrations** — Connect external services like Google Drive, Stripe, Xero, and KeyPay. Configure credentials, toggle settings, and view sync history. Requires the Manage Integrations permission.

**Data Import** — Import students, guardians, staff, emergency contacts, medical conditions, and attendance from CSV files. Includes a column-mapping wizard and bulk invite tool. Requires the Manage Tenant Settings permission.

### Student Lifecycle

**Admissions** — The waitlist pipeline for prospective families. Track inquiries, schedule tours, and manage stage transitions from initial contact through to enrollment offer. Requires Manage Waitlist or View Waitlist permission.

**Enrollment** — Enrollment periods, parent applications, document collection, and invitation management. Requires enrollment-specific permissions (Manage Enrollment Periods, Review Applications, or View Enrollment Dashboard).

### Staff Operations

**Timesheets** — Review and approve staff timesheets. View time entries by period, approve or reject submissions, and manage pay periods. Requires the Approve Timesheets permission.

**Payroll Settings** — Configure pay frequency, standard work hours, break durations, and integration with payroll providers. Requires Manage Integrations or Manage Tenant Settings permission.

### Financial

**Billing** — View your school's WattleOS subscription plan, invoices, and payment history. Requires the Manage Tenant Settings permission.

## Quick Links

Below the page heading, quick-link pills provide shortcuts to frequently accessed sub-pages: Tours, Applications, Invitations, New Enrollment Period, and Pay Periods. These appear based on your permissions — you only see links for tools you can access.

## Permission-Based Visibility

Every card and link on the Admin hub is conditionally rendered based on your permissions. You will only see tools that your role grants access to. If you have zero admin-relevant permissions, navigating to `/admin` redirects you to the Dashboard.

This means different staff members see different Admin hubs. A school administrator sees everything. An office manager might see Enrollment and Admissions but not Integrations or Payroll. A lead guide might see Timesheets only.
