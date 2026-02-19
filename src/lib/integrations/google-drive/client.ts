// src/lib/integrations/google-drive/client.ts
//
// ============================================================
// WattleOS V2 - Google Drive Integration Client
// ============================================================
// Isolated integration module. Handles:
// • Service account authentication
// • Portfolio folder provisioning (per student, per year)
// • File upload (photos, videos, documents)
// • Folder sharing with parent Google accounts
//
// WHY isolated: Integration code lives in /lib/integrations/
// per the architecture plan. Domain actions call this client;
// the client knows nothing about WattleOS domain types.
//
// DEPENDENCIES: googleapis npm package
// Install: npm install googleapis
// ============================================================

import type { drive_v3 } from "googleapis";
import { google } from "googleapis";

// ============================================================
// Types
// ============================================================

export interface GoogleDriveCredentials {
  service_account_email: string;
  private_key: string;
  /** The shared Drive or top-level folder where all school portfolios live */
  root_folder_id: string;
}

export interface GoogleDriveSettings {
  /** Folder naming pattern. Supports: {student_name}, {year} */
  folder_name_template: string;
  /** Whether to auto-share folders with parent Google accounts */
  auto_share_with_parents: boolean;
}

export interface ProvisionFolderResult {
  folder_id: string;
  folder_url: string;
}

export interface UploadFileResult {
  file_id: string;
  file_url: string;
  thumbnail_url: string | null;
}

// ============================================================
// Client Factory
// ============================================================
// Creates an authenticated Google Drive client from a service
// account credential set. Each call creates a fresh client
// (no long-lived connections in serverless).
// ============================================================

export function createDriveClient(
  credentials: GoogleDriveCredentials,
): drive_v3.Drive {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: credentials.service_account_email,
      private_key: credentials.private_key,
    },
    scopes: ["https://www.googleapis.com/auth/drive"],
  });

  return google.drive({ version: "v3", auth });
}

// ============================================================
// PROVISION PORTFOLIO FOLDER
// ============================================================
// Creates a folder structure:
//   Root Folder / {Student Name} / {Year}
//
// Idempotent: if the student folder already exists, returns it.
// The year subfolder is always created fresh (one per academic year).
// ============================================================

export async function provisionPortfolioFolder(
  drive: drive_v3.Drive,
  rootFolderId: string,
  studentName: string,
  year: number,
): Promise<ProvisionFolderResult> {
  // 1. Find or create student folder under root
  const studentFolderId = await findOrCreateFolder(
    drive,
    rootFolderId,
    studentName,
  );

  // 2. Find or create year subfolder
  const yearFolderName = `${year}`;
  const yearFolderId = await findOrCreateFolder(
    drive,
    studentFolderId,
    yearFolderName,
  );

  return {
    folder_id: yearFolderId,
    folder_url: `https://drive.google.com/drive/folders/${yearFolderId}`,
  };
}

// ============================================================
// UPLOAD FILE TO FOLDER
// ============================================================
// Uploads a file (image, video, document) to a specific folder.
// Returns the file ID and web view link.
// ============================================================

export async function uploadFileToDrive(
  drive: drive_v3.Drive,
  folderId: string,
  fileName: string,
  mimeType: string,
  fileBuffer: Buffer,
): Promise<UploadFileResult> {
  const { Readable } = await import("stream");

  const response = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [folderId],
      mimeType,
    },
    media: {
      mimeType,
      body: Readable.from(fileBuffer),
    },
    fields: "id, webViewLink, thumbnailLink",
  });

  const fileId = response.data.id!;
  const fileUrl =
    response.data.webViewLink ??
    `https://drive.google.com/file/d/${fileId}/view`;
  const thumbnailUrl = response.data.thumbnailLink ?? null;

  return {
    file_id: fileId,
    file_url: fileUrl,
    thumbnail_url: thumbnailUrl,
  };
}

// ============================================================
// SHARE FOLDER WITH USER
// ============================================================
// Grants reader access to a Google account (parent's email).
// Silently succeeds if already shared.
// ============================================================

export async function shareFolderWithUser(
  drive: drive_v3.Drive,
  folderId: string,
  email: string,
  role: "reader" | "writer" = "reader",
): Promise<void> {
  try {
    await drive.permissions.create({
      fileId: folderId,
      requestBody: {
        type: "user",
        role,
        emailAddress: email,
      },
      sendNotificationEmail: false,
    });
  } catch (err: unknown) {
    // If already shared, Google returns 400 - we can ignore this
    const error = err as { code?: number };
    if (error.code !== 400) {
      throw err;
    }
  }
}

// ============================================================
// DELETE FILE FROM DRIVE
// ============================================================
// Moves a file to trash (recoverable). Used when an observation
// media attachment is deleted.
// ============================================================

export async function trashDriveFile(
  drive: drive_v3.Drive,
  fileId: string,
): Promise<void> {
  await drive.files.update({
    fileId,
    requestBody: { trashed: true },
  });
}

// ============================================================
// LIST FILES IN FOLDER
// ============================================================
// Returns files in a portfolio folder. Used for the portfolio
// view to show all media for a student's year.
// ============================================================

export async function listFolderFiles(
  drive: drive_v3.Drive,
  folderId: string,
): Promise<
  Array<{
    id: string;
    name: string;
    mimeType: string;
    size: string;
    webViewLink: string;
    thumbnailLink: string | null;
  }>
> {
  const response = await drive.files.list({
    q: `'${folderId}' in parents and trashed = false`,
    fields: "files(id, name, mimeType, size, webViewLink, thumbnailLink)",
    orderBy: "createdTime desc",
    pageSize: 100,
  });

  return (response.data.files ?? []).map((f) => ({
    id: f.id!,
    name: f.name!,
    mimeType: f.mimeType!,
    size: f.size ?? "0",
    webViewLink:
      f.webViewLink ?? `https://drive.google.com/file/d/${f.id}/view`,
    thumbnailLink: f.thumbnailLink ?? null,
  }));
}

// ============================================================
// HELPER: Find or create a folder by name under a parent
// ============================================================

async function findOrCreateFolder(
  drive: drive_v3.Drive,
  parentId: string,
  folderName: string,
): Promise<string> {
  // Search for existing folder
  const searchResponse = await drive.files.list({
    q: `'${parentId}' in parents and name = '${folderName.replace(/'/g, "\\'")}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: "files(id)",
    pageSize: 1,
  });

  if (searchResponse.data.files && searchResponse.data.files.length > 0) {
    return searchResponse.data.files[0].id!;
  }

  // Create new folder
  const createResponse = await drive.files.create({
    requestBody: {
      name: folderName,
      parents: [parentId],
      mimeType: "application/vnd.google-apps.folder",
    },
    fields: "id",
  });

  return createResponse.data.id!;
}
