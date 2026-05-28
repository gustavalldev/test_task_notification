import { describe, expect, it } from "vitest";
import { NotificationPreferencesService } from "../../src/domain/notification-preferences-service.js";
import {
  InMemoryDefaultPreferenceRepository,
  InMemoryGlobalPolicyRepository,
  InMemoryPreferenceRepository
} from "../support/in-memory-repositories.js";

function createSubject() {
  const defaults = new InMemoryDefaultPreferenceRepository();
  const preferences = new InMemoryPreferenceRepository();
  const policies = new InMemoryGlobalPolicyRepository();
  const service = new NotificationPreferencesService(defaults, preferences, policies);

  return { service, defaults, preferences, policies };
}

describe("NotificationPreferencesService", () => {
  it("returns default preferences for a new user", async () => {
    const { service } = createSubject();

    const snapshot = await service.getPreferences("user-1");

    expect(snapshot.quietHours).toBeNull();
    expect(snapshot.preferences).toContainEqual({
      notificationType: "transactional_email",
      channel: "email",
      enabled: true,
      source: "default"
    });
    expect(snapshot.preferences).toContainEqual({
      notificationType: "marketing_email",
      channel: "email",
      enabled: false,
      source: "default"
    });
  });

  it("applies user preference changes without changing unrelated defaults", async () => {
    const { service } = createSubject();

    await service.updatePreferences("user-1", {
      preferences: [
        {
          notificationType: "marketing_email",
          channel: "email",
          enabled: false
        }
      ]
    });

    const snapshot = await service.getPreferences("user-1");

    expect(snapshot.preferences).toContainEqual({
      notificationType: "marketing_email",
      channel: "email",
      enabled: false,
      source: "user"
    });
    expect(snapshot.preferences).toContainEqual({
      notificationType: "transactional_email",
      channel: "email",
      enabled: true,
      source: "default"
    });
  });

  it("blocks suppressible notifications during quiet hours in the user's timezone", async () => {
    const { service } = createSubject();

    await service.updatePreferences("user-1", {
      quietHours: {
        enabled: true,
        startMinute: 22 * 60,
        endMinute: 8 * 60,
        timezone: "Europe/Moscow"
      }
    });

    const marketingDecision = await service.evaluate({
      userId: "user-1",
      notificationType: "marketing_push",
      channel: "push",
      region: "EU",
      datetime: "2026-05-21T20:30:00Z"
    });
    const transactionalDecision = await service.evaluate({
      userId: "user-1",
      notificationType: "transactional_push",
      channel: "push",
      region: "EU",
      datetime: "2026-05-21T20:30:00Z"
    });

    expect(marketingDecision).toEqual({
      decision: "deny",
      reason: "blocked_by_quiet_hours"
    });
    expect(transactionalDecision).toEqual({
      decision: "allow",
      reason: "allowed"
    });
  });

  it("applies global policies before user preferences", async () => {
    const { service, policies } = createSubject();

    await service.updatePreferences("user-1", {
      preferences: [
        {
          notificationType: "marketing_sms",
          channel: "sms",
          enabled: true
        }
      ]
    });
    await policies.createPolicy({
      notificationType: "marketing_sms",
      channel: "sms",
      region: "EU"
    });

    const euDecision = await service.evaluate({
      userId: "user-1",
      notificationType: "marketing_sms",
      channel: "sms",
      region: "EU",
      datetime: "2026-05-21T21:30:00Z"
    });
    const usDecision = await service.evaluate({
      userId: "user-1",
      notificationType: "marketing_sms",
      channel: "sms",
      region: "US",
      datetime: "2026-05-21T21:30:00Z"
    });

    expect(euDecision).toEqual({
      decision: "deny",
      reason: "blocked_by_global_policy"
    });
    expect(usDecision).toEqual({
      decision: "allow",
      reason: "allowed"
    });
  });

  it("validates evaluation datetimes before making a decision", async () => {
    const { service } = createSubject();

    await expect(
      service.evaluate({
        userId: "user-1",
        notificationType: "transactional_email",
        channel: "email",
        region: "EU",
        datetime: "not-a-date"
      })
    ).rejects.toThrow("datetime must be a valid ISO-8601 timestamp");
  });

  it("updates preferences idempotently", async () => {
    const { service, preferences } = createSubject();
    const command = {
      preferences: [
        {
          notificationType: "marketing_email" as const,
          channel: "email" as const,
          enabled: false
        }
      ]
    };

    await service.updatePreferences("user-1", command);
    await service.updatePreferences("user-1", command);

    const snapshot = await service.getPreferences("user-1");

    expect(preferences.countUserPreferenceRows("user-1")).toBe(1);
    expect(snapshot.preferences).toContainEqual({
      notificationType: "marketing_email",
      channel: "email",
      enabled: false,
      source: "user"
    });
  });
});
