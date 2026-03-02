# Curriculum Engine

The curriculum engine is how WattleOS represents and manages Montessori curriculum frameworks. It uses a template-and-instance model: global templates define standard curricula (AMI, AMS, EYLF, ACARA), and each school creates its own instance by forking a template, giving them a private copy they can customise without affecting the original.

## Key Concepts

### Templates

A curriculum template is a read-only, global definition of a curriculum framework. Templates are shared across all WattleOS schools and maintained by Anthropic. Examples include "AMI Primary (6-9)," "AMS Infant/Toddler (0-3)," "EYLF (Early Years Learning Framework)," and "ACARA (Australian Curriculum)."

Each template contains a hierarchy of nodes organised into levels: areas, strands, outcomes, and activities. Templates also carry metadata like framework name, age range, country, and whether the template is a compliance framework (used for regulatory reporting).

Schools cannot edit templates directly. Instead, they fork a template to create their own instance.

### Instances

A curriculum instance is a school's private copy of a curriculum. When you fork a template, WattleOS copies every node from the template into a new instance owned by your school. From that point on, the instance is entirely yours — you can rename nodes, add custom outcomes, hide items that are not relevant, reorder content, and delete nodes you do not use.

Each school can have multiple active instances. A typical Montessori school might have three: an AMI Primary instance for ages 6-9, an AMI Elementary instance for ages 9-12, and an EYLF instance for the toddler program.

Instances are what your guides interact with daily. When they tag an observation with a curriculum outcome or update a student's mastery status, they are working with nodes from your school's curriculum instances.

### Nodes

A curriculum node is a single item in the hierarchy. Nodes have four possible levels:

**Area** — The broadest category (e.g. "Mathematics," "Language," "Practical Life"). Areas are the top-level containers.

**Strand** — A sub-category within an area (e.g. "Numeration" within Mathematics, "Reading" within Language).

**Outcome** — A specific learning outcome or skill (e.g. "Understands place value to 1000," "Reads independently for 20 minutes"). Outcomes are the primary tracking unit — mastery is recorded at the outcome level.

**Activity** — A specific Montessori material or lesson (e.g. "Golden Bead Material," "Movable Alphabet"). Activities are optional and sit below outcomes.

Each node has a title, optional description, a sequence order (for display ordering), and can be marked as hidden (excluded from views and tracking without being deleted).

## Forking a Template

To create a curriculum instance from a template:

1. Navigate to **Curriculum** in the sidebar
2. If templates are available and you have the Manage Curriculum permission, you will see a **Fork Template** option
3. Select a template from the list
4. Provide a name for your instance (e.g. "Our AMI Primary Curriculum")
5. Optionally add a description
6. Click Fork

WattleOS copies all template nodes into your new instance, preserving the hierarchy and ordering. Each copied node retains a reference to its source template node (`source_template_node_id`), which enables future features like template update detection.

The fork process copies nodes level by level (areas first, then strands, then outcomes, then activities) to ensure parent references are correctly mapped from template IDs to new instance IDs.

## Creating a Blank Instance

If your school uses a custom curriculum that does not match any available template, you can create a blank instance:

1. Navigate to **Curriculum**
2. Click **Create Blank Curriculum**
3. Provide a name and optional description
4. Click Create

This creates an empty instance with no nodes. You then build your curriculum tree manually by adding areas, strands, outcomes, and activities.

## Permissions

**Manage Curriculum** — Required to fork templates, create blank instances, add/edit/delete/reorder nodes, and toggle visibility. This permission is included in the default Administrator role.

All authenticated staff can view curriculum instances and their nodes (for observation tagging and mastery tracking), but only those with the Manage Curriculum permission can modify the structure.
