// scripts/patch-next-devtools.mjs
//
// Patches the Next.js devtools draggable indicator to wrap
// releasePointerCapture() in a try/catch.
//
// Root cause: when a touch gesture is cancelled by the browser
// (pointercancel), pointer capture is released automatically.
// The Next.js drag handler then tries to release it again,
// throwing NotFoundError: No active pointer with the given id.
//
// This is a Next.js upstream bug — dev-mode only, no impact on
// production Capacitor builds. This script is run via postinstall
// so the fix survives `npm install`.

import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const target = join(
  __dirname,
  "../node_modules/next/dist/compiled/next-devtools/index.js",
);

const ORIGINAL = `null==(a=t.current)||a.releasePointerCapture(n.current.pointerId)`;
const PATCHED = `null==(a=t.current)||function(){try{a.releasePointerCapture(n.current.pointerId)}catch{}}()`;

try {
  let src = readFileSync(target, "utf8");
  if (src.includes(PATCHED)) {
    console.log("patch-next-devtools: already applied, skipping.");
    process.exit(0);
  }
  if (!src.includes(ORIGINAL)) {
    console.log(
      "patch-next-devtools: target string not found — Next.js may have fixed this upstream.",
    );
    process.exit(0);
  }
  src = src.replace(ORIGINAL, PATCHED);
  writeFileSync(target, src, "utf8");
  console.log("patch-next-devtools: releasePointerCapture try/catch applied.");
} catch (err) {
  // Non-fatal — Next.js might move the file in a future version
  console.warn("patch-next-devtools: could not apply patch:", err.message);
}
