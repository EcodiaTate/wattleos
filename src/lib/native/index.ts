// src/lib/native/index.ts
//
// ============================================================
// WattleOS - Native Plugin Barrel Export
// ============================================================
// WHY: Single import point for all native capabilities.
// import { capturePhoto, tapMedium, isNative } from "@/lib/native";
// ============================================================

// Platform detection
export {
  getPlatform,
  isNative,
  isIPad,
  isPluginAvailable,
  type WattlePlatform,
} from "./platform";

// Camera (observation capture)
export {
  capturePhoto,
  captureMultiplePhotos,
  type CapturedPhoto,
  type CaptureOptions,
} from "./camera";

// Haptics (tactile feedback)
export {
  tapLight,
  tapMedium,
  tapHeavy,
  notifySuccess,
  notifyWarning,
  notifyError,
  selectionChanged,
  selectionStart,
  selectionEnd,
} from "./haptics";

// Push notifications
export {
  registerForPush,
  unregisterPush,
  getDeliveredNotifications,
  clearNotifications,
  type PushNotificationHandlers,
  type WattleNotification,
  type WattleNotificationCategory,
} from "./push-notifications";

// Network detection
export {
  getNetworkStatus,
  onNetworkChange,
  type NetworkState,
} from "./network";

// App lifecycle (deep links, back button, splash, status bar)
export {
  initAppLifecycle,
  hideSplashScreen,
  configureStatusBar,
  getAppInfo,
} from "./app-lifecycle";

// Keyboard handling
export { initKeyboard, hideKeyboard } from "./keyboard";

// Observation sync service
export {
  syncQueuedObservations,
  initObservationSync,
  type SyncProgress,
  type SyncResult,
  type SyncProgressCallback,
} from "./observation-sync";

// Local storage & offline queue
export {
  setLocal,
  getLocal,
  removeLocal,
  setLocalJSON,
  getLocalJSON,
  queueObservation,
  getQueuedObservations,
  removeFromQueue,
  clearQueue,
  getQueueCount,
  type QueuedObservation,
} from "./local-storage";

// Scheduled notifications & geolocation
export {
  scheduleNotification,
  cancelNotification,
  cancelAllNotifications,
  scheduleTimesheetReminder,
  getCurrentLocation,
  watchLocation,
  type WattleLocation,
} from "./scheduled";

// Utility plugins (share, badge, orientation, device, clipboard, browser, action sheet)
export {
  shareContent,
  setBadgeCount,
  clearBadge,
  initScreenOrientation,
  lockLandscape,
  unlockOrientation,
  getDeviceInfo,
  copyToClipboard,
  readFromClipboard,
  openInAppBrowser,
  closeInAppBrowser,
  showActionSheet,
  type WattleDeviceInfo,
  type ActionSheetOption,
} from "./utilities";
