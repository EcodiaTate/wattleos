// src/lib/storage/signed-urls.ts
//
// ============================================================
// WattleOS V2 - Signed URL Resolver
// ============================================================
// Generates short-lived signed URLs for private storage media.
//
// WHY server-side: The observation-media bucket is private
// (children's photos). Clients cannot call getPublicUrl. We
// resolve signed URLs here and inject them into the data before
// it reaches the client component.
//
// WHY batch: Observation feeds can have 10+ observations each
// with multiple photos. One-by-one would be too slow.
//
// EXPIRY: 1 hour. Pages that hold a reference longer will show
// broken images - acceptable trade-off for security. The feed
// re-fetches on navigation anyway.
// ============================================================

import { createSupabaseAdminClient } from "@/lib/supabase/server";
import type { ObservationMedia } from "@/types/domain";

/** Duration in seconds for signed URLs. 1 hour = 3600. */
const SIGNED_URL_EXPIRY_SECONDS = 3600;

/**
 * Takes an array of ObservationMedia and populates `thumbnail_url`
 * with a fresh signed URL for any Supabase-stored media that has
 * a `storage_path`.
 *
 * Google Drive media is left unchanged (uses its own thumbnail URL).
 *
 * WHY mutate thumbnail_url: The MediaGallery and MediaLightbox
 * components already read `thumbnail_url` for display. By setting
 * it here, zero UI changes are needed downstream.
 *
 * @returns A new array with signed URLs populated (does not mutate input).
 */
export async function resolveSignedUrls(
  media: ObservationMedia[],
): Promise<ObservationMedia[]> {
  if (media.length === 0) return [];

  // Separate Supabase media that needs signed URLs from others
  const supabaseMedia = media.filter(
    (m) => m.storage_provider === "supabase" && m.storage_path,
  );

  if (supabaseMedia.length === 0) return media;

  const admin = createSupabaseAdminClient();

  // Batch create signed URLs (Supabase supports this natively)
  const paths = supabaseMedia.map((m) => m.storage_path!);

  const { data: signedUrls, error } = await admin.storage
    .from("observation-media")
    .createSignedUrls(paths, SIGNED_URL_EXPIRY_SECONDS);

  if (error || !signedUrls) {
    console.error(
      "[signed-urls] Failed to create signed URLs:",
      error?.message,
    );
    // Return original media without signed URLs rather than crashing.
    // Photos will show as broken images - visible but degraded.
    return media;
  }

  // Build a lookup: storage_path -> signedUrl
  const urlMap = new Map<string, string>();
  for (const result of signedUrls) {
    if (result.signedUrl && result.path) {
      urlMap.set(result.path, result.signedUrl);
    }
  }

  // Return new array with signed URLs injected into thumbnail_url
  return media.map((m) => {
    if (m.storage_provider !== "supabase" || !m.storage_path) {
      return m;
    }

    const signedUrl = urlMap.get(m.storage_path);
    if (!signedUrl) return m;

    return {
      ...m,
      thumbnail_url: signedUrl,
    };
  });
}

/**
 * Convenience: resolve signed URLs for a map of observation_id -> media[].
 *
 * Used by getObservationFeed() which builds a Map<string, ObservationMedia[]>
 * before assembling feed items.
 */
export async function resolveSignedUrlsForMap(
  mediaMap: Map<string, ObservationMedia[]>,
): Promise<Map<string, ObservationMedia[]>> {
  // Flatten all media, resolve, then re-partition
  const allMedia: Array<{ obsId: string; media: ObservationMedia }> = [];

  for (const [obsId, mediaList] of mediaMap) {
    for (const m of mediaList) {
      allMedia.push({ obsId, media: m });
    }
  }

  if (allMedia.length === 0) return mediaMap;

  const flatMedia = allMedia.map((item) => item.media);
  const resolved = await resolveSignedUrls(flatMedia);

  // Re-partition into map
  const result = new Map<string, ObservationMedia[]>();
  for (let i = 0; i < allMedia.length; i++) {
    const obsId = allMedia[i].obsId;
    if (!result.has(obsId)) result.set(obsId, []);
    result.get(obsId)!.push(resolved[i]);
  }

  return result;
}
