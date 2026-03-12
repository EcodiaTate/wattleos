# The Observation Feed

The observation feed is your central view of all observations at your school. It shows observations in reverse chronological order (newest first) with filtering, pagination, and quick actions.

## Accessing the Feed

Click **Observations** in the sidebar, or navigate to `/pedagogy/observations`. You need either the **Create Observation** or **View All Observations** permission to access this page.

## What You See

Each observation in the feed is displayed as a card showing:

- **Author** - Name and avatar of the guide who created the observation
- **Date and time** - When the observation was created
- **Status badge** - Draft (amber), Published (green), or Archived (grey)
- **Content** - The observation text, truncated if long
- **Media thumbnails** - A horizontal strip of small photo thumbnails (64px). Click any thumbnail to open it in a full-screen lightbox where you can browse through all attached photos
- **Student tags** - Coloured pills showing which students are tagged. Click a student tag to navigate to their profile
- **Outcome tags** - Green pills showing linked curriculum outcomes with their level (outcome or activity)

Click anywhere on an observation card to open its detail page.

## Filtering

The feed has two filter controls at the top:

### Status Filter

Four tabs let you filter by observation status:

- **All** - Shows all observations (default)
- **Drafts** - Shows only draft observations. Useful during planning time when you want to review and publish your drafts from the day
- **Published** - Shows only published observations. This is what parents can see
- **Archived** - Shows observations that have been archived (hidden from parent portal but still available for records)

### Student Filter

A dropdown lets you filter observations to a specific student. Select a student's name and the feed shows only observations where that student is tagged. This is helpful when preparing for parent conferences or writing term reports - you can quickly review every observation for a particular child.

## Pagination

The feed shows 20 observations per page. If there are more than 20, pagination controls appear at the bottom showing "Showing 1 to 20 of X observations" with Previous and Next buttons.

Filters and pagination work together through URL search parameters. This means you can bookmark or share a filtered view - for example, `/pedagogy/observations?status=draft&student=abc123` shows all drafts for a specific student.

## Empty States

If no observations match your current filters, the feed shows a helpful empty state with guidance. If you have permission to create observations, a "New Observation" button appears in the empty state for quick access.

If no observations exist at all (brand new school or clean slate), the message encourages you to create your first observation.

## Quick Actions from the Feed

From the observation feed, you can:

- **Create a new observation** using the button in the top-right corner
- **Click an observation** to view its full detail, including larger media, all tags, and action buttons
- **Filter by student** to review a child's observation history
- **Filter by status** to manage your drafts or review published content

## Who Sees What

All staff with observation permissions see the same feed, filtered by their school's data. The feed includes observations from all guides at the school, not just your own. This supports the Montessori model where multiple guides may observe the same children.

Parents do not see the observation feed. They see published observations for their own children through the Parent Portal's portfolio view.
