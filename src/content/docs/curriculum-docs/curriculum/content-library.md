# Curriculum Content Library

The Curriculum Content Library is WattleOS's catalogue of curriculum templates. It extends the basic template list with framework-aware filtering, material search, compliance framework identification, and JSON template import for schools and consultants who want to contribute custom curricula.

## Accessing the Content Library

Navigate to **Content Library** in the sidebar under Pedagogy, or click the Content Library link on the Curriculum page. The content library is available to all authenticated staff for browsing; importing templates requires the Manage Curriculum permission.

## Browsing Templates

The content library displays all available curriculum templates as cards showing the template name, framework (AMI, AMS, EYLF, ACARA, etc.), age range, and a description. Templates marked as compliance frameworks show a compliance badge, indicating they are used for regulatory reporting rather than day-to-day Montessori tracking.

## Filtering

The library supports several filters to help you find relevant templates:

**Framework** — Filter by pedagogical or compliance framework. The framework dropdown is populated dynamically from the templates available in the system, so it always reflects the current catalogue. Common frameworks include AMI (Association Montessori Internationale), AMS (American Montessori Society), EYLF (Early Years Learning Framework), ACARA (Australian Curriculum), and QCAA (Queensland Curriculum and Assessment Authority).

**Age Range** — Filter by the age range the template covers. Options like 0-3, 3-6, 6-9, 9-12, and 12-18 correspond to Montessori developmental planes. Age ranges are sorted numerically for intuitive browsing.

**Country / State** — Filter by geographic relevance. Australian schools can quickly find ACARA and EYLF templates; templates from other countries appear when those filters are applied.

**Compliance Framework** — A toggle to show only templates designated as compliance frameworks. This is useful when an administrator needs to set up regulatory reporting and wants to see which frameworks WattleOS supports for compliance evidence.

**Search** — A text search that matches template names. Useful when you know the specific template you are looking for.

## Material Search

One of the most powerful features of the content library is material search. Type the name of a Montessori material (e.g. "Pink Tower," "Movable Alphabet," "Stamp Game") and the system searches across all curriculum nodes — both in your school's instances and in global templates — to find outcomes and activities that reference that material.

Each result shows the node title, code, level, which template or instance it belongs to, and the full list of materials associated with that node. This helps guides answer the question "Which outcomes does this material address?" when planning lessons or writing observations.

## Enhanced Node Data

Templates in the content library can include enriched metadata on their nodes beyond the basic title and description:

- **Code** — A reference code (e.g. "ACMMNA001" for ACARA, or "S.1.3" for a Montessori scope and sequence)
- **Materials** — A list of Montessori materials used for this outcome (e.g. ["Pink Tower", "Brown Stair", "Red Rods"] for a sensorial discrimination outcome)
- **Direct Aims** — The primary learning objectives of the activity
- **Indirect Aims** — Secondary skills developed through the work
- **Age Range** — The specific age range for this node (more granular than the template-level age range)
- **Prerequisites** — Other outcomes that should be mastered before this one
- **Assessment Criteria** — How mastery of this outcome is evaluated
- **Content URL** — A link to external resources, album pages, or training materials

This metadata flows through to your school's curriculum instance when you fork the template, making it available to guides during lesson planning and observation tagging.

## JSON Template Import

For schools, consultants, or Montessori training centres that have their own curriculum frameworks, WattleOS supports importing templates from a structured JSON file. The import creates a new global template with all nodes, metadata, and cross-mappings.

The JSON format follows a nested structure where each node can have children, and the system recursively creates the hierarchy:

- **Template metadata**: slug, name, framework, age range, country, state, version, and whether it is a compliance framework
- **Nodes**: each with level, title, optional code, description, materials, direct/indirect aims, age range, assessment criteria, and content URL
- **Cross-mappings**: optional links between nodes in different frameworks (e.g. mapping an AMI outcome to its corresponding ACARA outcome)

JSON import requires the Manage Curriculum Templates permission and is typically used by administrators or WattleOS support staff when onboarding new curriculum content.

## Cross-Framework Mappings

The content library supports cross-mappings between curriculum frameworks. A cross-mapping links a node in one framework to a related node in another. For example, the AMI outcome "Understands decimal system concepts" might map to ACARA's "ACMNA028 — Recognise, model, read and write numbers to at least 100."

These mappings enable compliance reporting: a school using AMI as their primary framework can generate evidence against ACARA or EYLF requirements by following the cross-mappings. When an observation is tagged with an AMI outcome that maps to an ACARA outcome, the observation counts as evidence for both.

Cross-mappings have a type field indicating the relationship: "equivalent" (the outcomes cover the same ground), "partial" (significant overlap but not identical), or "related" (thematically connected but different scope).

## Forking from the Content Library

When you find a template you want to use, click **Fork** to create an instance for your school. This is the same forking process described in the Curriculum Engine documentation — it creates a private copy that you can customise.

After forking, the instance appears on your Curriculum page alongside any other instances you have set up.
