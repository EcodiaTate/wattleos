# Google Drive Integration

The Google Drive integration enables automatic portfolio folder provisioning for students. When a student is enrolled, WattleOS can create a dedicated folder structure in your school's Google Drive, upload observation media (photos and videos) directly to the student's folder, and optionally share the folder with parents so they can view their child's portfolio outside of WattleOS.

## How It Works

WattleOS uses a Google Cloud service account to interact with Google Drive on your school's behalf. A service account is a special type of Google account that belongs to your application rather than an individual user. It can create folders, upload files, and manage sharing permissions without requiring any user to be logged in.

The integration creates a two-level folder structure inside your root portfolio folder. The first level is a folder per student (named using the configurable template, for example "Emma Thompson"). Inside each student folder, a subfolder is created for each academic year (for example, "2026"). Observation photos and videos are uploaded into the year subfolder.

## Setting Up Google Drive

Navigate to **Admin → Integrations** and expand the Google Drive card. Three credentials are required.

**Service Account Email** is the email address of your Google Cloud service account (for example, `wattleos@your-project.iam.gserviceaccount.com`). You create this in the Google Cloud Console under IAM & Admin → Service Accounts.

**Private Key** is the private key from your service account's JSON key file. This is the long string that begins with `-----BEGIN PRIVATE KEY-----`. Keep this secret - it grants full access to the service account.

**Root Portfolio Folder ID** is the Google Drive folder ID where all student portfolios will be created. This is the string of characters in the folder's URL. You must share this folder with the service account email address and grant it Editor access. Without this sharing step, the service account cannot create subfolders.

Two settings are available. **Auto-share folders with parents** controls whether WattleOS automatically grants read access to parent Google accounts when a portfolio folder is created. When enabled, each parent listed as a guardian for the student receives a read-only sharing invitation for the student's folder. **Folder name template** controls how student portfolio folders are named. The default is `{student_name}`, but you can include `{year}` to create year-specific top-level folders.

## Portfolio Folder Provisioning

When a student's portfolio is provisioned (typically triggered during enrollment or manually by an administrator), the following happens. WattleOS checks whether a portfolio folder already exists for the student and year - if so, it returns the existing folder (the operation is idempotent). If no folder exists, the Google Drive client creates a student folder inside the root folder, then creates a year subfolder inside the student folder. The folder ID and URL are stored in the `student_portfolio_folders` table, linking the WattleOS student record to the Drive folder. If auto-sharing is enabled, each parent's email is granted read-only access to the folder. The entire operation is logged in the integration sync log.

If sharing with a parent fails (for example, the parent's email is not a valid Google account), the provisioning still succeeds - the sharing failure is logged but does not block folder creation.

## Media Storage

Observation media (photos and videos captured during observations) can be uploaded directly to the student's Google Drive portfolio folder. WattleOS stores the Google Drive file ID and metadata in the `observation_media` table, creating a link between the observation record and the actual file in Drive. This keeps heavy media files in Google Drive rather than in the WattleOS database, while maintaining full traceability.

## Dynamic Import

The Google Drive client library (googleapis) is loaded using dynamic imports. This is a deliberate performance decision - the googleapis package is large, and loading it on every server action would slow down actions that do not need Google Drive. The library is only imported when an actual Drive operation is triggered.

## Permissions

Configuring the Google Drive integration requires the **MANAGE_INTEGRATIONS** permission. Portfolio provisioning is triggered through student management workflows, which require the **MANAGE_STUDENTS** permission.
