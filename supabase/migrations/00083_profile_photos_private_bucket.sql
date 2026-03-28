-- 00083_profile_photos_private_bucket.sql
--
-- Make the profile-photos bucket private.
-- Previously photos were served via .getPublicUrl() which
-- produces permanent, unauthenticated URLs — inappropriate
-- for images of children.
--
-- After this migration, all photo access must go through
-- createSignedUrl() (1-hour expiry) via the
-- /api/photos/signed-url server action.
--
-- NOTE: Supabase Storage bucket "public" flag is controlled
-- via the dashboard or CLI. This migration records the intent
-- and adds an RLS policy that blocks anonymous reads.
-- Run `supabase storage update profile-photos --public false`
-- (or toggle in dashboard) alongside this migration.

-- Block unauthenticated SELECT on profile-photos objects.
-- Authenticated access still goes through the admin client in
-- the signed-url action, so RLS is a defence-in-depth layer.
BEGIN;

-- Ensure the storage.objects policies allow only service_role
-- (admin client) to access profile-photos — not anon or authenticated
-- users directly. This is the belt-and-suspenders layer: the bucket
-- itself should also be set to private in the Supabase dashboard.

-- Drop any existing public read policy on profile-photos
DROP POLICY IF EXISTS "profile_photos_public_read" ON storage.objects;

-- Block anon reads on profile-photos
CREATE POLICY "profile_photos_no_anon_read"
  ON storage.objects
  FOR SELECT
  TO anon
  USING (bucket_id != 'profile-photos');

-- Allow authenticated users to upload to their own tenant folder
-- (tenantId is the first path segment: {tenantId}/{personType}/{uuid}.jpg)
CREATE POLICY "profile_photos_authenticated_insert"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'profile-photos');

-- Allow authenticated users to delete their own tenant's photos
CREATE POLICY "profile_photos_authenticated_delete"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'profile-photos');

COMMIT;
