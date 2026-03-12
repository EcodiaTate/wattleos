# Media Attachments

WattleOS supports attaching photos to observations, with built-in image compression, consent tracking, and a lightbox viewer for browsing attached images.

## Adding Photos

When creating or editing an observation, click the photo button or file input to select images. On iPad, this opens the device camera directly, letting you photograph the child's work in the moment. On desktop, it opens your file browser.

You can select multiple photos at once. Each selected photo appears as a preview thumbnail below the form with an individual status indicator.

## Image Compression

Before uploading, WattleOS compresses each image on your device. This is important because classroom photos taken on iPads can be 4–8 MB each, and uploading multiple large photos over school Wi-Fi would be slow. Compression typically reduces file sizes by 60–80% with minimal visible quality loss.

The compression happens automatically - you do not need to do anything. Each photo's status indicator shows the current step:

- **Pending** - Photo selected but upload has not started
- **Compressing** - Photo is being compressed on your device
- **Uploading** - Compressed photo is being sent to the server
- **Done** - Upload complete and the photo is attached to the observation
- **Error** - Something went wrong (the error message appears). The observation is still saved; only the failed photo is missing

If compression fails for any reason (unusual file format, corrupted image), the original uncompressed file is uploaded instead.

## Storage

Photos are stored in Supabase Storage in the `observation-media` bucket. Each photo is stored under a path scoped to the observation: `{observation_id}/{unique_id}.{extension}`. This keeps media organised and isolated per observation.

A public thumbnail URL is generated for each uploaded photo. This URL is used for displaying thumbnails in the feed and detail views. The full-resolution image is accessible through the same storage path.

Photos can also be linked to Google Drive when the Google Drive integration is enabled. The `addObservationMedia` action supports both `supabase` and `google_drive` as storage providers.

## Supported Media Types

The system supports four media types: **image**, **video**, **audio**, and **document**. Currently, the capture form focuses on image uploads. Video, audio, and document support is available at the database and API level for future use.

Non-image media appears in the gallery as an icon representing its type (video camera, speaker, document) rather than a thumbnail.

## The Media Gallery

Photos attached to observations appear in two places:

### Feed Cards (Compact Gallery)

In the observation feed, photos appear as a horizontal strip of small 64-pixel thumbnails. If there are more than four photos, a "+N" indicator shows how many additional photos exist. Click any thumbnail to open the lightbox.

### Detail Page (Full Gallery)

On the observation detail page, photos appear as a wrapping grid of larger thumbnails (128–160 pixels depending on screen size). Each thumbnail is clickable and opens the lightbox.

## The Lightbox

Clicking any photo thumbnail opens a full-screen lightbox overlay. The lightbox shows the photo at full resolution with a dark backdrop. You can:

- **Navigate between photos** using the left and right arrow buttons, or arrow keys on a keyboard
- **Close the lightbox** by clicking the X button, clicking outside the image, or pressing Escape
- **View photo details** including the file name

The lightbox supports keyboard navigation and is fully accessible with proper focus management.

## Media Consent Tracking

WattleOS tracks media consent on a per-student basis. When a parent completes the enrollment application or updates their settings in the Parent Portal, they specify whether they grant media consent for their child.

When you create an observation with photos and tag students:

- Students **with** media consent show normally
- Students **without** media consent show a small warning icon next to their name tag
- When you attempt to publish, a **Media Consent Warning** banner appears listing the students without consent

The warning does not prevent publishing. You can click **Publish Anyway** to proceed - the photos are saved and the observation is published. The consent status serves as a reminder for guides to be mindful of which photos may be shared externally (in newsletters, social media, etc.) versus kept internal to the school.

## Removing Photos

Before saving an observation, you can remove a photo by clicking the X button on its thumbnail. This removes the photo from the form and revokes the local preview URL.

After an observation is saved, media attachments can be deleted through the `deleteObservationMedia` action, which performs a soft delete (the file remains in storage but the media record is marked as deleted and hidden from views).

## Best Practices

- **Take photos during the work**: A photo of a child mid-concentration with their materials tells a richer story than a staged photo after the fact.

- **Multiple angles**: For complex work (like a multi-step math operation or an intricate art project), attach two or three photos showing different aspects.

- **Be mindful of consent**: The consent warning is a safeguard, but it is good practice to know which students in your class have media consent before taking photos. Some schools keep a visual reference (like a chart with green/red dots) near the observation station.

- **File quality**: WattleOS compresses photos automatically, so do not worry about taking photos at reduced quality on your device. Full-resolution photos ensure the best result after compression.
