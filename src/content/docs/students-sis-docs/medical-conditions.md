# Medical Conditions

WattleOS stores medical information as structured, queryable records rather than free-text notes. This design means the platform can surface allergy alerts during attendance, flag life-threatening conditions on student cards, and generate reports on students requiring medication - none of which would be possible if medical data were buried in a notes field.

## How Medical Records Work

Each medical condition is a separate record attached to a student. A student can have multiple conditions - for example, a peanut allergy and asthma. Each record captures the condition type, condition name, severity level, and optional details about action plans and medication.

The available condition types are **allergy**, **asthma**, **epilepsy**, **diabetes**, and **other**. These categories help with filtering and reporting. The condition name is a free-text field where you enter the specific condition (for example, "Peanut allergy", "Exercise-induced asthma", or "Type 1 Diabetes").

## Severity Levels

Every medical condition requires a severity level, which determines how prominently it is flagged throughout the platform. The four levels are:

**Mild** - the condition is noted but does not typically require immediate intervention. **Moderate** - the condition may require action and staff should be aware. **Severe** - the condition requires specific protocols and may involve medication. **Life-threatening** - the condition requires immediate emergency response. Students with life-threatening conditions receive the most prominent visual indicators across the platform, including red severity badges on attendance rolls and student cards.

Severity badges appear wherever a student's name is displayed in safety-critical contexts. When a guide opens their class attendance view, they can immediately see which children have severe or life-threatening conditions before the first work cycle begins.

## Action Plans and Documentation

For each condition, you can record a written action plan - the step-by-step instructions staff should follow if the condition is triggered. This might include when to administer medication, when to call emergency services, and who to contact. You can also upload an action plan document (typically a PDF from the child's doctor) by providing a link to the uploaded file.

Action plans can include an expiry date, which is useful for tracking when medical plans need to be reviewed or renewed. This date is informational and does not automatically disable the record.

## Medication Details

If a condition requires medication, toggle the "requires medication" flag. This reveals additional fields for the medication name and the medication location - for example, "EpiPen in the office first aid kit" or "Ventolin in the student's bag". Recording the physical location of medication is critical for emergency response; when a child has an asthma attack, staff need to know exactly where the inhaler is without searching.

## Adding and Editing Conditions

To add a medical condition, navigate to the student's profile and find the Medical Conditions section. Click to add a new condition and fill in the required fields (condition type, condition name, and severity). Action plan details and medication information are optional but strongly recommended for moderate, severe, and life-threatening conditions.

Editing works the same way - open the existing condition and update any field. WattleOS tracks when each record was last updated so you can verify that medical information is current.

Deleting a medical condition is a soft delete. The record is retained for audit purposes but no longer appears in the student's active medical profile or in severity badge displays.

## Critical Conditions List

Administrators can access a list of all critical medical conditions across the school - that is, every condition with a severity of severe or life-threatening. This is useful for beginning-of-term reviews, ensuring all action plans are current, and briefing relief staff or casual guides who need a quick overview of children requiring special medical attention.

## Privacy and Access Control

Medical data is one of the most sensitive categories in WattleOS. Access is controlled by a dedicated permission rather than being bundled with general student viewing rights. Staff with the **VIEW_MEDICAL_RECORDS** permission can see medical conditions, and staff with **MANAGE_MEDICAL_RECORDS** can create, edit, and delete them. Parents can view medical conditions for their own children through the parent portal but cannot modify them directly - updates must go through the school.

At the database level, medical records are protected by row-level security policies that enforce both tenant isolation and the medical permission requirement. This means even if a staff member can view student profiles, they cannot see medical data unless they hold the specific medical permission.
