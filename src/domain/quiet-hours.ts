import { DateTime } from "luxon";
import { DomainValidationError } from "./errors.js";
import type { QuietHours } from "./types.js";

const minutesPerDay = 24 * 60;

export function parseTimeToMinute(value: string): number {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);

  if (!match) {
    throw new DomainValidationError("Time must use HH:mm 24-hour format");
  }

  return Number(match[1]) * 60 + Number(match[2]);
}

export function validateQuietHours(quietHours: QuietHours): void {
  if (
    !Number.isInteger(quietHours.startMinute) ||
    !Number.isInteger(quietHours.endMinute) ||
    quietHours.startMinute < 0 ||
    quietHours.startMinute >= minutesPerDay ||
    quietHours.endMinute < 0 ||
    quietHours.endMinute >= minutesPerDay
  ) {
    throw new DomainValidationError("Quiet hours boundaries must be valid day minutes");
  }

  if (quietHours.startMinute === quietHours.endMinute) {
    throw new DomainValidationError("Quiet hours start and end must be different");
  }

  const zonedNow = DateTime.now().setZone(quietHours.timezone);
  if (!zonedNow.isValid) {
    throw new DomainValidationError(`Invalid timezone: ${quietHours.timezone}`);
  }
}

export function isInQuietHours(datetime: string, quietHours: QuietHours): boolean {
  validateQuietHours(quietHours);

  if (!quietHours.enabled) {
    return false;
  }

  const instant = parseEvaluationDatetime(datetime);
  const zoned = instant.setZone(quietHours.timezone);
  const minute = zoned.hour * 60 + zoned.minute;

  if (quietHours.startMinute < quietHours.endMinute) {
    return minute >= quietHours.startMinute && minute < quietHours.endMinute;
  }

  return minute >= quietHours.startMinute || minute < quietHours.endMinute;
}

export function validateEvaluationDatetime(datetime: string): void {
  parseEvaluationDatetime(datetime);
}

function parseEvaluationDatetime(datetime: string): DateTime {
  const instant = DateTime.fromISO(datetime, { setZone: true });
  if (!instant.isValid) {
    throw new DomainValidationError("datetime must be a valid ISO-8601 timestamp");
  }

  return instant;
}
