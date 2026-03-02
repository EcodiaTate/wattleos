# Admissions Pipeline

The Admissions Pipeline tracks every prospective family from their first inquiry through to enrollment. It uses a multi-stage pipeline model that gives administrators visibility into where each family sits and how long they have been waiting — essential for Montessori schools that often manage multi-year waitlists.

## Accessing the Pipeline

Navigate to **Admin → Admissions**. This requires either the **Manage Waitlist** or **View Waitlist** permission.

## Pipeline Stages

Every entry in the pipeline moves through these stages:

**Inquiry** — The family has submitted an inquiry through the public form or been manually added. This is the first point of contact.

**Waitlisted** — The inquiry has been reviewed and the family is placed on the waitlist. The school is aware of their interest but no action has been taken yet.

**Tour Scheduled** — A school tour has been booked for the family. The entry links to a specific tour slot with date and time.

**Tour Completed** — The family attended their tour. Staff can record tour notes and whether the family was a good fit.

**Offered** — The school has extended a placement offer to the family. The offer includes the program, proposed start date, and an optional expiry date.

**Accepted** — The family has accepted the offer. The entry is ready to be converted into a formal enrollment application.

**Enrolled** — The admission process is complete. The entry has been converted to a student record through the enrollment approval process. This is a terminal stage.

**Declined** — The family declined the offer. Can be moved back to Waitlisted if they change their mind.

**Withdrawn** — The family withdrew from the process. Can be moved back to Inquiry if they return later.

## Stage Transition Rules

The pipeline enforces allowed transitions to prevent skipping steps:

| From | Allowed transitions |
|---|---|
| Inquiry | → Waitlisted, → Withdrawn |
| Waitlisted | → Tour Scheduled, → Offered, → Withdrawn |
| Tour Scheduled | → Tour Completed, → Waitlisted, → Withdrawn |
| Tour Completed | → Offered, → Waitlisted, → Withdrawn |
| Offered | → Accepted, → Declined, → Withdrawn |
| Accepted | → Enrolled, → Withdrawn |
| Enrolled | (terminal — no transitions) |
| Declined | → Waitlisted |
| Withdrawn | → Inquiry |

Attempting an invalid transition returns an error explaining which transitions are available.

## The Kanban View

The admissions page displays entries in a kanban-style board with columns for each active stage. Cards show the child's name, parent contact details, requested program, inquiry date, and how many days the entry has been in the pipeline.

Cards can be moved between columns by clicking on the entry and using the Stage Transition Modal, which lets you select the target stage and add optional notes. Every transition is logged in the stage history.

## Pipeline Entry Details

Click on any entry to open its detail page. This shows:

- **Child information**: name, date of birth, gender, current school
- **Parent information**: name, email, phone
- **Program preferences**: requested program, preferred start date/term
- **Sibling information**: whether they have siblings at the school
- **Referral source**: how the family heard about the school, source URL, campaign
- **Tour details**: scheduled date, guide, notes, attendance status
- **Offer details**: offered program, start date, expiry, response
- **Admin notes**: internal notes not visible to the family
- **Stage history**: a complete audit trail of every stage change with who made it, when, and any notes

## Public Inquiry Form

Families submit inquiries through a public form hosted at your school's subdomain. The form collects child details (name, date of birth, gender, current school), parent contact information, program preferences, sibling information, and how they heard about the school.

The form validates for duplicate inquiries — if an entry already exists for the same parent email and child name (excluding declined and withdrawn entries), the submission is blocked with a message to contact the school for an update.

Inquiries submitted through the public form automatically create an entry at the Inquiry stage with a logged history record noting "Inquiry submitted via public form."

## Priority and Sorting

Each entry has a priority number that administrators can set to influence ordering. The pipeline list supports sorting by priority, inquiry date, or child last name, in ascending or descending order. Entries can also be filtered by stage, requested program, and free-text search across child and parent names and email.

## Making an Offer

When the school is ready to offer a placement, use the **Make Offer** action from the entry detail page or the stage transition modal. This requires specifying the offered program, proposed start date, and an optional expiry date. The entry moves to the Offered stage and the offer details are recorded.

## Connecting to Enrollment

When a family accepts an offer and their entry reaches the Accepted stage, the "accepted → enrolled" transition bridges to the Enrollment module (Module 10). This converts the waitlist entry into a pre-filled enrollment application, carrying over child details, parent information, and program preferences so the family does not need to re-enter information they have already provided.

## Email Templates

The admissions module supports reusable email templates with merge tags. Templates can be configured to auto-trigger when an entry moves to a specific stage — for example, automatically sending a "Tour Invitation" email when an entry moves to Tour Scheduled. Templates support merge tags like `{{child_first_name}}`, `{{parent_full_name}}`, `{{tour_date}}`, `{{offered_program}}`, and `{{school_name}}` which are resolved from the entry data at send time.

## Permissions

- **View Waitlist** — Read-only access to the pipeline and entry details
- **Manage Waitlist** — Full access: add entries, transition stages, make offers, edit details, delete entries
- **Manage Tours** — Create and manage tour slots (covered in the Tours documentation)
- **Manage Email Templates** — Edit automated email templates for admissions communications
- **View Admissions Analytics** — Access conversion rates, pipeline metrics, and inquiry source data
