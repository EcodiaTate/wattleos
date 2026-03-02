# Application Approval

Approving an enrollment application is the most powerful single action in WattleOS. One click triggers a cascade that creates the student record, enrollment, guardian links, medical conditions, emergency contacts, custody restrictions, consent records, and parent invitations — all from the data the family provided in their application. Zero re-entry.

## The Approval Cascade

When an administrator clicks **Approve** on an application, WattleOS executes these steps in sequence:

### Step 1: Create or Update Student Record

**New enrollment**: Creates a student record with the child's first name, last name, preferred name, date of birth, gender, nationality, languages, and previous school. The enrollment status is set to "active."

**Re-enrollment**: Updates the existing student record with any changed details from the re-enrollment application (preferred name, gender, compliance fields). Reactivates the enrollment status.

### Step 2: Create Enrollment Record

Creates an enrollment record linking the student to the class that the administrator selected during review. The start date comes from the family's requested start date, or defaults to today if none was specified. The enrollment status is set to "active."

### Step 3: Create Guardian Records

For each guardian listed on the application, WattleOS:

1. Checks if a user account already exists with that email address
2. If a guardian record already exists for this email + student + tenant combination, updates it with the latest details
3. If no record exists, creates a new guardian record with the full details: name, email, phone, relationship, pickup authorisation, emergency contact status, media consent, and directory consent

Guardian records are created even when the parent has not yet created a WattleOS account. The record stores the guardian's identity via email, first name, and last name. When the parent later accepts their invitation and creates an account, the system backfills the user_id onto the existing guardian record, preserving all the rich data from the application.

### Step 4: Create Medical Conditions

For each medical condition from the application, creates a medical_conditions record linked to the student. Carries over the condition name, severity, notes, and action plan information.

### Step 5: Create Emergency Contacts

For each emergency contact beyond the guardians, creates an emergency_contacts record linked to the student with name, phone, relationship, and priority order.

### Step 6: Create Custody Restrictions

For each custody restriction from the application, creates a safety record linked to the student. This is particularly sensitive data — custody restrictions control which individuals are not permitted to collect the child.

### Step 7: Create Parent Invitations

For each guardian with an email address, generates a secure invitation token and creates a parent_invitations record. The invitation includes the parent's email, the linked student, a 14-day expiry, and a unique token. These invitations enable parents to create their WattleOS account and access the Parent Portal.

### Step 8: Update Application Status

Sets the application status to "approved," records the reviewing administrator and timestamp, and logs the action in the audit trail.

## Prerequisites for Approval

Before approving, the administrator must:

1. **Assign a class** — Select which class the student will join. Approval is blocked without a class assignment.
2. **Review the application** — The application must be in Submitted, Under Review, or Changes Requested status. Draft, already-approved, or rejected applications cannot be approved.

## What the Family Experiences

After approval, the family receives:

- Invitation emails for each guardian to create their WattleOS account
- When they accept the invitation and log in, they see their child in the Parent Portal with the portfolio, attendance, reports, and communications already accessible
- All the information they provided in the application — medical conditions, emergency contacts, guardian details — is already in the system with no need to re-enter anything

## Rejection

If an application does not meet requirements, administrators can reject it. Rejection updates the application status and records the reviewer, but does not trigger any cascade — no student record, enrollment, or invitations are created.

Rejected applications are preserved in the system for audit purposes but can be filtered out of the active applications list.

## Permissions

- **Approve Applications** — Required to trigger the approval cascade. This is the most consequential enrollment permission because it creates student records, guardian links, and invitations in a single action.
- **Review Applications** — Required to view application details and assign classes (prerequisite for approval).
