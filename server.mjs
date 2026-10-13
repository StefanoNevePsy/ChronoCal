import {
  nativeCalendar,
  nativeAvailable,
  openCalendarAccounts,
} from "./native-calendar.mjs";
import http from "node:http";
import { readFile, writeFile, mkdir, chmod } from "node:fs/promises";
import { join, dirname } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";
import { randomBytes, createHash } from "node:crypto";
import { summarize } from "./logic.mjs";
const root = dirname(fileURLToPath(import.meta.url)),
  port = 4318,
  origin = `http://localhost:${port}`;
const dir = join(homedir(), "Library", "Application Support", "OreCalendario");
await mkdir(dir, { recursive: true, mode: 0o700 });
await chmod(dir, 0o700);
let saved = {};
try {
  saved = JSON.parse(await readFile(join(dir, "connection.json"), "utf8"));
} catch (e) {
  if (e.code !== "ENOENT") throw e;
}
async function persist() {
  const { rename } = await import("node:fs/promises");
  await writeFile(join(dir, "connection.tmp"), JSON.stringify(saved), {
    mode: 0o600,
  });
  await rename(join(dir, "connection.tmp"), join(dir, "connection.json"));
}
const sessions = new Set(),
  flows = new Map();
let refreshing;
function json(res, data, status = 200) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(data));
}
async function body(req) {
  let s = "";
  for await (const c of req) {
    s += c;
    if (s.length > 32000) throw Error("File troppo grande.");
  }
  return JSON.parse(s);
}
async function tokenRequest(args) {
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    body: new URLSearchParams({
      ...args,
      client_id: saved.config.client_id,
      client_secret: saved.config.client_secret,
    }),
    signal: AbortSignal.timeout(20000),
  });
  const t = await r.json();
  if (!r.ok) {
    if (t.error === "invalid_grant") {
      delete saved.tokens;
      await persist();
    }
    throw Error(
      "Accesso Google scaduto o revocato. Collega nuovamente Google.",
    );
  }
  return t;
}
async function access() {
  if (!saved.tokens) throw Error("Collega Google per leggere i calendari.");
  if (saved.tokens.expires > Date.now() + 60000)
    return saved.tokens.access_token;
  if (!refreshing)
    refreshing = (async () => {
      const t = await tokenRequest({
        grant_type: "refresh_token",
        refresh_token: saved.tokens.refresh_token,
      });
      saved.tokens = {
        ...saved.tokens,
        ...t,
        expires: Date.now() + t.expires_in * 1000,
      };
      await persist();
      return t.access_token;
    })().finally(() => (refreshing = null));
  return refreshing;
}
async function google(path, params = {}) {
  const url = new URL("https://www.googleapis.com/calendar/v3/" + path);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const r = await fetch(url, {
    headers: { Authorization: `Bearer ${await access()}` },
    signal: AbortSignal.timeout(30000),
  });
  if (!r.ok)
    throw Error(
      r.status === 429
        ? "Google richiede una pausa. Riprova fra poco."
        : r.status === 401
          ? "Collega nuovamente Google."
          : "Google non ha potuto leggere i calendari. Verifica che Calendar API sia abilitata e riprova.",
    );
  return r.json();
}
async function pages(path, params) {
  let items = [],
    pageToken;
  do {
    const data = await google(path, {
      ...params,
      ...(pageToken ? { pageToken } : {}),
    });
    items.push(...(data.items || []));
    pageToken = data.nextPageToken;
    if (items.length > 100000)
      throw Error("Intervallo troppo ampio. Scegli un periodo più breve.");
  } while (pageToken);
  return items;
}
http
  .createServer(async (req, res) => {
    try {
      if (req.headers.host !== `localhost:${port}`) {
        res.writeHead(403);
        return res.end();
      }
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("Referrer-Policy", "no-referrer");
      const url = new URL(req.url, origin);
      let session = req.headers.cookie?.match(/(?:^|; )ore=([a-f0-9]+)/)?.[1];
      if (url.pathname === "/" && req.method === "GET") {
        if (!sessions.has(session)) {
          session = randomBytes(32).toString("hex");
          sessions.add(session);
          res.setHeader(
            "Set-Cookie",
            `ore=${session}; HttpOnly; SameSite=Lax; Path=/`,
          );
        }
        res.setHeader(
          "Content-Security-Policy",
          "default-src 'self'; style-src 'self'; font-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
        );
        res.setHeader("Content-Type", "text/html");
        return res.end(await readFile(join(root, "public/index.html")));
      }
      if (
        ["/app.js", "/style.css", "/logic.mjs"].includes(url.pathname) ||
        /^\/fonts\/[a-zA-Z0-9.-]+$/.test(url.pathname)
      ) {
        res.setHeader(
          "Content-Type",
          url.pathname.endsWith(".css")
            ? "text/css"
            : url.pathname.endsWith(".js") || url.pathname.endsWith(".mjs")
              ? "text/javascript"
              : "font/ttf",
        );
        return res.end(
          await readFile(join(root, "public", url.pathname.slice(1))),
        );
      }
      if (!sessions.has(session))
        return json(res, { error: "Apri prima la pagina dell’app." }, 401);
      if (req.method === "POST" && req.headers.origin !== origin)
        return json(res, { error: "Richiesta non consentita." }, 403);
      if (url.pathname === "/api/status")
        return json(res, {
          configured: !!saved.config,
          connected: !!saved.tokens,
          offline: !!saved.tokens?.refresh_token,
          provider: saved.provider || "google",
          macAvailable: await nativeAvailable(),
        });
      if (url.pathname === "/api/mac/status")
        return json(res, await nativeCalendar({ action: "status" }));
      if (url.pathname === "/api/mac/connect" && req.method === "POST") {
        await nativeCalendar({ action: "connect" });
        saved.provider = "mac";
        await persist();
        return json(res, { ok: true });
      }
      if (url.pathname === "/api/mac/accounts" && req.method === "POST") {
        await openCalendarAccounts();
        return json(res, { ok: true });
      }
      if (url.pathname === "/api/mac/disconnect" && req.method === "POST") {
        saved.provider = "google";
        await persist();
        return json(res, { ok: true });
      }
      if (url.pathname === "/api/config" && req.method === "POST") {
        const b = await body(req),
          c = b.web;
        if (
          !c?.client_id?.endsWith(".apps.googleusercontent.com") ||
          !c.client_secret ||
          !c.redirect_uris?.includes(origin + "/oauth/callback")
        )
          throw Error(
            "Importa le credenziali di un client OAuth di tipo Applicazione web con il redirect indicato.",
          );
        saved = {
          provider: "google",
          config: { client_id: c.client_id, client_secret: c.client_secret },
        };
        await persist();
        return json(res, { ok: true });
      }
      if (url.pathname === "/auth/google") {
        if (!saved.config) throw Error("Importa prima le credenziali Google.");
        const state = randomBytes(32).toString("hex"),
          verifier = randomBytes(48).toString("base64url");
        for (const [k, v] of flows) if (v.exp < Date.now()) flows.delete(k);
        flows.set(state, { session, verifier, exp: Date.now() + 600000 });
        const u = new URL("https://accounts.google.com/o/oauth2/v2/auth");
        u.search = new URLSearchParams({
          client_id: saved.config.client_id,
          redirect_uri: origin + "/oauth/callback",
          response_type: "code",
          scope: "https://www.googleapis.com/auth/calendar.readonly",
          access_type: "offline",
          prompt: "consent",
          state,
          code_challenge: createHash("sha256")
            .update(verifier)
            .digest("base64url"),
          code_challenge_method: "S256",
        });
        res.writeHead(302, { Location: u.href });
        return res.end();
      }
      if (url.pathname === "/oauth/callback") {
        const state = url.searchParams.get("state"),
          flow = flows.get(state);
        flows.delete(state);
        if (!flow || flow.session !== session || flow.exp < Date.now())
          throw Error("Richiesta di accesso scaduta. Riprova.");
        if (url.searchParams.has("error")) {
          res.writeHead(302, { Location: "/?auth=cancelled" });
          return res.end();
        }
        const t = await tokenRequest({
          grant_type: "authorization_code",
          code: url.searchParams.get("code"),
          code_verifier: flow.verifier,
          redirect_uri: origin + "/oauth/callback",
        });
        saved.provider = "google";
        saved.tokens = { ...t, expires: Date.now() + t.expires_in * 1000 };
        await persist();
        res.writeHead(302, { Location: "/" });
        return res.end();
      }
      if (url.pathname === "/api/disconnect" && req.method === "POST") {
        if (saved.tokens) {
          const r = await fetch("https://oauth2.googleapis.com/revoke", {
            method: "POST",
            body: new URLSearchParams({
              token: saved.tokens.refresh_token || saved.tokens.access_token,
            }),
            signal: AbortSignal.timeout(15000),
          });
          if (!r.ok && r.status !== 400)
            throw Error("Impossibile revocare Google. Riprova.");
        }
        delete saved.tokens;
        await persist();
        return json(res, { ok: true });
      }
      if (url.pathname === "/api/calendars") {
        if (saved.provider === "mac")
          return json(
            res,
            (await nativeCalendar({ action: "calendars" })).calendars,
          );
        return json(
          res,
          await pages("users/me/calendarList", { maxResults: 250 }),
        );
      }
      if (url.pathname === "/api/report" && req.method === "POST") {
        const b = await body(req),
          from = Date.parse(b.from),
          to = Date.parse(b.to);
        if (
          !Number.isFinite(from) ||
          !Number.isFinite(to) ||
          to <= from ||
          to - from > 366 * 86400000 ||
          !Array.isArray(b.ids) ||
          !b.ids.length ||
          b.ids.length > 30 ||
          b.ids.some((x) => typeof x !== "string")
        )
          throw Error(
            "Scegli da 1 a 30 calendari e un intervallo di massimo un anno.",
          );
        if (saved.provider === "mac") {
          const result = await nativeCalendar({
            action: "events",
            ids: [...new Set(b.ids)],
            from,
            to,
          });
          const all = [],
            rows = [];
          for (const c of result.calendars) {
            const name = c.account ? `${c.summary} · ${c.account}` : c.summary;
            const events = result.events
              .filter((e) => e.calendarId === c.id)
              .map((e) => ({ ...e, calendar: name }));
            all.push(...events);
            rows.push({ name, ...summarize(events, from, to, b.merge) });
          }
          return json(res, { ...summarize(all, from, to, b.merge), rows });
        }
        const ids = [...new Set(b.ids)],
          calendars = await pages("users/me/calendarList", { maxResults: 250 });
        const rows = [],
          all = [];
        for (const id of ids) {
          const c = calendars.find((c) => c.id === id);
          if (!c) throw Error("Calendario non disponibile. Aggiorna l’elenco.");
          const events = (
            await pages(`calendars/${encodeURIComponent(id)}/events`, {
              timeMin: new Date(from).toISOString(),
              timeMax: new Date(to).toISOString(),
              singleEvents: true,
              showDeleted: false,
              maxResults: 2500,
            })
          ).map((e) => ({ ...e, calendar: c.summary }));
          all.push(...events);
          rows.push({
            name: c.summary,
            ...summarize(events, from, to, b.merge),
          });
        }
        return json(res, { ...summarize(all, from, to, b.merge), rows });
      }
      json(res, { error: "Pagina non trovata." }, 404);
    } catch (e) {
      json(res, { error: e.message || "Operazione non riuscita." }, 400);
    }
  })
  .listen(port, "127.0.0.1", () => console.log(`Ore Calendario: ${origin}`));
