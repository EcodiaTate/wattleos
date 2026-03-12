# Enrollment Periods and Applications

Enrollment periods are windows when your school accepts applications from new or returning families. Administrators create periods with specific dates, required documents, and custom fields. Parents submit applications through a public multi-step wizard during the open window.

## Accessing Enrollment

Navigate to **Admin → Enrollment** to see the enrollment dashboard. This requires enrollment-specific permissions: **Manage Enrollment Periods**, **Review Applications**, or **View Enrollment Dashboard**.

## Enrollment Periods

A period defines when and how your school accepts applications. Each period has:

- **Name** - A descriptive label (e.g. "2027 New Enrollment," "Term 2 Mid-Year Intake")
- **Period type** - New enrollment, re-enrollment, or mid-year intake
- **Year** - The academic year the period applies to
- **Opens at** - When applications start being accepted
- **Closes at** - Optional deadline after which submissions are blocked
- **Status** - Draft, Open, Closed, or Archived
- **Available programs** - Which programs families can apply for (e.g. Cycle 1, Cycle 2, Primary)
- **Required documents** - Document types families must upload (e.g. birth certificate, immunisation record)
- **Custom fields** - School-specific questions added to the application form
- **Welcome message** - Introductory text shown at the start of the application wizard
- **Confirmation message** - Thank-you text shown after successful submission

### Creating a Period

1. Navigate to **Admin → Enrollment → New Enrollment Period**
2. Fill in the name, type, year, and opening date
3. Configure available programs, required documents, and any custom fields
4. Save as draft

The period starts in **Draft** status and is not visible to parents. When ready, change the status to **Open** to begin accepting applications. When the enrollment window closes, change to **Closed** to stop new submissions while keeping existing applications accessible for review. Finally, **Archive** completed periods to move them off the active list.

### Period Statistics

The enrollment list page shows each period with application counts: total, submitted, approved, and rejected. This gives administrators a quick overview of progress across all active enrollment windows.

## The Public Enrollment Wizard

Parents access the enrollment form at your school's subdomain (`yourschool.wattleos.au/enroll`). The wizard is a 10-step guided form:

1. **Your Details** - Parent/guardian name, email, phone, relationship
2. **Child Information** - Child name, preferred name, date of birth, gender, nationality, languages, previous school
3. **Program Selection** - Choose from the period's available programs, preferred start date
4. **Additional Guardians** - Add second parent or other guardians with contact details and relationship
5. **Medical Information** - Allergies, conditions, medications, severity levels, action plans
6. **Emergency Contacts** - Emergency contact details beyond the guardians
7. **Custody Restrictions** - Court orders, restricted persons, and custody documentation (if applicable)
8. **Documents** - Upload required documents (birth certificate, immunisation records, etc.)
9. **Consents** - Media consent, directory consent, terms acceptance, privacy acceptance
10. **Review and Submit** - Review all entered information and submit the application

The wizard saves progress to local storage so parents can close the browser and return later without losing their work. The form only shows open periods that are currently within their date window.

### Re-enrollment

For returning families, WattleOS provides a re-enrollment flow through the Parent Portal. Parents of existing students can submit a re-enrollment application that pre-fills child information from the existing student record. This flow is linked to re-enrollment type periods and avoids duplicate data entry.

## Application Review

Submitted applications appear on the **Admin → Enrollment → Applications** page. The list supports filtering by:

- **Status** - Draft, Submitted, Under Review, Changes Requested, Approved, Rejected, Withdrawn
- **Enrollment period** - Filter to a specific enrollment window
- **Search** - Free-text search on child name or parent email

### Application Detail Page

Click on an application to see everything the family submitted: child details, guardian information, medical conditions, emergency contacts, custody restrictions, uploaded documents, consent flags, and any custom field responses.

The detail page includes:

**Document Section** - View and verify uploaded documents. Staff can mark documents as verified, add notes, and track which documents are still missing.

**Admin Notes** - Internal notes visible only to staff, for recording review comments or follow-up items.

**Class Assignment** - Before approving, an administrator must assign the student to a class. This determines which classroom the child will join.

## Application Statuses

Applications progress through these statuses:

- **Draft** - Started but not yet submitted (saved in the wizard)
- **Submitted** - The family completed and submitted the application
- **Under Review** - Staff has begun reviewing the application
- **Changes Requested** - Staff has requested the family provide additional information or corrections
- **Approved** - The application has been approved and the enrollment cascade has been triggered
- **Rejected** - The application has been declined
- **Withdrawn** - The family withdrew their application

Only applications in Submitted, Under Review, or Changes Requested status can be approved.

## Permissions

- **Manage Enrollment Periods** - Create, edit, open, close, and archive enrollment periods
- **Review Applications** - View submitted applications and their details
- **Approve Applications** - Approve or reject applications (triggers the enrollment cascade)
- **View Enrollment Dashboard** - Access enrollment statistics and pipeline overview
