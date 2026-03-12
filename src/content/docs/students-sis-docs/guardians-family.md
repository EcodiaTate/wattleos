# Guardians and Family

The guardian system in WattleOS links parents and carers to student records. Guardians are the bridge between the school-facing student data and the parent portal - every parent who logs in to WattleOS sees their children because of the guardian relationship. Getting these relationships right also drives consent management, pickup authorization, and emergency contact designation.

## How Guardian Records Work

A guardian record connects a user account to a student with a defined relationship. The available relationship types are **mother**, **father**, **grandparent**, **step-parent**, **foster-parent**, and **other**. Each guardian record also carries several flags that control their access and permissions.

The **is primary** flag designates the main contact for the child. While multiple guardians can be linked to a student, only one should be marked as primary. The primary guardian is the default recipient for school communications and the first point of contact.

The **is emergency contact** flag indicates whether this guardian should be contacted in an emergency. This is separate from the dedicated emergency contacts list (covered below), which can include non-guardians like family friends or neighbours.

The **pickup authorized** flag controls whether this guardian is permitted to collect the child from school. It defaults to yes for new guardians. When set to no, the guardian can still access the parent portal and view their child's information but will not appear on pickup authorization lists used by front-desk staff.

## Consent Flags

Each guardian record carries two consent flags. **Media consent** controls whether photos and videos of the child can be published in observations visible through the parent portal or used in school materials. **Directory consent** controls whether the family's information can be included in a school directory shared with other families.

These consent flags live on the guardian record rather than the student record because different guardians for the same child may have different consent preferences. WattleOS checks media consent when a guide publishes an observation - if any tagged student has a guardian who has not granted media consent, the guide receives a warning before photos or videos are shared.

## Adding Guardians

Guardians are most commonly created automatically during the enrollment approval process. When an enrollment application is approved, WattleOS creates guardian records for every parent or carer listed on the application, generates parent invitation tokens, and sends invitations so they can create their WattleOS account and access the parent portal.

If a guardian does not yet have a WattleOS account when the enrollment is approved, the guardian record is still created with their name and email from the application. This means the student profile correctly shows the guardian's details even before the parent accepts their invitation. Once they create an account and accept the invitation, their user account is linked to the existing guardian record. The student profile distinguishes between guardians whose accounts are linked and those who have been invited but have not yet signed up.

Guardians can also be added manually from the student profile by an administrator. You specify the user account (or email for a pending invitation), the relationship type, and set the appropriate flags.

## Editing and Removing Guardians

Updating a guardian record lets you change the relationship type, toggle the primary/emergency/pickup flags, update the phone number, or adjust consent settings. Removing a guardian is a soft delete - the record is retained for audit purposes but the link between that person and the student is severed. The removed guardian will no longer see the child in their parent portal.

## Emergency Contacts

Emergency contacts in WattleOS are a separate system from guardians. Not every emergency contact is a guardian (a neighbour or family friend may be listed), and not every guardian is an emergency contact. This separation ensures schools can maintain a complete, priority-ordered list of people to call in an emergency.

Each emergency contact record includes the contact's name, their relationship to the student, a primary phone number (required), an optional secondary phone number, an optional email, and a priority order number. The priority order determines the sequence in which contacts should be called - priority one is called first, priority two second, and so on.

Emergency contacts are managed from the student profile. You can add, edit, reorder, and remove contacts. The enrollment application form collects emergency contacts during the admissions process, and on approval these are automatically converted into structured emergency contact records with the priority ordering the parent specified.

Emergency contact data is protected by the same medical permission system as medical conditions. Viewing requires **VIEW_MEDICAL_RECORDS**, and editing requires **MANAGE_MEDICAL_RECORDS**. Parents can view their own children's emergency contacts through the parent portal.

## Permissions

Creating and managing guardian relationships requires the **MANAGE_STUDENTS** permission. Viewing guardians is available to anyone with **VIEW_STUDENTS**. Emergency contacts fall under the medical permission scope - **VIEW_MEDICAL_RECORDS** to see them and **MANAGE_MEDICAL_RECORDS** to edit. Pickup authorization is managed through the attendance and safety system and requires **MANAGE_ATTENDANCE** for modifications.
