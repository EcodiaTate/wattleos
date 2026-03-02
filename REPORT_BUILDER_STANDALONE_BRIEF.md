# WattleOS Report Builder — Standalone Product Build Brief

> **READ THIS FIRST BEFORE WRITING ANY CODE**
>
> This document describes a **standalone product** — not a module inside WattleOS. It happens to share WattleOS's infrastructure (Supabase, Next.js, auth), but from the user's perspective it is a complete, self-sufficient tool they signed up for specifically. They have never heard of "WattleOS Module A" or "Module 7". They signed up for **WattleOS Report Builder** because their school pays Crystal Reports to change a template and they are fed up.
>
> The #1 failure mode for this build is treating it as "the WattleOS reports module with a free tier". That is not what this is. Think about how Dropbox Paper, Notion, or Linear launched — products complete enough to be useful on day one for one person, with a clear path to expanding into a larger ecosystem. That is the model.

---

## What This Product Is

**WattleOS Report Builder** is a term report management tool for Montessori schools. It lets office staff build report templates with full autonomy (no vendor charges for changes), guides fill reports in-browser with autosave, and administrators review and approve from a single dashboard. Final reports export as professional PDFs.

It is a web application. A systems coordinator at a school can sign up, create their school's account, build a report template, invite their guides, and have reports flowing — in one afternoon, without IT involvement, without a sales call, without reading documentation about anything called "WattleOS".

---

## The Signup & Onboarding Flow

This is the most important section. The existing WattleOS platform assumes a tenant already exists and a user has been provisioned. The standalone product needs a **self-serve onboarding path** that creates all of this automatically.

### The Signup Journey

```
User visits wattleos.au/report-builder
    ↓
Clicks "Start free"
    ↓
Enters: School name, their name, email, password (or Google OAuth)
    ↓
System automatically:
  1. Creates a tenant record (slug from school name)
  2. Creates the user record
  3. Creates a tenant_user record with 'Administrator' role
  4. Seeds default permissions for the tenant
  5. Creates a default report period ("Term [current] [current year]")
    ↓
User lands on their dashboard — NOT a blank screen
Dashboard shows:
  - "Welcome to WattleOS Report Builder, [School Name]"
  - A single prominent CTA: "Create your first report template"
  - A short 3-step checklist: Build template → Add students → Invite guides
```

### What "No Blank Screen" Means

The user must see value within 2 minutes of signing up. This means:

- The dashboard shows a **sample report template** pre-loaded (a generic Montessori term report with placeholder sections) that they can edit immediately rather than start from scratch
- The current term/year is pre-populated as an active report period
- There is a visible "Add your first student" button that takes 10 seconds to complete (first name, last name — nothing else required in free tier)

If a user lands on a blank dashboard and has to figure out what to do next, they leave. This is non-negotiable UX.

---

## The User Mental Model

There are two types of users in this product:

### Type 1: The Coordinator (Administrator role)
This is the person who signed up. They are a systems coordinator, office administrator, or Head of School. They:
- Build and manage report templates
- Create report periods (Term 1 2026, Term 2 2026, etc.)
- Add students manually (free tier) or eventually sync from SIS
- Invite guides (send an email invite link)
- Monitor who has completed their reports
- Review, approve, and export final reports

Their primary anxiety: "Will this be harder than our current system?" Answer it immediately by showing them the template builder is genuinely intuitive and a template can be built in 15 minutes.

### Type 2: The Guide (Guide role)
This person was invited by the Coordinator via email. They:
- Click the invite link, create an account
- See a list of their students with report status badges
- Click a student and fill in the narrative sections
- Submit when done
- May receive a change request from the Coordinator

Their primary anxiety: "Is this going to take longer than filling in the Word doc?" Answer it by making the editor genuinely fast, with autosave so they never lose work, and a clear progress indicator.

**Neither of these users should ever need to understand what a "tenant" is, what "RLS" means, or that this is built on Supabase.**

---

## Routes That Must Exist

Every route listed here must be built. No exceptions.

### Public Routes (no auth required)

| Route | Purpose |
|---|---|
| `/report-builder` | Marketing/landing page for this specific product. Headline, key benefits, "Start free" CTA. Not the main WattleOS marketing site — specific to reports. |
| `/report-builder/signup` | Signup form: school name, name, email, password. Or "Continue with Google". |
| `/report-builder/login` | Login for returning users. |
| `/invite/[token]` | Guide invite acceptance. Validates token, creates guide account, redirects to their report dashboard. |

### Coordinator Routes (requires `manage_reports` permission)

| Route | Purpose |
|---|---|
| `/reports` | **Home dashboard.** Shows: current period status, completion progress bar, quick actions. NOT a list of modules or settings. |
| `/reports/setup` | **Onboarding checklist.** Visible until all 3 steps complete: template built, students added, guides invited. Then disappears. |
| `/reports/templates` | List of report templates with edit/duplicate/delete. |
| `/reports/templates/new` | Template builder. |
| `/reports/templates/[id]/edit` | Edit existing template. |
| `/reports/periods` | List of report periods. |
| `/reports/periods/new` | Create new period. |
| `/reports/periods/[id]/dashboard` | **The operational heart.** Grid of all students × guides × status. Filter by guide, status. Bulk actions. |
| `/reports/periods/[id]/generate` | Generate report instances from template + student list. |
| `/reports/instances/[id]/review` | Review a single submitted report. Approve or request changes. |
| `/reports/students` | Student list management. Add/edit/remove students. In free tier: name + class only. |
| `/reports/guides` | Guide list. Invite guides, see their status, resend invites. |
| `/reports/settings` | School name, logo upload (used in PDF header), colour scheme for PDFs. |

### Guide Routes (requires being assigned report instances)

| Route | Purpose |
|---|---|
| `/reports/my-reports` | **Guide home.** List of their students for the current period with status badges. Nothing else visible. |
| `/reports/instances/[id]/edit` | The report editor. Locked sections are visually distinct. Editable sections are the focus. Autosave. Submit button. |

---

## The Template Builder — Detailed Spec

This is the core product feature. It must be excellent.

### Section Types

A template is an ordered list of sections. Each section has a type:

**`header`** — Locked. Renders school logo, student name, class, term, guide name, date. Auto-populated from report instance data. Not editable by guide. Coordinator configures which fields appear.

**`locked_text`** — Locked. Coordinator writes boilerplate that appears on every report (e.g., school philosophy statement, legal notices). Guide cannot touch it.

**`guide_narrative`** — Editable by guide. This is where guides write their per-student observations and assessments. Coordinator sets: label, placeholder hint text, optional word count minimum/maximum, whether it's required before submission.

**`divider`** — Visual separator between sections. Just a horizontal line with optional label.

**`mastery_summary`** — PAID TIER ONLY. Auto-populates from curriculum tracking data. In free tier: visible in template builder as a greyed-out section with a lock icon and tooltip: "Connect Curriculum Tracking to auto-populate this section." If a coordinator adds this section, guides see it greyed out too with a note: "Mastery data not yet connected."

**`observation_highlights`** — PAID TIER ONLY. Same treatment as mastery_summary.

### Template Builder UX

- Sections displayed as a vertical stack of cards
- Drag handle on left side to reorder
- "Add Section" button between each existing section and at the bottom
- Clicking "Add Section" shows a type picker (large icons, clear labels)
- Each section card is immediately editable inline — no modal, no separate page
- Preview button renders a sample report with placeholder data in a side panel
- Save is automatic — no "save" button, just a "last saved" timestamp

### The Paid Tier Sections in the Builder

When a coordinator adds a `mastery_summary` or `observation_highlights` section in the free tier:

```
[Mastery Summary]                                     🔒 Paid Feature

  This section auto-populates from your curriculum tracking data.
  Connect Curriculum & Mastery tracking to unlock.

  [Connect Curriculum Tracking]    [Keep as manual text section instead]
```

"Keep as manual text section instead" converts it to a `guide_narrative` section so they can still have a mastery section — they just fill it in manually. This is honest. It also means every guide who fills in mastery manually is feeling exactly the friction the upgrade removes.

---

## The Student & Guide Management — Detailed Spec

### Students (Free Tier)

Students are added manually. The form is:
- First name (required)
- Last name (required)
- Preferred name (optional)
- Class/cycle (required — dropdown the coordinator configures: "Wattle Room 3-6", "Banksia Room 6-9", etc.)

That is all. No date of birth, no medical info, no guardian details. Those belong to the full SIS module. A student in the free tier is just a name attached to a class.

Adding a student takes under 30 seconds. There must also be a **CSV import** option: download a template CSV, fill in names, upload. A school with 60 students should be able to import them all in 2 minutes.

### Guides (Invite Flow)

Coordinator enters the guide's email address and clicks "Send Invite". The system:
1. Creates a `parent_invitations` record (reusing existing schema) with a secure token and 14-day expiry
2. Sends an email: "You've been invited to WattleOS Report Builder by [School Name]. Click here to create your account and access your reports."
3. Guide clicks link → creates account → lands directly on `/reports/my-reports`
4. Coordinator sees guide status: Invited / Active / Last active [date]

Coordinator can also assign which classes a guide is responsible for. When report instances are generated, they are automatically assigned to the guide whose class matches the student's class.

---

## PDF Generation — Detailed Spec

PDFs are generated using `@react-pdf/renderer`. The PDF must look professional enough that a parent would be proud to receive it.

### PDF Layout

```
┌────────────────────────────────────────────────┐
│  [School Logo]          [School Name]           │
│                         [Term] [Year]           │
├────────────────────────────────────────────────┤
│  Student: [Full Name]   Class: [Class Name]     │
│  Guide: [Guide Name]    Date: [Generated Date]  │
├────────────────────────────────────────────────┤
│                                                 │
│  [Section Label]                                │
│  [Guide narrative content...]                   │
│                                                 │
│  [Section Label]                                │
│  [Guide narrative content...]                   │
│                                                 │
│  (locked_text sections render in a subtle       │
│   background colour to distinguish them)        │
│                                                 │
├────────────────────────────────────────────────┤
│  Confidential — [School Name] — [Term] [Year]   │
└────────────────────────────────────────────────┘
```

### PDF Settings (configured in `/reports/settings`)
- School logo (uploaded image, displayed in header)
- Accent colour (used for section headers and footer line)
- Paper size: A4 (default for Australian schools) or Letter
- Font choice: 3 options (clean serif, clean sans-serif, friendly rounded)

### PDF Storage
Generated PDFs are stored in Supabase Storage at:
`reports/{tenant_id}/{period_id}/{instance_id}/report.pdf`

A signed URL is returned to the coordinator for download. Bulk export downloads a ZIP of all approved reports for a period.

---

## The Workflow State Machine

Every report instance moves through these states:

```
not_started
    ↓ (guide opens and starts typing)
in_progress
    ↓ (guide clicks "Submit for Review")
submitted
    ↓ (coordinator reviews)
    ├─→ changes_requested (coordinator sends back with notes)
    │       ↓ (guide addresses notes, resubmits)
    │   submitted (again)
    ↓ (coordinator approves)
approved
    ↓ (coordinator publishes period — generates and stores PDF)
published
```

Each state has a distinct visual treatment:
- `not_started` — grey
- `in_progress` — amber
- `submitted` — blue
- `changes_requested` — orange (attention needed)
- `approved` — green
- `published` — purple

---

## The Milestone Expansion Prompts

These are **not banners**. They are contextual, data-driven messages that appear at the right moment in the right place. The copy below is final — use it verbatim.

### Prompt 1: After guide fills 5th narrative section for 5th student
Location: Inside the guide's report editor, below the section they just completed.
```
You've written this 5 times today. With Curriculum Tracking connected,
the mastery summary section writes itself from your recorded observations.
```
[See how it works] — links to `/report-builder/upgrade?feature=mastery`

### Prompt 2: After coordinator generates a report period
Location: Top of the period dashboard, dismissible.
```
These reports have [X] fields you'll fill in manually this term.
Connect student records and attendance tracking and most of these
auto-fill — your guides focus on the narrative sections only.
```
[Connect student records] [Dismiss]

### Prompt 3: When coordinator approves all reports and is ready to export
Location: Above the bulk export button.
```
Reports ready. Want parents to receive these through the app
instead of a PDF attachment? Upgrade to enable the Parent Portal.
```
[Enable Parent Portal] [Download PDFs]

### Prompt 4: When a second guide from the same school signs up independently
Location: Coordinator dashboard notification.
```
[Guide name] from your school signed up for WattleOS separately.
Upgrade to the School plan so your whole team shares one workspace
and you can see all reports from one dashboard.
```

### Prompt 5: End of academic year (triggered annually)
Location: Email to coordinator + banner on dashboard in February.
```
Your first year on WattleOS Report Builder:
• [X] reports generated
• [Y] narrative sections written by your guides
• [Z] PDFs delivered to parents

What would have been automatic with the full platform:
• Mastery summaries (written manually [Y/3] times)
• Attendance data (entered manually [X] times)
• Student data synced automatically from enrollment

[See what the full platform includes]
```

---

## Free Tier Limits (Enforced in Server Actions, Not RLS)

| Limit | Free | Paid |
|---|---|---|
| Students | 40 | Unlimited |
| Guides | 5 | Unlimited |
| Active report periods | 1 | Unlimited |
| Report history | Current period only | All periods |
| Template types: header, locked_text, guide_narrative, divider | ✅ | ✅ |
| Template types: mastery_summary, observation_highlights | ❌ Visible, locked | ✅ Auto-populated |
| Merge fields: student name, class, guide, term | ✅ | ✅ |
| Merge fields: attendance days, mastery count, observation count | ❌ Visible, locked | ✅ Auto from connected modules |
| PDF export (individual) | ✅ | ✅ |
| PDF export (bulk) | ✅ | ✅ |
| CSV student import | ✅ | ✅ |
| Parent portal delivery | ❌ | ✅ |
| Custom PDF branding (logo, colours) | ✅ | ✅ |

**Note on the 40-student limit:** 40 students is approximately 2 Montessori classes. A single guide with a single class has 20–28 students. This means one guide can use the free tier indefinitely. When the second guide's class is added, they hit the limit. That is the intended trigger — the school is now institutionally using the product, not just one person experimenting.

---

## What This Product Does NOT Do (Free Tier)

Be explicit about these in the UI so there are no surprises:

- **Does not have a parent portal.** Reports are downloaded as PDFs and distributed by the school.
- **Does not sync with any SIS.** Students are added manually or via CSV.
- **Does not auto-populate mastery or attendance data.** Guides write those sections manually.
- **Does not have observation capture.** That is a separate product (WattleOS Observations).
- **Does not have billing, payroll, or attendance tracking.** Those require the full platform.

These absences should be communicated positively in the onboarding: "WattleOS Report Builder is focused on doing one thing exceptionally well — managing your term reports. Connect other modules as your school needs them."

---

## Database Notes

The canonical WattleOS schema already defines `report_templates`, `student_reports`, `report_periods` in the Module 7 schema. Use those tables. Add the following that are specific to the standalone product:

```sql
-- Lightweight students for free tier (no full SIS profile required)
-- When a school upgrades and connects SIS, student_id on report_instances
-- is populated from the full students table and these lightweight records
-- are no longer needed.
CREATE TABLE report_builder_students (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id),
  first_name      TEXT NOT NULL,
  last_name       TEXT NOT NULL,
  preferred_name  TEXT,
  class_label     TEXT NOT NULL,  -- e.g. "Wattle Room 3-6" — free text, not FK
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_rb_students_tenant ON report_builder_students (tenant_id) WHERE deleted_at IS NULL;
SELECT apply_updated_at_trigger('report_builder_students');
ALTER TABLE report_builder_students ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON report_builder_students
  FOR ALL USING (tenant_id = current_tenant_id());

-- Guide invitations (reuses pattern from parent_invitations in canonical schema)
CREATE TABLE guide_invitations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id),
  email           TEXT NOT NULL,
  invited_by      UUID NOT NULL REFERENCES users(id),
  token           TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  class_labels    TEXT[] NOT NULL DEFAULT '{}',  -- which classes this guide is responsible for
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  accepted_at     TIMESTAMPTZ,
  accepted_by_user UUID REFERENCES users(id),
  expires_at      TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '14 days',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ,
  UNIQUE(tenant_id, email)
);

CREATE INDEX idx_guide_invites_token ON guide_invitations (token) WHERE status = 'pending';
CREATE INDEX idx_guide_invites_tenant ON guide_invitations (tenant_id) WHERE deleted_at IS NULL;
SELECT apply_updated_at_trigger('guide_invitations');
ALTER TABLE guide_invitations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage invitations" ON guide_invitations
  FOR ALL USING (
    tenant_id = current_tenant_id()
    AND has_permission('manage_reports')
  );

-- Signup tracking for PLG analytics
CREATE TABLE product_signups (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id),
  product_slug    TEXT NOT NULL,  -- 'report-builder', 'observations', 'curriculum', 'admissions'
  signed_up_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  source_url      TEXT,
  utm_campaign    TEXT,
  utm_source      TEXT
);

ALTER TABLE product_signups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role only" ON product_signups
  FOR ALL USING (false);  -- only accessible via service role in server actions
```

---

## The Self-Serve Signup Server Action

This is the most critical server action in the entire product. It runs when someone submits the signup form and creates the entire account in one atomic transaction.

```typescript
// src/lib/actions/report-builder-signup.ts

interface SignupInput {
  schoolName: string
  firstName: string
  lastName: string
  email: string
  password: string
  sourceUrl?: string
  utmCampaign?: string
}

interface SignupResult {
  tenantId: string
  userId: string
  redirectTo: string  // '/reports/setup' for new signups
}

async function signupForReportBuilder(
  input: SignupInput
): Promise<ActionResponse<SignupResult>>

// This function must:
// 1. Create Supabase Auth user (email + password or Google OAuth handled separately)
// 2. Create tenant record with slug derived from schoolName
// 3. Create user record linked to auth.users
// 4. Seed default roles and permissions for tenant
// 5. Create tenant_user with Administrator role
// 6. Create default report period for current term/year
// 7. Create a sample report template (pre-loaded with generic Montessori sections)
// 8. Log to product_signups table
// 9. Send welcome email
// 10. Return { tenantId, userId, redirectTo: '/reports/setup' }
//
// Must be atomic — if any step fails, the entire signup rolls back.
// Use Supabase service role client for steps 2-8 (bypasses RLS for setup).
// Never expose the service role key to the client.
```

---

## Success Criteria

The product is ready when:

1. A person with no prior WattleOS knowledge can find `wattleos.au/report-builder`, sign up, build a report template, add 3 students, invite 1 guide, and have that guide fill a report — all within 30 minutes.

2. The guide's experience of filling a report is faster and less frustrating than filling in a Word document and emailing it.

3. The coordinator can export all completed reports as a ZIP of PDFs in two clicks.

4. All 5 milestone expansion prompts appear at the correct moment.

5. The free tier limits (40 students, 5 guides, 1 active period) are enforced in server actions with a clear upgrade message, not a cryptic error.

6. A school can use this product for a full academic year on the free tier without hitting a limit that forces them off — but they will have seen enough upsell moments to understand exactly what upgrading would give them.
