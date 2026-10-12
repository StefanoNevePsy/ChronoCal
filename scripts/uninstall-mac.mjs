import { execFileSync } from "node:child_process";
import { unlink, rm } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
try {
  execFileSync(
    "/bin/launchctl",
    ["bootout", `gui/${process.getuid()}/it.chronocal.local`],
    { stdio: "ignore" },
  );
} catch {}
await unlink(
  join(homedir(), "Library/LaunchAgents/it.chronocal.local.plist"),
).catch(() => {});
await rm(join(homedir(), "Applications/ChronoCal.app"), {
  recursive: true,
  force: true,
});
console.log(
  "Avvio automatico e launcher rimossi. Credenziali e runtime conservati in Library/Application Support/OreCalendario.",
);
