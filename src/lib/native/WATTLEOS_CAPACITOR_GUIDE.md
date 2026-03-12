# WattleOS Capacitor Implementation Guide

## Architecture: Remote WebView + Native Plugins

WattleOS uses **SSR with Server Components & Server Actions**. The Capacitor native shell loads `https://{school}.wattleos.au` in a WebView while providing native device access through the JS bridge. This preserves all SSR, RLS, and multi-tenant features.

```
┌──────────────────────────────────────────────┐
│           Native Shell (iOS/Android)          │
│  ┌────────────────────────────────────────┐  │
│  │         Capacitor JS Bridge            │  │
│  │  Camera · Haptics · Push · GPS · ...   │  │
│  ├────────────────────────────────────────┤  │
│  │            WKWebView / WebView         │  │
│  │  ┌──────────────────────────────────┐  │  │
│  │  │   https://school.wattleos.au     │  │  │
│  │  │                                  │  │  │
│  │  │   Next.js SSR App (unchanged)    │  │  │
│  │  │   Server Components              │  │  │
│  │  │   Server Actions                 │  │  │
│  │  │   Supabase RLS                   │  │  │
│  │  └──────────────────────────────────┘  │  │
│  └────────────────────────────────────────┘  │
└──────────────────────────────────────────────┘
```

---

## Files Created

### Configuration
| File | Purpose |
|------|---------|
| `capacitor.config.ts` | Capacitor config with server.url, plugin settings, iOS/Android config |
| `ios-info-plist-additions.xml` | iOS permission strings for camera, photos, location, push |
| `android-manifest-additions.xml` | Android permissions for all native features |
| `package-json-scripts.jsonc` | npm scripts for cap sync, build, dev |

### Plugin Bridges (`src/lib/native/`)
| File | Plugins | WattleOS Features |
|------|---------|-------------------|
| `platform.ts` | `@capacitor/core` | isNative(), isIPad(), getPlatform() detection |
| `camera.ts` | `@capacitor/camera` | Observation photo/video capture with web fallback |
| `haptics.ts` | `@capacitor/haptics` | Attendance tap, mastery update, save confirm |
| `push-notifications.ts` | `@capacitor/push-notifications` | Absence alerts, messages, announcements |
| `network.ts` | `@capacitor/network` | Offline detection, connectivity monitoring |
| `app-lifecycle.ts` | `@capacitor/app`, `splash-screen`, `status-bar` | Deep links, back button, theme sync |
| `keyboard.ts` | `@capacitor/keyboard` | iPad keyboard handling, scroll-to-input |
| `local-storage.ts` | `@capacitor/preferences` | Draft observation queue, offline storage |
| `scheduled.ts` | `@capacitor/local-notifications`, `geolocation` | Timesheet reminders, excursion tracking |
| `utilities.ts` | share, badge, orientation, device, clipboard, browser, action-sheet | Portfolio sharing, app badge, iPad rotation |
| `index.ts` | Barrel export | Single import point for all native features |

### React Components (`src/components/native/`)
| File | Purpose |
|------|---------|
| `NativeInitializer.tsx` | Bootstraps all plugins on mount (add to root layout) |
| `OfflineIndicator.tsx` | Shows amber banner when offline + useNetworkStatus hook |

---

## Plugin → WattleOS Feature Map

### 🎯 Critical Path (Observation Capture)
```
Guide taps "New Observation"
  → Camera.getPhoto()         // Native camera UI
  → haptics.tapMedium()       // Confirm photo taken
  → Preferences.set()         // Save draft locally
  → [if offline] queueObservation()  // Offline queue
  → [if online] Server Action → Supabase Storage
  → haptics.notifySuccess()   // Done!
```

### 📋 Attendance Workflow
```
Guide opens Attendance
  → haptics.tapLight()        // Each student toggle
  → [QR mode] BarcodeScanner  // Parent scan for pickup
  → haptics.notifySuccess()   // All marked
  → Server Action → Supabase
```

### 🔔 Push Notification Routing
```
Server sends push → APNs/FCM
  → notification.category === "absence_alert"
    → navigate("/attendance")
  → notification.category === "message_received"
    → navigate("/communications")
  → notification.category === "pickup_request"
    → navigate("/attendance/pickup")
```

### 📱 iPad-Specific Enhancements
```
isIPad() === true:
  → ScreenOrientation.unlock()     // Allow landscape
  → Keyboard.setAccessoryBarVisible(true)  // Done button
  → Density: "spacious"            // Touch-optimised targets
  → Curriculum tree: full landscape width
```

---

## Setup Steps

### 1. Install Dependencies
```bash
# Core
npm install @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android

# Official Plugins (all 20)
npm install @capacitor/camera @capacitor/push-notifications @capacitor/haptics \
  @capacitor/status-bar @capacitor/splash-screen @capacitor/app @capacitor/keyboard \
  @capacitor/network @capacitor/preferences @capacitor/filesystem @capacitor/share \
  @capacitor/local-notifications @capacitor/badge @capacitor/screen-orientation \
  @capacitor/browser @capacitor/clipboard @capacitor/device @capacitor/action-sheet \
  @capacitor/geolocation

# Community
npm install @capacitor-community/barcode-scanner

# Init platforms
npx cap add ios
npx cap add android
```

### 2. Copy Files
- Copy `capacitor.config.ts` to project root
- Copy `src/lib/native/*` to your source tree
- Copy `src/components/native/*` to your source tree

### 3. Update Root Layout
```tsx
// In src/app/(app)/layout.tsx, add:
import { NativeInitializer } from "@/components/native/NativeInitializer";
import { OfflineIndicator } from "@/components/native/OfflineIndicator";

// Inside the layout JSX, before sidebar:
<NativeInitializer />
<OfflineIndicator />
```

### 4. Configure iOS
- Add permission strings from `ios-info-plist-additions.xml` to `ios/App/App/Info.plist`
- Add Associated Domains entitlement for deep links
- Add APNs capability in Xcode for push notifications

### 5. Configure Android
- Add permissions from `android-manifest-additions.xml` to `AndroidManifest.xml`
- Add `google-services.json` for FCM push notifications
- Add intent filter for deep links

### 6. Deploy Apple App Site Association
Host at `https://wattleos.au/.well-known/apple-app-site-association`:
```json
{
  "applinks": {
    "details": [{
      "appIDs": ["TEAMID.au.wattleos.app"],
      "components": [{ "/": "/*" }]
    }]
  }
}
```

### 7. Development Workflow
```bash
# Start Next.js dev server
npm run dev

# In capacitor.config.ts, temporarily set:
# server.url = "http://YOUR_LOCAL_IP:3000"

# Sync and open
npx cap sync ios && npx cap open ios
# or
npx cap sync android && npx cap open android
```

---

## Usage Examples

### Observation Form - Replace File Input with Native Camera
```tsx
import { capturePhoto, tapMedium, notifySuccess } from "@/lib/native";

async function handleAddPhoto() {
  const photo = await capturePhoto({ source: "prompt", quality: 85 });
  if (!photo) return; // User cancelled

  await tapMedium(); // Haptic confirm

  // Add to form state (same shape as existing PhotoEntry)
  addPhotoEntry({
    file: photo.file ?? base64ToFile(photo.base64Data, photo.mimeType),
    previewUrl: photo.previewUrl,
    status: "pending",
    errorMessage: null,
  });
}
```

### Attendance - Haptic Feedback on Toggle
```tsx
import { tapLight, notifySuccess } from "@/lib/native";

async function handleToggleAttendance(studentId: string) {
  await tapLight(); // Instant tactile feedback
  const result = await markAttendance(studentId, "present");
  if (!result.error) {
    await notifySuccess(); // Confirm saved
  }
}
```

### Share Portfolio Item
```tsx
import { shareContent } from "@/lib/native";

async function handleShareMilestone(studentName: string, url: string) {
  await shareContent({
    title: `${studentName}'s Learning Milestone`,
    text: "Check out this amazing progress!",
    url,
  });
}
```
