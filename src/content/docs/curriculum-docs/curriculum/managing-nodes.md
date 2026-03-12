# Managing Curriculum Nodes

Once you have a curriculum instance (either forked from a template or created blank), you can customise its structure by adding, editing, reordering, hiding, and deleting nodes.

## The Curriculum Tree

Navigate to **Curriculum** and click on an instance to view its tree. The tree displays nodes in a hierarchical, collapsible structure:

- **Areas** are shown at the top level with expand/collapse controls
- **Strands** appear indented under their parent area
- **Outcomes** appear under their parent strand
- **Activities** appear under their parent outcome

Each node shows its title, level badge, and action buttons (if you have the Manage Curriculum permission). Hidden nodes appear dimmed with a "Hidden" indicator.

The tree supports search - type in the search box to filter nodes by title. This is useful in large curricula where hundreds of outcomes exist across multiple areas.

## Adding Nodes

Click the add button at the appropriate level in the tree to create a new node. You need to provide:

- **Title** (required) - The name of the area, strand, outcome, or activity
- **Description** (optional) - Additional detail about what this node covers
- **Level** - Determined automatically by where in the tree you click "Add"
- **Parent** - Set automatically based on which node you are adding under

The new node is placed at the end of its sibling list (after existing nodes at the same level under the same parent). You can reorder it afterward.

## Editing Nodes

Click the edit button on any node to change its title or description. Edits take effect immediately. The node's level and position in the hierarchy cannot be changed through editing - use reordering to change position, or delete and recreate to change level.

## Reordering Nodes

Each node has up and down arrow buttons to move it within its sibling group. Clicking "up" swaps the node with the one above it; clicking "down" swaps it with the one below. Reordering only affects nodes at the same level under the same parent - you cannot move a strand from one area to another through reordering.

The sequence order is stored as a numeric field on each node. Swapping two nodes exchanges their sequence order values, which is a fast operation that does not require renumbering all siblings.

## Hiding Nodes

If a curriculum outcome is not relevant to your school but you do not want to delete it permanently, you can hide it. Click the visibility toggle on a node to switch between visible and hidden states.

Hidden nodes are excluded from:
- The mastery tracking grid (guides do not see them)
- Observation outcome tagging (they do not appear in the search)
- Mastery summary counts (hidden outcomes are not counted in totals)
- The class heatmap

Hidden nodes remain in the database and can be un-hidden at any time. This is useful when a school phases certain outcomes in and out across terms or age groups.

## Deleting Nodes

Click the delete button on a node to soft-delete it. Deleting a node also soft-deletes all of its children. For example, deleting an area removes all strands, outcomes, and activities underneath it.

Deletion is soft - the nodes are marked with a `deleted_at` timestamp and excluded from all queries, but the data remains in the database for audit purposes. There is no undo through the UI, but an administrator can restore deleted nodes through database access if needed.

Deleting a node does not delete mastery records or observation links that reference it. Those records remain intact as historical data.

## Searching Nodes

Use the search function on the curriculum tree page to find specific nodes by title. The search returns up to 50 matching nodes across all levels, making it easy to find a specific outcome in a large curriculum without manually expanding the tree.

Search matches are case-insensitive and match any part of the title. Searching "golden" would find "Golden Bead Material," "Golden Bead Exchange Game," and any other node containing that word.

## Best Practices

- **Fork first, customise second**: Start with the closest matching template, then adjust rather than building from scratch. This saves significant time and ensures you have a comprehensive starting point.

- **Hide rather than delete**: If you are unsure whether an outcome will be needed later, hide it instead of deleting. Hidden nodes can be restored with one click; deleted nodes require database intervention.

- **Use descriptions**: Add descriptions to outcomes that might be ambiguous. When guides are tagging observations, the outcome title is all they see in the search dropdown - a clear title makes matching faster.

- **Keep activities for materials tracking**: Even if you do not track mastery at the activity level, listing specific Montessori materials as activities under each outcome helps guides find the right outcome when tagging observations ("I used the Pink Tower" → search "Pink Tower" → find it under Sensorial > Visual Discrimination).
