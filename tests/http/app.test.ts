import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { createApp } from "../../src/app.js";
import { NotificationPreferencesService } from "../../src/domain/notification-preferences-service.js";
import {
  InMemoryDefaultPreferenceRepository,
  InMemoryGlobalPolicyRepository,
  InMemoryPreferenceRepository
} from "../support/in-memory-repositories.js";

function createTestApp(): FastifyInstance {
  const service = new NotificationPreferencesService(
    new InMemoryDefaultPreferenceRepository(),
    new InMemoryPreferenceRepository(),
    new InMemoryGlobalPolicyRepository()
  );

  return createApp({ service, logger: false });
}

let app: FastifyInstance | null = null;

afterEach(async () => {
  await app?.close();
  app = null;
});

describe("HTTP API", () => {
  it("returns defaults and evaluates an updated user preference", async () => {
    app = createTestApp();

    const defaultsResponse = await app.inject({
      method: "GET",
      url: "/users/user-1/preferences"
    });

    expect(defaultsResponse.statusCode).toBe(200);
    expect(defaultsResponse.json().preferences).toContainEqual({
      notificationType: "transactional_email",
      channel: "email",
      enabled: true,
      source: "default"
    });

    const updateResponse = await app.inject({
      method: "POST",
      url: "/users/user-1/preferences",
      payload: {
        preferences: [
          {
            notificationType: "marketing_email",
            channel: "email",
            enabled: true
          }
        ]
      }
    });

    expect(updateResponse.statusCode).toBe(200);
    expect(updateResponse.json().preferences).toContainEqual({
      notificationType: "marketing_email",
      channel: "email",
      enabled: true,
      source: "user"
    });

    const evaluateResponse = await app.inject({
      method: "POST",
      url: "/evaluate",
      payload: {
        userId: "user-1",
        notificationType: "marketing_email",
        channel: "email",
        region: "US",
        datetime: "2026-05-21T21:30:00Z"
      }
    });

    expect(evaluateResponse.statusCode).toBe(200);
    expect(evaluateResponse.json()).toEqual({
      decision: "allow",
      reason: "allowed"
    });
  });

  it("creates a global policy through the API and uses it during evaluation", async () => {
    app = createTestApp();

    const policyResponse = await app.inject({
      method: "POST",
      url: "/policies",
      payload: {
        notificationType: "marketing_sms",
        channel: "sms",
        region: " eu "
      }
    });

    expect(policyResponse.statusCode).toBe(201);
    expect(policyResponse.json().region).toBe("EU");

    const evaluateResponse = await app.inject({
      method: "POST",
      url: "/evaluate",
      payload: {
        userId: "user-1",
        notificationType: "marketing_sms",
        channel: "sms",
        region: "eu",
        datetime: "2026-05-21T21:30:00Z"
      }
    });

    expect(evaluateResponse.statusCode).toBe(200);
    expect(evaluateResponse.json()).toEqual({
      decision: "deny",
      reason: "blocked_by_global_policy"
    });
  });

  it("rejects unsupported regions", async () => {
    app = createTestApp();

    const evaluateResponse = await app.inject({
      method: "POST",
      url: "/evaluate",
      payload: {
        userId: "user-1",
        notificationType: "transactional_email",
        channel: "email",
        region: "Europe",
        datetime: "2026-05-21T21:30:00Z"
      }
    });

    expect(evaluateResponse.statusCode).toBe(400);
    expect(evaluateResponse.json().error).toBe("validation_error");
  });
});
