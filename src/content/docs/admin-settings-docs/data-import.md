# Data Import and Migration

WattleOS includes a guided import wizard that lets administrators migrate data from any school management platform - Transparent Classroom, Storypark, FACTS SIS, Xplor, or manual spreadsheets - using CSV files. Rather than building fragile per-platform parsers that break when export formats change, WattleOS uses a universal column mapper that works with any CSV structure.

## Accessing the Import Wizard

Navigate to **Admin → Data Import & Migration**. This page requires the **MANAGE_STUDENTS** permission. The page shows two tabs: CSV Import (for migrating data) and Mass Invite (for onboarding parents and staff). The Mass Invite tab appears only if you also have the MANAGE_ENROLLMENT or MANAGE_USERS permission.

## Import Types and Order

Six import types are available, and the order matters because later imports reference earlier data.

**Students** should be imported first. Everything else references students by name. Fields include first name, last name, preferred name, date of birth, gender, enrollment status, and class assignment.

**Guardians** should be imported second. Each guardian row is linked to a student by name. Fields include parent name, email, phone, relationship, and the student's name for matching.

**Emergency contacts** come after students. Each row links a contact to a student with name, phone, relationship, and priority.

**Medical conditions** come after students. Each row links a condition to a student with condition name, severity, action plan, and medication details.

**Staff** can be imported at any time since staff records are independent of student data. Fields include name, email, and role assignment.

**Attendance history** comes after students. Historical attendance records are imported with the student name, date, and status. This type uses an upsert pattern, so re-importing is safe - existing records for the same student and date are updated rather than duplicated.

## The Six-Step Wizard

The import follows a guided workflow.

**Step 1 - Select Type.** Choose what you are importing from the six options. Each option shows a description and guidance on when to import it relative to other types.

**Step 2 - Upload CSV.** Drag and drop a CSV file or click to browse. The file is parsed entirely in the browser - nothing is uploaded to the server at this stage. Maximum file size is 10 MB, and a maximum of 5,000 rows per file. You can also download a blank template CSV for each import type, pre-populated with the correct column headers.

**Step 3 - Map Columns.** This is the core of the universal importer. WattleOS shows every column header from your CSV alongside a dropdown of WattleOS fields. The system automatically suggests mappings based on fuzzy matching of column names - it recognises over 100 common variations across platforms. For example, "Child First Name," "first_name," and "Given Name" all auto-map to the first name field. Suggestions with high confidence (above 70%) are pre-selected. You can adjust any mapping or skip columns that do not correspond to a WattleOS field. Required fields that have not been mapped are highlighted as missing.

**Step 4 - Preview and Validate.** The mapped data is sent to the server for validation. WattleOS checks required fields, date format parsing (supporting both DD/MM/YYYY and MM/DD/YYYY), enum values (normalising synonyms like "Mum" to "mother" and "M" to "male"), duplicate detection against existing records, and foreign key references (for example, verifying that a student name exists when importing guardians). The preview shows a per-row breakdown: valid rows ready for import, rows with warnings, rows with errors, and duplicate rows. You can filter to show only errors for quick review.

**Step 5 - Import.** Click to execute the import. Only valid rows are inserted. Each row's outcome is tracked in an audit trail: imported, skipped (duplicate), or error. The import creates records in the database with full tenant scoping and audit metadata.

**Step 6 - Results.** A summary shows how many rows were imported, skipped, and errored. If anything went wrong, individual error messages explain the issue per row. A rollback option is available to undo the entire import - this soft-deletes all records created by the import job.

## Smart Column Detection

The column mapper recognises common CSV headers from popular platforms. Date of birth variations like "DOB," "Date of Birth," and "Birthday" all map correctly. Classroom fields like "Room," "Environment," and "Level" map to class name. Gender synonyms (M/F/Boy/Girl) and relationship synonyms (Mum/Mom/Dad) are normalised automatically. Australian date formats (DD/MM/YYYY) are detected and parsed alongside US formats (MM/DD/YYYY).

## Import History and Rollback

The bottom of the import page shows a history of all previous imports with the type, date, file name, row counts, and status. Each completed import can be rolled back, which soft-deletes all records created by that import. This provides a safety net during migration - if something does not look right, you can undo and re-import with corrected data.

## Mass Invite

The Mass Invite tab provides a streamlined CSV-to-invitation flow for onboarding parents and staff in bulk. Upload a CSV with names, emails, and (for parents) the student name to link to, or (for staff) the role to assign. WattleOS sends invitation emails through Supabase Auth, creating user accounts and establishing the correct relationships or role assignments automatically.

## Permissions

CSV data import requires the **MANAGE_STUDENTS** permission. Mass inviting parents requires **MANAGE_ENROLLMENT**. Mass inviting staff requires **MANAGE_USERS**.
