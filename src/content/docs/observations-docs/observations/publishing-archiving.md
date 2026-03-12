# Publishing and Archiving Observations

Every observation in WattleOS follows a lifecycle: Draft → Published → Archived. Each state has different visibility and editing rules.

## Observation States

### Draft

When you create an observation, it starts as a **draft**. Drafts are only visible to staff members with observation permissions. Parents cannot see drafts.

Drafts can be edited by their author. You can change the content, add or remove student tags, update curriculum outcome links, and manage photos. Only the original author can edit their own drafts.

Drafts can also be deleted by their author. Deletion is a soft delete - the observation is marked as deleted and hidden from all views, but the data is retained in the database for audit purposes.

### Published

Publishing an observation makes it part of the official record. Published observations are visible to all staff and appear in the Parent Portal for the tagged students' guardians. They contribute to portfolio timelines and mastery evidence.

Published observations **cannot be edited**. This is by design - once an observation is shared with parents and included in portfolio records, it should not change. If you need to correct a published observation, archive it and create a new one.

Publishing requires the **Publish Observation** permission, which is separate from the Create Observation permission. This separation supports review workflows where assistant guides create observations and lead guides review and publish them.

When published, the observation is timestamped with a `published_at` date that appears in the feed and detail view.

### Archived

Archiving removes a published observation from the active feed and the Parent Portal, but retains it in the system. Archived observations can still be viewed by staff using the "Archived" filter in the observation feed.

Archiving is useful when an observation was published but later found to be inaccurate, inappropriate, or redundant. Rather than deleting the record, archiving preserves it for internal reference while removing it from parent-facing views.

Archiving requires the **Publish Observation** permission (the same permission that controls publishing).

## How to Publish

There are two ways to publish an observation:

### During Creation

When creating a new observation, if you have the Publish Observation permission, you will see a **Save & Publish** button alongside the Save as Draft button. Clicking Save & Publish creates the observation and immediately sets its status to published.

### From the Detail Page

Open a draft observation from the feed by clicking on it. On the detail page, you will see a green **Publish** button at the bottom. Click it to transition the observation from draft to published. The page refreshes to show the updated status badge and published date.

## How to Archive

Open a published observation from the feed. On the detail page, you will see an **Archive** button. Click it to move the observation to archived status. The observation disappears from the default feed view and the parent portal, but remains accessible under the "Archived" filter.

## How to Delete a Draft

Open a draft observation that you authored. On the detail page, you will see a **Delete Draft** link in red at the bottom right. Clicking it shows a confirmation dialog: "Delete this draft observation? This cannot be undone." Confirm to soft-delete the observation.

Only the author of a draft can delete it. Published and archived observations cannot be deleted.

## Actions Summary by State

**Draft observations** (author only):
- Edit content, students, outcomes
- Publish (requires Publish Observation permission)
- Delete (author only, with confirmation)

**Published observations**:
- Archive (requires Publish Observation permission)
- Cannot be edited
- Cannot be deleted

**Archived observations**:
- View-only through the Archived filter
- Cannot be edited, published, or deleted

## Workflow Examples

**Solo guide at a small school**: Create the observation, add content and photos, and use Save & Publish directly. No review step needed.

**Assistant guide with lead guide review**: The assistant creates observations throughout the day, saving them as drafts. During planning time, the lead guide opens the Drafts filter, reviews each observation, and publishes the ones that are ready. Drafts that need revision can be discussed in person, then the assistant edits and the lead publishes.

**Correcting a mistake**: A guide publishes an observation with the wrong student tagged. They archive the incorrect observation, then create a new one with the correct student and publish it. The archived version remains in the system for reference.
