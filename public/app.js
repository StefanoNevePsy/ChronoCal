import { summarize } from "./logic.mjs";
const $ = (s) => document.querySelector(s),
  fmt = new Intl.NumberFormat("it-IT", { maximumFractionDigits: 2 });
let calendars = [],
  demo = false,
  report = null,
  busy = false,
  generation = 0,
  provider = "google",
  configured = false,
  macAvailable = false;
const remembered = new Set(
  JSON.parse(localStorage.getItem("chrono.calendars") || "[]"),
);
function theme() {
  const value = $("#theme").value;
  document.documentElement.dataset.theme =
    value === "auto"
      ? matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : value;
  localStorage.setItem("chrono.theme", value);
}
$("#theme").value = localStorage.getItem("chrono.theme") || "auto";
theme();
$("#theme").onchange = theme;
matchMedia("(prefers-color-scheme: dark)").addEventListener("change", theme);
function error(e) {
  $("#error").textContent = e.message || e;
  $("#error").hidden = false;
  $("#message").textContent = "";
}
function clear() {
  $("#error").hidden = true;
  $("#message").textContent = "";
}
async function api(path, data) {
  const r = await fetch(path, {
    ...(data
      ? {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }
      : {}),
  });
  const b = await r.json();
  if (!r.ok) throw Error(b.error || "Operazione non riuscita.");
  return b;
}
function node(tag, text, cls) {
  const el = document.createElement(tag);
  if (text !== undefined) el.textContent = text;
  if (cls) el.className = cls;
  return el;
}
function ids() {
  return calendars.filter((c) => remembered.has(c.id)).map((c) => c.id);
}
function controls() {
  $("#calculate").disabled = busy || !ids().length;
  $("#refresh").disabled = busy || !calendars.length;
  $("#all").disabled = busy || !calendars.length;
  $("#connect").disabled = busy || !configured;
  $("#connectMac").disabled = busy || !macAvailable;
  $("#accounts").disabled = busy || !macAvailable;
  $("#accountsAside").disabled = busy || !macAvailable;
  $("#changeSource").disabled = busy;
}
function invalidate() {
  generation++;
  report = null;
  $("#results").replaceChildren();
  const wrap = node("div", undefined, "empty");
  wrap.append(
    node("span", "il foglio è ancora bianco", "hand"),
    node("h2", "Le tue ore iniziano qui."),
    node(
      "p",
      "Seleziona almeno un calendario e un periodo, poi premi «Conta le ore».",
    ),
  );
  $("#results").append(wrap);
}
function renderCalendars() {
  const q = $("#search").value.toLocaleLowerCase("it");
  $("#calendars").replaceChildren();
  for (const c of calendars) {
    if (!c.summary.toLocaleLowerCase("it").includes(q)) continue;
    const label = node("label", undefined, "calendar"),
      input = node("input");
    input.type = "checkbox";
    input.value = c.id;
    input.checked = remembered.has(c.id);
    input.onchange = () => {
      if (input.checked) remembered.add(c.id);
      else remembered.delete(c.id);
      if (!demo)
        localStorage.setItem(
          "chrono.calendars",
          JSON.stringify([...remembered]),
        );
      invalidate();
      controls();
    };
    const name = node("span", c.summary);
    if (c.account) {
      const account = node("small", c.account, "calendarAccount");
      name.append(account);
    }
    label.append(input, name);
    $("#calendars").append(label);
  }
  if (!$("#calendars").children.length)
    $("#calendars").append(
      node(
        "p",
        calendars.length
          ? "Nessun calendario corrisponde alla ricerca."
          : "Nessun calendario disponibile.",
        "muted",
      ),
    );
  $("#calendarCount").textContent = calendars.length
    ? String(calendars.length)
    : "";
  controls();
}
$("#search").oninput = renderCalendars;
$("#all").onclick = () => {
  const all = calendars.every((c) => remembered.has(c.id));
  for (const c of calendars) {
    if (all) remembered.delete(c.id);
    else remembered.add(c.id);
  }
  if (!demo)
    localStorage.setItem("chrono.calendars", JSON.stringify([...remembered]));
  renderCalendars();
  invalidate();
};
function dateString(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function preset(value) {
  const now = new Date(),
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate()),
    end = new Date(start);
  if (value === "week") {
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
    end.setTime(start.getTime());
    end.setDate(end.getDate() + 6);
  }
  if (value === "month") {
    start.setDate(1);
    end.setMonth(end.getMonth() + 1, 0);
  }
  if (value === "lastmonth") {
    start.setMonth(start.getMonth() - 1, 1);
    end.setDate(0);
  }
  if (value === "year") {
    start.setMonth(0, 1);
    end.setMonth(11, 31);
  }
  if (value !== "custom") {
    $("#from").value = dateString(start);
    $("#to").value = dateString(end);
  }
  document
    .querySelectorAll("[data-period]")
    .forEach((b) =>
      b.setAttribute("aria-pressed", String(b.dataset.period === value)),
    );
  invalidate();
}
$("#presets").onclick = (e) => {
  if (e.target.dataset.period) preset(e.target.dataset.period);
};
$("#from").onchange = $("#to").onchange = () => preset("custom");
$("#merge").onchange = () => {
  localStorage.setItem("chrono.merge", String($("#merge").checked));
  invalidate();
};
$("#merge").checked = localStorage.getItem("chrono.merge") !== "false";
preset("month");
const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
$("#timezone").textContent =
  `Giornate nel fuso ${zone}. Le date iniziale e finale sono comprese.`;
async function loadCalendars() {
  clear();
  invalidate();
  calendars = [];
  renderCalendars();
  busy = true;
  controls();
  $("#message").textContent = "Lettura dei calendari…";
  try {
    calendars = await api("/api/calendars");
    renderCalendars();
    $("#welcome").hidden = true;
    $("#disconnect").hidden = provider === "mac";
    $("#changeSource").hidden = false;
    $("#accountsAside").hidden = provider !== "mac";
    $("#message").textContent =
      provider === "mac"
        ? "Calendari letti dal Mac. I dati seguono la sincronizzazione di Calendario di Apple."
        : "Calendari aggiornati. Puoi contare le ore.";
    if (!calendars.length && provider === "mac") {
      $("#welcome").hidden = false;
      $("#message").textContent =
        "Nessun calendario disponibile. Aggiungi un account Google nelle impostazioni del Mac e abilita Calendari.";
    }
    $("#modeLabel").textContent =
      provider === "mac"
        ? "Calendario del Mac · Dati sincronizzati da Apple"
        : "Google diretto · Sola lettura";
    invalidate();
  } catch (e) {
    error(e);
    $("#welcome").hidden = false;
  } finally {
    busy = false;
    controls();
  }
}
$("#refresh").onclick = () => (demo ? renderCalendars() : loadCalendars());
$("#connectMac").onclick = async () => {
  clear();
  busy = true;
  controls();
  $("#message").textContent =
    "Autorizza ChronoCal nella richiesta di macOS, se compare…";
  try {
    await api("/api/mac/connect", {});
    provider = "mac";
    demo = false;
    $("#leaveDemo").hidden = true;
    await loadCalendars();
  } catch (e) {
    error(e);
  } finally {
    busy = false;
    controls();
  }
};
async function accounts() {
  clear();
  try {
    await api("/api/mac/accounts", {});
    $("#message").textContent =
      "Nelle impostazioni del Mac scegli Aggiungi account → Google e abilita Calendari. Poi torna qui e aggiorna l’elenco.";
  } catch (e) {
    error(e);
  }
}
$("#accounts").onclick = $("#accountsAside").onclick = accounts;
$("#changeSource").onclick = () => {
  $("#welcome").hidden = false;
  $("#welcome").scrollIntoView({ behavior: "instant" });
};
$("#configuration").addEventListener("toggle", () => {
  $("#connect").hidden = !$("#configuration").open;
});
$("#connect").onclick = () => {
  location.href = "/auth/google";
};
$("#disconnect").onclick = async () => {
  clear();
  busy = true;
  controls();
  try {
    await api("/api/disconnect", {});
    remembered.clear();
    localStorage.removeItem("chrono.calendars");
    location.reload();
  } catch (e) {
    error(e);
    busy = false;
    controls();
  }
};
const setup = $("#setupContent");
setup.innerHTML = `<ol><li>In <a href="https://console.cloud.google.com/apis/library/calendar-json.googleapis.com" target="_blank" rel="noreferrer">Google Cloud</a>, crea un progetto e abilita Google Calendar API.</li><li>Configura Google Auth Platform e aggiungi il tuo account agli utenti di test, se necessario.</li><li>Crea un client OAuth di tipo <strong>Applicazione web</strong>, con questo URI di reindirizzamento:<span class="code">http://localhost:4318/oauth/callback</span></li><li>Scarica il JSON delle credenziali e importalo qui.</li></ol><label>Credenziali Google, file JSON<input id="credentials" type="file" accept=".json,application/json"></label><p>Le credenziali rimangono sul Mac. Per evitare la scadenza dei token dopo 7 giorni, il progetto Google non deve restare in modalità Testing.</p>`;
$("#credentials").onchange = async (e) => {
  clear();
  try {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 32000)
      throw Error("Il file è troppo grande. Usa il JSON del client OAuth.");
    await api("/api/config", JSON.parse(await file.text()));
    configured = true;
    provider = "google";
    calendars = [];
    renderCalendars();
    invalidate();
    $("#connect").disabled = false;
    $("#configuration").open = true;
    $("#message").textContent =
      "Configurazione salvata. Ora puoi collegare Google.";
  } catch (e) {
    error(e);
  }
};
let demoPrevious;
$("#demo").onclick = () => {
  demoPrevious = new Set(remembered);
  demo = true;
  $("#disconnect").hidden = true;
  $("#changeSource").hidden = true;
  $("#accountsAside").hidden = true;
  calendars = [
    { id: "demo-clinica", summary: "Sedute cliniche" },
    { id: "demo-studio", summary: "Studio e formazione" },
    { id: "demo-equipe", summary: "Riunioni di équipe" },
  ];
  remembered.clear();
  calendars.forEach((c) => remembered.add(c.id));
  renderCalendars();
  $("#welcome").hidden = true;
  $("#leaveDemo").hidden = false;
  $("#modeLabel").textContent = "Modalità dimostrativa · Dati di esempio";
  $("#message").textContent =
    "Stai esplorando dati di esempio, non i tuoi calendari.";
};
$("#leaveDemo").onclick = () => {
  localStorage.setItem("chrono.calendars", JSON.stringify([...demoPrevious]));
  location.reload();
};
function demoEvents(from, to) {
  const events = [];
  let d = new Date(from);
  d.setHours(9, 0, 0, 0);
  let i = 0;
  while (d.getTime() < to) {
    if (d.getDay() !== 0 && d.getDay() !== 6) {
      for (const [j, c] of calendars.entries()) {
        const start = new Date(d);
        start.setHours(9 + j + (i % 2), 0, 0, 0);
        const end = new Date(start.getTime() + (j === 0 ? 3 : 1) * 3600000);
        events.push({
          calendar: c.summary,
          id: c.id,
          summary: [
            "Sedute del mattino",
            "Lettura e preparazione",
            "Confronto di équipe",
          ][j],
          start: { dateTime: start.toISOString() },
          end: { dateTime: end.toISOString() },
        });
      }
      i++;
    }
    d.setDate(d.getDate() + 1);
  }
  return events;
}
$("#reportForm").onsubmit = async (e) => {
  e.preventDefault();
  clear();
  const from = new Date($("#from").value + "T00:00:00"),
    to = new Date($("#to").value + "T00:00:00");
  to.setDate(to.getDate() + 1);
  if (
    !Number.isFinite(+from) ||
    !Number.isFinite(+to) ||
    to <= from ||
    to - from > 366 * 86400000
  ) {
    error("Scegli un intervallo valido di massimo un anno.");
    return;
  }
  const selected = ids(),
    merge = $("#merge").checked,
    current = ++generation;
  busy = true;
  controls();
  $("#calculate").textContent = "Conteggio in corso…";
  $("#message").textContent = "Leggo gli eventi del periodo selezionato…";
  try {
    let result;
    if (demo) {
      const all = demoEvents(+from, +to).filter((e) => selected.includes(e.id));
      result = {
        ...summarize(all, +from, +to, merge),
        rows: calendars
          .filter((c) => selected.includes(c.id))
          .map((c) => ({
            name: c.summary,
            ...summarize(
              all.filter((e) => e.id === c.id),
              +from,
              +to,
              merge,
            ),
          })),
      };
    } else
      result = await api("/api/report", {
        ids: selected,
        from: from.toISOString(),
        to: to.toISOString(),
        merge,
      });
    if (current !== generation) {
      $("#message").textContent =
        "Le scelte sono cambiate. Premi di nuovo «Conta le ore».";
      return;
    }
    report = { ...result, merge, from: $("#from").value, to: $("#to").value };
    renderReport();
    $("#message").textContent = demo
      ? "Conteggio completato · Dati di esempio."
      : "Conteggio aggiornato alle " +
        new Date().toLocaleTimeString("it-IT", {
          hour: "2-digit",
          minute: "2-digit",
        }) +
        ".";
  } catch (e) {
    error(e);
  } finally {
    busy = false;
    controls();
    $("#calculate").textContent = "Conta le ore";
  }
};
function renderReport() {
  const r = report,
    target = $("#results");
  target.replaceChildren();
  const head = node("div", undefined, "resultHead");
  head.append(
    node(
      "p",
      `${demo ? "Esempio · " : ""}${new Date(r.from + "T12:00:00").toLocaleDateString("it-IT")} · ${new Date(r.to + "T12:00:00").toLocaleDateString("it-IT")}`,
      "eyebrow",
    ),
  );
  const exp = node("button", "Esporta CSV");
  exp.onclick = exportCSV;
  head.append(exp);
  target.append(head);
  const metrics = node("div", undefined, "metrics");
  for (const [n, label, cls] of [
    [fmt.format(r.hours), "Ore totali", "number big"],
    [r.count, "Eventi conteggiati", "number"],
    [r.rows.length, "Calendari", "number"],
  ]) {
    const cell = node("div");
    cell.append(
      node("span", String(n), cls),
      node("span", label, "metricLabel"),
    );
    metrics.append(cell);
  }
  target.append(metrics, node("h2", "Il tempo per calendario"));
  const table = node("table"),
    thead = node("thead"),
    tr = node("tr");
  ["Calendario", "Eventi", "Ore"].forEach((t) => tr.append(node("th", t)));
  thead.append(tr);
  table.append(thead);
  const tbody = node("tbody");
  for (const c of r.rows) {
    const row = node("tr");
    row.append(
      node("td", c.name, "name"),
      node("td", String(c.count)),
      node("td", fmt.format(c.hours)),
    );
    tbody.append(row);
  }
  table.append(tbody);
  const wrap = node("div", undefined, "tableWrap");
  wrap.append(table);
  target.append(
    wrap,
    node(
      "p",
      r.merge
        ? "Il totale unisce gli intervalli di tutti i calendari. La somma delle singole righe può essere maggiore, quando si sovrappongono."
        : "Il totale somma la durata di tutti gli eventi, comprese le sovrapposizioni.",
      "small muted",
    ),
  );
  if (r.excluded)
    target.append(
      node(
        "p",
        `${r.excluded} eventi di giornata intera esclusi perché privi di un orario.`,
        "small muted",
      ),
    );
  const details = node("details"),
    summary = node("summary", "Vedi gli eventi conteggiati");
  details.append(summary);
  const events = node("table");
  for (const e of r.events) {
    const row = node("tr");
    row.append(
      node(
        "td",
        new Date(e.start).toLocaleString("it-IT", {
          day: "2-digit",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        }),
      ),
      node("td", e.title, "eventTitle"),
      node("td", e.calendar),
      node("td", fmt.format((e.end - e.start) / 3600000) + " h"),
    );
    events.append(row);
  }
  const eventwrap = node("div", undefined, "tableWrap");
  eventwrap.append(events);
  details.append(eventwrap);
  target.append(details);
  if (!r.count)
    target.append(
      node(
        "p",
        "Nessun evento con orario nel periodo selezionato. Prova un altro intervallo.",
        "hand",
      ),
    );
}
function exportCSV() {
  function csv(x) {
    let s = String(x ?? "");
    if (/^[=+@\-\t\r]/.test(s)) s = "'" + s;
    return '"' + s.replaceAll('"', '""') + '"';
  }
  const rows = [
    ["ChronoCal", demo ? "DATI DI ESEMPIO" : ""],
    ["Dal", report.from, "Al", report.to],
    [
      "Metodo",
      report.merge ? "Tempo senza sovrapposizioni" : "Somma delle durate",
    ],
    ["Calendario", "Eventi", "Ore"],
    ...report.rows.map((c) => [c.name, c.count, fmt.format(c.hours)]),
    ["TOTALE", report.count, fmt.format(report.hours)],
    [],
    ["Inizio", "Fine", "Evento", "Calendario", "Durata ore"],
    ...report.events.map((e) => [
      new Date(e.start).toISOString(),
      new Date(e.end).toISOString(),
      e.title,
      e.calendar,
      fmt.format((e.end - e.start) / 3600000),
    ]),
  ];
  const url = URL.createObjectURL(
    new Blob(
      ["\ufeff" + rows.map((row) => row.map(csv).join(";")).join("\r\n")],
      { type: "text/csv;charset=utf-8" },
    ),
  );
  const a = node("a");
  a.href = url;
  a.download = `ChronoCal-${report.from}-${report.to}${demo ? "-esempio" : ""}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
async function init() {
  try {
    const s = await api("/api/status");
    configured = s.configured;
    provider = s.provider;
    macAvailable = s.macAvailable;
    $("#connect").disabled = !configured;
    $("#configuration").open = false;
    $("#connectMac").disabled = !s.macAvailable;
    $("#accounts").disabled = !s.macAvailable;
    if (provider === "mac") await loadCalendars();
    $("#modeLabel").textContent = "Sul tuo Mac · Accesso di sola lettura";
    if (s.connected && provider !== "mac") {
      $("#connectionNote").textContent = s.offline
        ? "Collegamento Google con rinnovo automatico."
        : "Google collegato, ma senza rinnovo automatico. Ricollega per abilitarlo.";
      await loadCalendars();
    }
    if (new URLSearchParams(location.search).get("auth") === "cancelled")
      error("Accesso annullato. Puoi riprovare con «Collega Google».");
  } catch (e) {
    error(e);
  }
}
init();
