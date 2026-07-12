import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  formatBookingDateLabel,
  formatBookingTimeLabel,
  formatBookingTimeDebug,
  localDateTimeToUtc,
} from "../lib/bookingTimezone.ts";

function overlaps(a: { startAt: Date; endAt: Date }, b: { startAt: Date; endAt: Date }) {
  return a.startAt < b.endAt && a.endAt > b.startAt;
}

function parisWindow(date: string, start: string, end: string) {
  return {
    startAt: localDateTimeToUtc(date, `${start}:00`),
    endAt: localDateTimeToUtc(date, `${end}:00`),
  };
}

describe("booking timezone conversion", () => {
  it("stores a 09:30 Europe/Paris public booking as the matching UTC instant", () => {
    const scheduledAt = localDateTimeToUtc("2026-07-02", "09:30:00");
    const endAt = localDateTimeToUtc("2026-07-02", "10:30:00");

    assert.equal(scheduledAt.toISOString(), "2026-07-02T07:30:00.000Z");
    assert.equal(endAt.toISOString(), "2026-07-02T08:30:00.000Z");
    assert.equal(formatBookingTimeDebug(scheduledAt), "2026-07-02 09:30:00 Europe/Paris");
    assert.equal(formatBookingTimeDebug(endAt), "2026-07-02 10:30:00 Europe/Paris");
  });

  it("formats stored UTC appointment times for Europe/Paris notifications", () => {
    const scheduledAt = new Date("2026-07-02T08:30:00.000Z");

    assert.equal(formatBookingTimeLabel(scheduledAt), "10:30");
    assert.match(formatBookingDateLabel(scheduledAt), /02 juil\./);
  });

  it("blocks overlapping one-hour slots around a 09:30-10:30 Europe/Paris booking", () => {
    const booked = parisWindow("2026-07-02", "09:30", "10:30");

    assert.equal(overlaps(parisWindow("2026-07-02", "09:00", "10:00"), booked), true);
    assert.equal(overlaps(parisWindow("2026-07-02", "09:30", "10:30"), booked), true);
    assert.equal(overlaps(parisWindow("2026-07-02", "10:00", "11:00"), booked), true);
    assert.equal(overlaps(parisWindow("2026-07-02", "08:00", "09:00"), booked), false);
    assert.equal(overlaps(parisWindow("2026-07-02", "10:30", "11:30"), booked), false);
  });
});
