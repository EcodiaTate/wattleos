# Mastery Tracking

Mastery tracking is how WattleOS records each student's progress through the curriculum. Every outcome in your curriculum can be tracked through four status levels, from first introduction to full mastery.

## Mastery Statuses

WattleOS uses four mastery statuses that align with the Montessori three-period lesson model:

**Not Started** (grey) — The student has not been introduced to this material or concept. This is the default state for all outcomes. No database record exists until the status is changed — "not started" is implied by the absence of a mastery record.

**Presented** (blue) — The guide has given the initial lesson or presentation. In Montessori terms, this means the student has had their first period lesson. They have been shown the material and how to use it, but have not yet worked with it independently.

**Practicing** (amber) — The student is working with the material independently. They may still make errors and are developing fluency. In Montessori terms, this covers the second and third period — the student is choosing the work, repeating it, and building competence.

**Mastered** (green) — The student demonstrates consistent, independent competence. They can use the material correctly without guidance, can teach it to a peer, or can apply the concept in new contexts. This is the goal state.

## The Mastery Grid

Navigate to **Mastery** in the sidebar to open the mastery tracking page. The mastery grid shows all outcomes for a selected curriculum instance, organised by the tree hierarchy (areas → strands → outcomes), with a colour-coded status indicator for each.

### Selecting a Student

Use the student picker at the top of the page to select which student you are tracking. The picker shows all students enrolled in your classes with their photos and preferred names. Once selected, the grid loads that student's mastery records for the chosen curriculum instance.

### Selecting a Curriculum Instance

If your school has multiple curriculum instances, use the instance selector to choose which one to view. Each instance shows its own set of outcomes.

### Reading the Grid

The grid displays outcomes grouped under their parent areas and strands. Each outcome shows:

- **Title** — The outcome name
- **Current status** — A colour-coded dot or badge (grey/blue/amber/green)
- **Date achieved** — When the status was last changed

The colour coding provides an at-a-glance view of the student's progress: mostly grey means early in the curriculum, a mix of blue and amber means active engagement, and predominantly green means approaching completion.

### Updating Status

Click on any outcome's status indicator to cycle to the next status. The progression follows the natural learning path: Not Started → Presented → Practicing → Mastered → Not Started (wrapping around). Each click immediately saves the change to the database and records a history entry.

You can also set a specific status directly rather than cycling, which is useful when bulk-updating after an assessment period.

Updating mastery requires the **Manage Mastery** permission, which is included in the default Guide role.

### Adding Notes

When updating a mastery status, you can optionally add notes. Notes provide context for why the status was changed: "Presented Golden Bead material on 15 Feb," "Consistently completing 4-digit addition independently," or "Ready to move to abstract operations."

## Mastery History

Every status change is recorded in a history log. The history shows:

- **Previous status** — What the status was before the change
- **New status** — What it was changed to
- **Changed by** — The name of the guide who made the change
- **Date** — When the change occurred
- **Curriculum node** — Which outcome was affected

This history is valuable for parent conferences, report writing, and tracking a student's learning trajectory over time. If a status was changed by mistake, the history provides a clear audit trail.

The mastery history panel shows the most recent changes for a student, sorted newest first. It combines data from the `mastery_history` table with user and curriculum node names for a readable timeline.

## Bulk Status Updates

For assessment periods (end of term, before report writing), you can update multiple outcomes at once using bulk update. Select the outcomes you want to change, choose the new status, and apply. Each update is saved individually with its own history entry, maintaining a complete audit trail.

## How Mastery Connects to Observations

When a guide creates an observation and tags it with curriculum outcomes, that observation becomes evidence of the student's engagement with those outcomes. The portfolio timeline interleaves observation entries with mastery status changes, creating a rich narrative of the student's learning journey.

Observations do not automatically change mastery status — the guide makes that professional judgment. But having observations linked to outcomes provides the evidence needed to justify a status change during assessment.

## Permissions

**Manage Mastery** — Required to update mastery statuses. Included in the default Guide role.

All staff with observation permissions can view mastery records (for context when writing observations), but only those with Manage Mastery can change statuses.
