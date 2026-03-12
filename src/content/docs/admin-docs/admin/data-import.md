# Data Import

The Data Import tool lets administrators migrate data from any previous school management platform (Transparent Classroom, Storypark, FACTS SIS, Xplor, or manual spreadsheets) into WattleOS. It uses a universal column-mapping approach rather than platform-specific parsers, meaning it works with any CSV export regardless of source.

## Accessing Data Import

Navigate to **Admin → Data Import**. The import tool requires the Manage Tenant Settings permission.

## Supported Import Types

WattleOS supports six import types, and they should be imported in this order because later types reference earlier ones:

1. **Students** - Names, dates of birth, gender, class assignments, enrollment status. Import this first - everything else references students.
2. **Guardians** - Parent/guardian details linked to students. Requires students to already exist.
3. **Emergency Contacts** - Additional emergency contacts linked to students.
4. **Medical Conditions** - Allergies, conditions, medications, and severity levels linked to students.
5. **Staff** - Staff member details and role assignments. Can be imported at any time.
6. **Attendance** - Historical attendance records. Requires students to already exist.

## The Import Wizard

The import process follows a six-step wizard:

### Step 1: Select Type

Choose what you are importing from the six options. Each option shows a description and an icon. The recommended import order is displayed to guide first-time users.

### Step 2: Upload CSV

Drag and drop a CSV file or click to browse. The file is parsed entirely in the browser - no data is sent to the server at this stage. The parser detects the delimiter, handles quoted fields, and reports any structural errors.

Maximum file size is 5,000 rows per import. For larger datasets, split into multiple files.

### Step 3: Map Columns

This is the key step. WattleOS displays your CSV's column headers alongside its own field definitions. For each WattleOS field, select which CSV column contains that data.

**Smart auto-detection**: The system recognises over 100 common column names from popular platforms. If your CSV header says "Child First Name," "first_name," or "Given Name," it will automatically suggest mapping to WattleOS's first_name field. Similarly, "DOB," "Date of Birth," and "Birthday" all map to the date of birth field. Auto-detected mappings with high confidence (above 70%) are pre-selected.

**Required fields** are marked and must be mapped before proceeding. Optional fields can be left unmapped - they will be set to null in the imported records.

**Download Template**: Each import type has a downloadable CSV template showing the expected columns with example data. This is useful if you are creating a CSV from scratch rather than exporting from another system.

### Step 4: Preview and Validate

The server validates every row against the mapped columns. Validation checks include:

- **Required fields**: Ensures mandatory fields are not empty.
- **Data format**: Dates are parsed (supports DD/MM/YYYY, YYYY-MM-DD, MM/DD/YYYY), emails are validated, phone numbers are normalised.
- **Enum values**: Gender, enrollment status, and other constrained fields must match allowed values. The system normalises common synonyms (M/F/Boy/Girl → male/female, Mum/Mom → mother).
- **Duplicate detection**: Checks if a student with the same first and last name already exists. Checks if a guardian with the same email already exists.
- **Foreign key validation**: For guardian imports, verifies that the referenced student exists. For attendance imports, verifies the student and date combination.

Each row is shown with a status: valid (green), warning (amber, typically a duplicate), or error (red, missing required data or invalid format). You can review all errors before proceeding.

A "Skip duplicates" toggle lets you choose whether to skip rows that match existing records or import them anyway (creating duplicates).

### Step 5: Import

Click **Import** to execute. WattleOS processes each valid row, creating records in the database. An import job record tracks the entire operation, and each individual row is logged with its outcome (imported, skipped, or error).

For guardian and staff imports, the system uses elevated database privileges (admin client) because these imports may need to create or look up user accounts.

Attendance imports use an upsert pattern - if a record already exists for the same student and date, it is updated rather than duplicated.

### Step 6: Results

The results page shows a summary: total rows processed, successfully imported, skipped (duplicates), and errors. Each error includes the row number, field, and a descriptive message.

**Rollback**: If something went wrong, click **Undo Import** to soft-delete all records created by this import job. The rollback tracks which entity IDs were created and reverses them. This is safe to use - it does not affect records that existed before the import.

## Import History

The Data Import page also shows a history table of all previous import jobs, with their type, status, row counts, and timestamps. This provides an audit trail of all data migrations.

## Mass Invite

Below the import wizard, the Data Import page includes a **Mass Invite** tool. This lets you send invitation emails to multiple parents at once by uploading a CSV with parent emails and student names. Each row generates an invitation link that the parent can use to create their account and link to their child's profile.

Mass invite is separate from the guardian import - it creates invitations, not guardian records. The guardian record is created when the parent accepts the invitation and completes the onboarding flow.

## Best Practices

- **Export from your current system first**: Most platforms have a "Download CSV" or "Export Data" option. Use this as your starting point.
- **Follow the import order**: Students first, then guardians, then everything else. Foreign key relationships depend on this sequence.
- **Use the preview step carefully**: Review every error and warning before importing. It is much easier to fix data in your CSV and re-upload than to clean up after a messy import.
- **Keep your original CSVs**: Store the exported files for reference. If you need to rollback and re-import, you will want the originals.
- **Import in batches for large schools**: If you have 500+ students, consider importing one class at a time to make validation easier to review.
