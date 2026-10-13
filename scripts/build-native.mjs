import { createHash } from "node:crypto";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const bundle = join(
  homedir(),
  "Library/Application Support/OreCalendario/CalendarBridge.app",
);
const hash = createHash("sha256")
  .update(await readFile(join(root, "native/CalendarBridge.swift")))
  .update(await readFile(fileURLToPath(import.meta.url)))
  .digest("hex");
const stamp = join(dirname(bundle), "calendar-build.sha256");
try {
  if ((await readFile(stamp, "utf8")) === hash) {
    execFileSync("/usr/bin/codesign", ["--verify", bundle], {
      stdio: "ignore",
    });
    console.log("Modulo Calendario del Mac già aggiornato.");
    process.exit(0);
  }
} catch {}
await mkdir(join(bundle, "Contents/MacOS"), { recursive: true });
await writeFile(
  join(bundle, "Contents/Info.plist"),
  `<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd"><plist version="1.0"><dict><key>CFBundleName</key><string>ChronoCal Calendari</string><key>CFBundleDisplayName</key><string>ChronoCal Calendari</string><key>CFBundleIdentifier</key><string>it.chronocal.calendar</string><key>CFBundleExecutable</key><string>CalendarBridge</string><key>CFBundlePackageType</key><string>APPL</string><key>CFBundleVersion</key><string>1.1</string><key>LSUIElement</key><true/><key>NSCalendarsFullAccessUsageDescription</key><string>ChronoCal legge i calendari del Mac, inclusi quelli Google sincronizzati, per contare le ore nel periodo scelto. L’app non crea, modifica o elimina eventi.</string><key>NSCalendarsUsageDescription</key><string>ChronoCal legge i calendari del Mac per contare le ore, senza modificare gli eventi.</string></dict></plist>`,
);
execFileSync(
  "/usr/bin/xcrun",
  [
    "swiftc",
    "-O",
    "-framework",
    "AppKit",
    "-framework",
    "EventKit",
    join(root, "native/CalendarBridge.swift"),
    "-o",
    join(bundle, "Contents/MacOS/CalendarBridge"),
  ],
  { stdio: "inherit" },
);
execFileSync(
  "/usr/bin/codesign",
  ["--force", "--sign", "-", "--identifier", "it.chronocal.calendar", bundle],
  { stdio: "inherit" },
);
await writeFile(stamp, hash);
console.log("Modulo Calendario del Mac compilato e installato.");
