import { mkdir, cp, writeFile, chmod, realpath } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
const source = dirname(dirname(fileURLToPath(import.meta.url))),
  home = homedir(),
  base = join(home, "Library/Application Support/OreCalendario"),
  runtime = join(base, "runtime"),
  app = join(home, "Applications/ChronoCal.app"),
  agents = join(home, "Library/LaunchAgents"),
  label = "it.chronocal.local";
if (process.platform !== "darwin") throw Error("Questo installer è per macOS.");
await mkdir(runtime, { recursive: true });
execFileSync(process.execPath, [join(source, "scripts/build-native.mjs")], {
  stdio: "inherit",
});
for (const name of [
  "server.mjs",
  "logic.mjs",
  "native-calendar.mjs",
  "package.json",
  "public",
])
  await cp(join(source, name), join(runtime, name), { recursive: true });
await mkdir(join(runtime, "bin"), { recursive: true });
await cp(await realpath(process.execPath), join(runtime, "bin/node"));
await chmod(join(runtime, "bin/node"), 0o755);
await mkdir(join(app, "Contents/MacOS"), { recursive: true });
await mkdir(agents, { recursive: true });
const xml = (s) =>
  s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
await writeFile(
  join(app, "Contents/Info.plist"),
  `<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd"><plist version="1.0"><dict><key>CFBundleName</key><string>ChronoCal</string><key>CFBundleIdentifier</key><string>it.chronocal.launcher</string><key>CFBundleExecutable</key><string>ChronoCal</string><key>CFBundlePackageType</key><string>APPL</string><key>CFBundleVersion</key><string>1.0</string><key>LSUIElement</key><true/></dict></plist>`,
);
await writeFile(
  join(app, "Contents/MacOS/ChronoCal"),
  `#!/bin/sh\n/usr/bin/curl -fsS http://localhost:4318/ -o /dev/null || /bin/launchctl kickstart gui/$(/usr/bin/id -u)/${label}\nfor attempt in 1 2 3 4 5; do\n  if /usr/bin/curl -fsS http://localhost:4318/ -o /dev/null; then\n    /usr/bin/open http://localhost:4318/\n    exit 0\n  fi\n  /bin/sleep 1\ndone\n/usr/bin/open http://localhost:4318/\n`,
);
await chmod(join(app, "Contents/MacOS/ChronoCal"), 0o755);
const plist = join(agents, label + ".plist");
await writeFile(
  plist,
  `<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd"><plist version="1.0"><dict><key>Label</key><string>${label}</string><key>ProgramArguments</key><array><string>${xml(join(runtime, "bin/node"))}</string><string>${xml(join(runtime, "server.mjs"))}</string></array><key>WorkingDirectory</key><string>${xml(runtime)}</string><key>RunAtLoad</key><true/><key>KeepAlive</key><true/><key>ThrottleInterval</key><integer>10</integer><key>EnvironmentVariables</key><dict><key>TZ</key><string>Europe/Rome</string></dict><key>StandardOutPath</key><string>${xml(join(base, "service.log"))}</string><key>StandardErrorPath</key><string>${xml(join(base, "service-error.log"))}</string></dict></plist>`,
);
const uid = process.getuid();
let registered = false;
try {
  execFileSync("/bin/launchctl", ["print", `gui/${uid}/${label}`], {
    stdio: "ignore",
  });
  registered = true;
} catch {}
if (registered)
  execFileSync("/bin/launchctl", ["kickstart", "-k", `gui/${uid}/${label}`]);
else execFileSync("/bin/launchctl", ["bootstrap", `gui/${uid}`, plist]);
console.log(
  "ChronoCal installata in " +
    app +
    "; servizio attivo e avvio automatico al login.",
);
