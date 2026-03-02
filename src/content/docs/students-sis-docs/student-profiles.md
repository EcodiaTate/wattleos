# Student Profiles

Every child in your school has a student profile in WattleOS. This is the central record that connects to observations, mastery tracking, attendance, reports, medical data, guardians, and billing. Getting student profiles right is the foundation of the "enter it once" principle — information you record here flows automatically into every other module.

## Creating a Student

Navigate to **Students** in the sidebar and click the **Add Student** button in the top right. The required fields are first name and last name. Everything else is optional but recommended for complete records.

The basic information section captures the child's first name, last name, preferred name (the name they go by day-to-day — this is what WattleOS displays throughout the platform when set), date of birth, and gender. Gender options include male, female, non-binary, other, and prefer not to say. You can also upload a profile photo, which appears on attendance rolls, observation cards, and the student directory.

Enrollment status determines where the student sits in your pipeline. The available statuses are **inquiry** (initial interest, not yet applied), **applicant** (application submitted), **active** (currently attending), **withdrawn** (left the school), and **graduated** (completed their program). New students default to active, but you can set this to any status during creation if you are importing historical records or managing a waitlist.

A free-text notes field is available for anything that does not fit elsewhere — learning preferences, transition notes, or special considerations that guides should be aware of.

## Demographics and Compliance

Below the basic fields, WattleOS includes a comprehensive demographics section designed for Australian regulatory reporting. These fields are not required but become important for ACARA/MySchool submissions and ISQ reporting.

The demographics section captures nationality, country of birth, languages spoken (entered as a comma-separated list), home language, and previous school. For Australian government reporting, there are specific fields for indigenous status (Aboriginal, Torres Strait Islander, both, neither, or not stated) and language background (English only, language background other than English, or not stated). A religion field is included for ISQ reporting requirements.

The residential address section stores the child's home address with fields for street line one, street line two, suburb, state (selected from Australian states and territories), postcode, and country.

Government identifiers — CRN (Centrelink Reference Number), USI (Unique Student Identifier), and Medicare number — can also be stored on the profile. These fields are encrypted at the database level for security and are only visible to users with appropriate permissions.

## Editing a Student

Open any student profile and click **Edit** in the top right. The edit form is pre-filled with the student's existing data. You can update any field, including changing the enrollment status. Only users with the MANAGE_STUDENTS permission can access the edit page — others are redirected to the read-only profile view.

## Searching and Filtering Students

The student list page supports searching by name (first name, last name, or preferred name) and filtering by enrollment status. You can also filter by class to see only the students enrolled in a particular environment. Results are paginated and sorted alphabetically by last name, then first name.

## The Student Detail Page

Clicking into a student opens a comprehensive profile view organised into sections. At the top, you see the student's photo (or initials), display name, enrollment status badge, date of birth with calculated age, and gender. If a preferred name is set, the legal name is shown as secondary text.

Below the header, the page is split into a two-column layout showing demographics and compliance data on the left, and enrollment history, guardians, medical conditions, emergency contacts, custody restrictions, and pickup authorizations in their own cards. Each section is described in detail in the other articles in this category.

## Deleting a Student

Student deletion is a soft delete — the record is marked as deleted but retained in the database for audit purposes. Deleted students no longer appear in lists, attendance rolls, or search results. This action requires the MANAGE_STUDENTS permission and should be used cautiously, as it affects historical records. In most cases, changing the enrollment status to withdrawn or graduated is preferable to deletion.

## Permissions

Creating, editing, and deleting students requires the **MANAGE_STUDENTS** permission. Viewing student profiles requires the **VIEW_STUDENTS** permission. Medical data, emergency contacts, and custody restrictions have their own separate permission requirements described in the relevant articles.
