import { test } from "node:test";
import assert from "node:assert/strict";
import { summarize } from "../logic.mjs";
const from = Date.parse("2026-10-01T00:00:00+02:00"),
  to = Date.parse("2026-10-02T00:00:00+02:00");
const e = (s, t, extras = {}) => ({
  start: { dateTime: s },
  end: { dateTime: t },
  ...extras,
});
test("clamps events at both boundaries", () =>
  assert.equal(
    summarize(
      [
        e("2026-09-30T23:00:00+02:00", "2026-10-01T01:00:00+02:00"),
        e("2026-10-01T23:00:00+02:00", "2026-10-02T02:00:00+02:00"),
      ],
      from,
      to,
    ).hours,
    2,
  ));
test("union handles nesting and overlap", () => {
  const events = [
    e("2026-10-01T09:00:00+02:00", "2026-10-01T12:00:00+02:00"),
    e("2026-10-01T10:00:00+02:00", "2026-10-01T11:00:00+02:00"),
    e("2026-10-01T11:00:00+02:00", "2026-10-01T13:00:00+02:00"),
  ];
  assert.equal(summarize(events, from, to).hours, 6);
  assert.equal(summarize(events, from, to, true).hours, 4);
});
test("excludes all-day cancelled declined and zero events", () => {
  const r = summarize(
    [
      { start: { date: "2026-10-01" }, end: { date: "2026-10-02" } },
      e("2026-10-01T09:00:00+02:00", "2026-10-01T10:00:00+02:00", {
        status: "cancelled",
      }),
      e("2026-10-01T09:00:00+02:00", "2026-10-01T10:00:00+02:00", {
        attendees: [{ self: true, responseStatus: "declined" }],
      }),
    ],
    from,
    to,
  );
  assert.equal(r.hours, 0);
  assert.equal(r.excluded, 1);
});
test("uses actual elapsed time across DST", () =>
  assert.equal(
    summarize(
      [e("2026-10-25T01:00:00+02:00", "2026-10-25T04:00:00+01:00")],
      Date.parse("2026-10-25T00:00:00+02:00"),
      Date.parse("2026-10-26T00:00:00+01:00"),
    ).hours,
    4,
  ));
