# Custody Restrictions and Safety

Custody restrictions are among the most sensitive records in WattleOS. They document court-ordered or parent-directed limitations on who can contact, collect, or receive information about a child. Getting these records wrong has serious safety implications, so WattleOS treats custody data with the highest level of access control and data protection in the platform.

## Restriction Types

Each custody restriction record identifies a restricted person by name and specifies what type of restriction applies. The four restriction types are:

**No Contact** - the restricted person may not have any contact with the child on school premises. This includes direct interaction, passing messages, or being present during pickup and drop-off. **No Pickup** - the restricted person is specifically prohibited from collecting the child from school, but may not be subject to a broader contact restriction. **Supervised Only** - the restricted person may have contact with the child, but only under supervision by a staff member. **No Information** - the restricted person may not receive any information about the child, including academic progress, attendance, medical updates, or even confirmation of enrollment.

A single child can have multiple restrictions - for example, one person may be subject to no contact while another is restricted to supervised visits only.

## Creating a Restriction

Custody restrictions are added from the student's profile by a user with the appropriate safety permission. Each record requires the restricted person's name and the restriction type. You can also record a court order reference number, upload or link to a court order document, and add notes providing context or instructions for staff.

Every restriction must have an effective date - the date from which the restriction is in force. An optional expiry date can be set if the restriction is time-limited (for example, an interim court order that expires after a hearing). If no expiry date is set, the restriction is treated as ongoing.

Custody restriction data collected during the enrollment application process is automatically converted into structured restriction records when the application is approved. If a parent listed custody restrictions on their enrollment form, those details appear on the student's profile from day one.

## Data Encryption

The restricted person's name, court order reference, and notes fields are encrypted at the database level. WattleOS uses field-level encryption for custody data because this information is legally sensitive and must be protected against unauthorized access, including database-level breaches. Even someone with direct database access cannot read these fields without the encryption key.

This encryption is transparent to authorized users - when you view a custody restriction in the WattleOS interface with the correct permissions, the data is decrypted automatically. You do not need to do anything special to read or edit encrypted fields.

## How Restrictions Appear in the Platform

Custody restrictions are flagged on the student's profile in a dedicated section visible only to users with safety permissions. The restriction type and restricted person's name are displayed with clear visual indicators. In safety-critical workflows like pickup authorization, the attendance system cross-references custody restrictions to ensure restricted persons are not inadvertently authorized for collection.

When staff use the check-in/check-out system, custody restrictions inform the pickup authorization display. A person listed under a no-pickup or no-contact restriction will not appear as an authorized pickup person, and their name may be flagged if it matches an attempted check-out.

## Editing and Removing Restrictions

Restrictions can be updated to change the type, modify the court order reference, adjust dates, or add notes. Like all sensitive records in WattleOS, deletion is a soft delete - the record is marked as removed but retained indefinitely for legal and audit purposes. This is particularly important for custody data, where schools may need to demonstrate what restrictions were in place at a specific point in time.

All changes to custody restrictions are captured in the audit trail, including who made the change and when. This provides schools with a defensible record if restriction compliance is ever questioned.

## Access Control

Custody restrictions have the strictest access control in WattleOS. They are not visible to staff who only hold general student viewing permissions. Access requires the **MANAGE_SAFETY_RECORDS** permission, which is typically limited to school administrators and designated safety officers.

At the database level, custody restrictions are protected by a dedicated row-level security policy that checks for the safety permission specifically. This is a separate policy from the general tenant isolation applied to other tables. Even within the same school, a guide who can view student profiles and medical conditions cannot see custody data unless they hold the safety records permission.

Parents do not have direct access to custody restriction records through the parent portal. This is intentional - in custody disputes, both parties may have portal access, and exposing restriction details to the restricted party could compromise the child's safety. Schools should communicate restriction details to the relevant guardian through secure, offline channels.

## Permissions

Viewing and managing custody restrictions requires the **MANAGE_SAFETY_RECORDS** permission. This permission is intentionally separate from VIEW_MEDICAL_RECORDS and MANAGE_MEDICAL_RECORDS. A user can have full access to medical data but no visibility into custody restrictions, and vice versa. This separation ensures schools can assign safety responsibilities to specific staff members without granting broader medical access.
