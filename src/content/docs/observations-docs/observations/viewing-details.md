# Viewing Observation Details

The observation detail page shows a single observation with its full content, all attached media, tagged students, linked curriculum outcomes, and available actions.

## Accessing the Detail Page

Click any observation card in the observation feed to open its detail page. The URL follows the pattern `/pedagogy/observations/{observationId}`.

## What You See

The detail page shows:

**Author and Date**: The guide's name, avatar, and the date and time the observation was created, formatted in Australian date format (day month year, with time).

**Status Badge**: A coloured badge in the top right showing Draft (amber), Published (green), or Archived (grey).

**Published Date**: If the observation has been published, a green line below the header shows when it was published.

**Content**: The full observation text, preserving line breaks and formatting exactly as written.

**Media Gallery**: If photos are attached, they appear as a wrapping grid of clickable thumbnails (the "full" variant, with 128–160px thumbnails). Click any photo to open the lightbox viewer. Non-image media (video, audio, documents) appears as type icons with file names.

**Students Section**: A horizontal list of student tags, each showing the student's photo (or first initial) and full name. Click any student tag to navigate directly to their student profile page.

**Curriculum Outcomes Section**: A list of outcome tags, each showing the outcome level (outcome or activity) as a small coloured badge and the outcome title.

## Available Actions

The actions available on the detail page depend on the observation's status, whether you are the author, and your permissions:

### For Draft Observations

- **Publish** (green button) — Appears if you have the Publish Observation permission. Transitions the observation to published status immediately.
- **Edit** — Appears if you are the observation's author. Navigates to the edit form where you can modify content, student tags, outcome links, and photos.
- **Delete Draft** (red link) — Appears if you are the author. Shows a confirmation dialog before soft-deleting the observation.
- **Back to Feed** — Always available. Returns to the observation feed.

### For Published Observations

- **Archive** — Appears if you have the Publish Observation permission. Moves the observation to archived status, removing it from the active feed and parent portal.
- **Back to Feed** — Returns to the observation feed.

### For Archived Observations

- **Back to Feed** — The only action available. Archived observations are read-only.

## Navigation

A breadcrumb at the top shows Observations > Detail, with the Observations link taking you back to the feed. The Back to Feed link at the bottom also returns to the feed.

## Permissions

You need observation permissions (Create Observation or View All Observations) to access the detail page. The page loads the observation through the same tenant-scoped database queries as the feed, so you can only view observations belonging to your school.

If the observation does not exist or has been soft-deleted, you are redirected back to the observation feed.
