# Pickup Authorizations

WattleOS maintains a record of who is authorized to pick up each student. This is a child safety feature — schools need to verify that the person collecting a child is someone the parents have approved.

## Where to Find Them

Pickup authorizations appear on the student detail page, in a dedicated section below the Guardians section. Navigate to a student's profile to view and manage their authorized pickup persons.

## Guardians vs. Pickup Authorizations

Guardians (parents and legal guardians) are managed through the enrollment and admissions process. They are the primary contacts for the student and have access to the Parent Portal.

Pickup authorizations are for additional people who may collect the child but are not guardians — grandparents, nannies, family friends, older siblings, or anyone else the parent approves. These people do not get WattleOS accounts or Parent Portal access.

## Adding an Authorized Person

Click **Add Person** in the Pickup Authorizations section header. A form appears with the following fields:

**Full Name** (required) — The person's full name as they would identify themselves at pickup.

**Relationship** — How they are related to the student (e.g. Grandmother, Nanny, Family Friend, Uncle). Optional but helpful for staff recognition.

**Phone** — A contact phone number. Optional but recommended so staff can verify identity if needed.

**Permanent authorization** — A checkbox that defaults to enabled. When checked, the person can pick up the student at any time with no expiry.

**Valid From / Valid Until** — If the authorization is not permanent, date fields appear for setting a specific validity window. This is useful for temporary arrangements (e.g. "Grandmother is picking up for the next two weeks while Mum is travelling").

## Authorization Types

**Permanent** — Shown with a green "Permanent" badge. The person is authorized to pick up the student indefinitely until the authorization is removed.

**Temporary** — Shown with an amber "Temporary" badge. The authorization is only valid within the specified date range. After the end date, it is automatically shown as "Expired" with reduced opacity, making it clear at a glance that it is no longer active.

## Validity Checking

WattleOS automatically checks whether temporary authorizations are currently valid by comparing the current date against the valid-from and valid-until dates. Expired authorizations remain visible in the list (so there is a historical record) but are visually dimmed and marked as expired.

## Removing an Authorization

Click **Remove** next to any authorization. A confirmation dialog asks "Remove [name] from pickup authorizations?" before proceeding. Removal is immediate — the record is soft-deleted and disappears from the list.

## Best Practices

- **Keep the list current**: At the start of each term, review pickup authorizations for each student and remove anyone who is no longer relevant.

- **Use temporary for short-term arrangements**: If a parent says "My sister will pick up this week," add her as a temporary authorization with the correct date range rather than a permanent one.

- **Record phone numbers**: If an unfamiliar person arrives claiming to be authorized, having their phone number on file lets you call and verify.

- **Communicate with parents**: When a parent adds or changes pickup arrangements, confirm the details and enter them into WattleOS promptly. The system is only as reliable as the data entered.

## Permissions

Managing pickup authorizations is part of the student record and requires the **Manage Students** permission. This is included in the default Administrator and Guide roles.
