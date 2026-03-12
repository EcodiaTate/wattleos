# Portfolios and Class Heatmap

WattleOS provides two complementary views of student progress: the individual student portfolio (a chronological timeline) and the class heatmap (a whole-class overview). Together, they give guides and administrators a complete picture of learning across time and across the classroom.

## Student Portfolio

The portfolio is a chronological timeline of a student's learning journey. It interleaves two types of events:

**Observations** - Published observations where the student is tagged, showing the observation content, author, linked curriculum outcomes, and media count. Each observation entry includes a snippet of the text and a link to the full observation detail page.

**Mastery changes** - Status transitions (e.g. "Not Started → Presented" or "Practicing → Mastered"), showing which outcome changed, the new status, and which guide made the change.

Events are sorted by date with the most recent at the top, creating a reverse-chronological narrative of the student's experience.

### Accessing the Portfolio

There are two paths to a student's portfolio:

**For staff**: Navigate to **Mastery** in the sidebar, then click on a student's name to open their portfolio page at `/pedagogy/portfolio/{studentId}`. The portfolio page includes mastery summary cards at the top and the timeline below.

**For parents**: From the Parent Portal, navigate to your child's profile. The Portfolio tab shows the same timeline, filtered to published observations only.

### Mastery Summary Cards

At the top of the portfolio, summary cards show the student's progress across each active curriculum instance:

- **Total outcomes** - The number of visible outcomes in the curriculum
- **Not Started / Presented / Practicing / Mastered** - Counts for each status
- **Progress bar** - A visual representation of the mastery distribution

These cards give a quick snapshot before diving into the detailed timeline. A student with 120 total outcomes showing 45 mastered, 30 practicing, 25 presented, and 20 not started provides an immediately readable picture of their progress.

### Mastery Percentage

The mastery percentage is calculated as the proportion of outcomes that have been mastered out of the total visible outcomes. This percentage is used in summary cards, dashboard widgets, and report generation.

## Class Heatmap

The class heatmap provides a bird's-eye view of an entire class's mastery across curriculum outcomes. It is a grid where rows are students and columns are outcomes, with each cell colour-coded by mastery status.

### Accessing the Heatmap

Navigate to **Mastery** and click **Heatmap** (or go directly to `/pedagogy/mastery/heatmap`). Select a curriculum instance and a class to generate the heatmap.

### Reading the Heatmap

The heatmap uses the standard mastery colours:

- **Grey** - Not Started
- **Blue** - Presented
- **Amber** - Practicing
- **Green** - Mastered

Students are listed alphabetically by last name down the left side. Curriculum outcomes are arranged across the top in sequence order, grouped by area.

Patterns emerge quickly: a column that is mostly grey means an outcome has not been presented to the class yet; a column that is mixed blue and amber means the class is actively working on it; a column that is mostly green means the class has generally mastered it. A row that is mostly green means that student is well ahead; a row that is mostly grey might need more individual attention.

### Using the Heatmap

The heatmap is most valuable for:

- **Lesson planning**: Identify which outcomes need group lessons (mostly grey columns), which need follow-up (amber columns), and which are complete (green columns).

- **Differentiation**: Spot students who are ahead or behind the class average. A student with green cells where the class is still amber might be ready for extension work. A student with grey cells where the class is blue or amber might need the material presented again.

- **Term reviews**: Before writing reports, the heatmap gives a visual overview of class progress that helps frame the narrative for each student.

- **Administrator oversight**: School leaders can review heatmaps across classes to understand curriculum coverage and identify areas where additional support or resources might be needed.

### Data Requirements

The heatmap only shows outcome-level nodes (not areas, strands, or activities) that are visible (not hidden). It queries all mastery records for the selected students and outcomes, then displays the grid. For large curricula with many outcomes, the grid may require horizontal scrolling.

## Portfolio Timeline for Parents

Parents see a simplified version of the portfolio through the Parent Portal. The parent portfolio shows:

- Published observations with content, author name, and linked outcomes
- Mastery status changes for their child
- Media counts (parents can view photos attached to published observations)

Draft and archived observations are not visible to parents. The timeline gives parents a window into their child's classroom experience without requiring the school to prepare separate communications for each family.

## Permissions

- **View Students** - Required to access student portfolios (staff view)
- **Manage Mastery** - Required to access the class heatmap
- **Parent role** - Automatically grants access to their own children's portfolios through the Parent Portal
