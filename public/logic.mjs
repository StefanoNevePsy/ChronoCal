export function summarize(events, from, to, merge = false) {
  const intervals = [];
  let excluded = 0;
  for (const e of events) {
    if (
      e.status === "cancelled" ||
      e.attendees?.some((a) => a.self && a.responseStatus === "declined")
    )
      continue;
    if (!e.start?.dateTime || !e.end?.dateTime) {
      excluded++;
      continue;
    }
    const start = Math.max(Date.parse(e.start.dateTime), from),
      end = Math.min(Date.parse(e.end.dateTime), to);
    if (end > start)
      intervals.push({
        start,
        end,
        title: e.summary || "Senza titolo",
        calendar: e.calendar,
      });
  }
  const sorted = [...intervals].sort((a, b) => a.start - b.start);
  let duration = 0,
    right = -Infinity;
  for (const i of sorted) {
    duration += merge
      ? Math.max(0, i.end - Math.max(i.start, right))
      : i.end - i.start;
    right = Math.max(right, i.end);
  }
  return {
    hours: duration / 3600000,
    count: intervals.length,
    excluded,
    events: sorted,
  };
}
