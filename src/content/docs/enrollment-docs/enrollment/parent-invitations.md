# Parent Invitations

Parent invitations are the bridge between enrollment approval and parent access to WattleOS. When an application is approved, invitations are automatically generated for each guardian. Parents click the invitation link, create or sign into their account, and are immediately connected to their child's profile in the Parent Portal.

## How Invitations Work

The invitation flow has five steps:

1. **Application approved** - The approval cascade automatically creates invitation records for each guardian listed on the application, each with a unique secure token and a 14-day expiry.

2. **Email sent** - An email is sent to the guardian's address containing a link to `yourschool.wattleos.au/invite/{token}`.

3. **Token validated** - When the parent clicks the link, the system validates the token: checks it exists, is still pending (not already accepted, expired, or revoked), and has not passed its expiry date. If the token is expired, it is automatically marked as expired.

4. **Parent creates or signs into account** - The parent either creates a new WattleOS account or signs in with an existing one. The invitation page shows the school name and child's name so the parent knows what they are accepting.

5. **Invitation accepted** - The system links the parent's user account to the existing guardian record by setting the user_id field. This backfill approach preserves all the guardian details (phone, relationship, consent flags, pickup authorisation) that were stored when the enrollment was approved. The parent immediately sees their child in the Parent Portal.

## Why Tokens Instead of Magic Links

Invitation tokens work across devices. A parent can receive the email on their phone, then open the link on their desktop computer. The token validates independently of any browser session, making the process robust for families who may not check email and complete signup in the same session.

## Managing Invitations

Navigate to **Admin → Enrollment → Invitations** to see all invitations. The list shows:

- Parent email address
- Linked student name
- Who sent the invitation (the inviter)
- Status: Pending, Accepted, Expired, or Revoked
- Creation date

### Filtering

Filter invitations by status or student to quickly find pending invitations that may need attention (e.g. parents who have not yet accepted).

### Invitation Statuses

- **Pending** - The invitation has been sent but not yet accepted. The token is valid and the parent can still use it.
- **Accepted** - The parent has clicked the link, authenticated, and been connected to their child. The invitation is complete.
- **Expired** - The 14-day window has passed without the parent accepting. Expired invitations can be resent.
- **Revoked** - An administrator has manually cancelled the invitation before it was accepted.

## Manual Invitations

Administrators can manually create invitations for parents who were not on the original enrollment application. This is useful for:

- Inviting a second parent who was not listed on the application
- Re-sending an invitation after the original expired
- Connecting a new guardian to an existing student (e.g. a step-parent joining the family)

To create a manual invitation:

1. Go to **Admin → Enrollment → Invitations**
2. Click **New Invitation**
3. Enter the parent's email address and select the student
4. Click Create

The system generates a token, creates the invitation record, and sends the email. Duplicate invitations (same email + same student) are blocked to prevent confusion.

## Resending Invitations

If a parent's invitation expires or they cannot find the original email, administrators can create a new invitation for the same parent and student. The previous expired or revoked invitation remains in the system for audit purposes, and the new one generates a fresh token with a new 14-day window.

## Mass Invite

For bulk onboarding (e.g. after approving an entire class of enrollments), the **Mass Invite** tool on the Data Import page accepts a CSV of parent emails and student names, generating invitations for each row. This is covered in the Data Import documentation.

## Security Considerations

Invitation tokens are cryptographically random and stored in the database. They are single-use - once accepted, the token cannot be reused. Expired tokens are automatically invalidated when a parent attempts to use them. Validation uses an admin client (service role) because the parent may not yet have an authenticated session when clicking the link.

The token validation endpoint returns only the minimum information needed for the invitation page: school name, school slug, student first and last name, parent email, and expiry date. No sensitive data is exposed through the public token validation.

## Permissions

- **Manage Parent Invitations** - Required to view, create, and revoke invitations. This permission is included in the default Administrator and Office Staff roles.
