import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, writeFile, readFile, rm, access } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
const run = promisify(execFile);
const directory = join(homedir(), "Library/Application Support/OreCalendario");
const bundle = join(directory, "CalendarBridge.app");
let queue = Promise.resolve();
export async function nativeAvailable() {
  if (process.platform !== "darwin") return false;
  try {
    await access(join(bundle, "Contents/MacOS/CalendarBridge"));
    return true;
  } catch {
    return false;
  }
}
export function nativeCalendar(request) {
  const result = queue.then(async () => {
    if (!(await nativeAvailable()))
      throw Error(
        "La modalità Calendario del Mac richiede l’installazione aggiornata di ChronoCal.",
      );
    const temp = await mkdtemp(join(directory, "calendar-request-"));
    try {
      await writeFile(join(temp, "request.json"), JSON.stringify(request), {
        mode: 0o600,
      });
      await run(
        "/usr/bin/open",
        [
          "-W",
          "-n",
          bundle,
          "--args",
          join(temp, "request.json"),
          join(temp, "response.json"),
        ],
        { timeout: 120000, maxBuffer: 16000 },
      );
      const result = JSON.parse(
        await readFile(join(temp, "response.json"), "utf8"),
      );
      if (result.error) {
        const error = Error(result.error);
        error.native = true;
        throw error;
      }
      return result;
    } catch (e) {
      if (e.native) throw e;
      throw Error(
        "Calendario del Mac non ha risposto. Riprova e verifica il permesso in Privacy e sicurezza → Calendari.",
      );
    } finally {
      await rm(temp, { recursive: true, force: true });
    }
  });
  queue = result.catch(() => {});
  return result;
}
export async function openCalendarAccounts() {
  await run("/usr/bin/open", [
    "x-apple.systempreferences:com.apple.Internet-Accounts-Settings.extension",
  ]);
}
