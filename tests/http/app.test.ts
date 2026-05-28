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

  it("applies repeated preference updates idempotently", async () => {
    app = createTestApp();
    const payload = {
      preferences: [
        {
          notificationType: "marketing_email",
          channel: "email",
          enabled: false
        }
      ],
      quietHours: {
        enabled: true,
        start: "22:00",
        end: "08:00",
        timezone: "Europe/Moscow"
      }
    };

    const firstResponse = await app.inject({
      method: "POST",
      url: "/users/user-1/preferences",
      payload
    });
    const secondResponse = await app.inject({
      method: "POST",
      url: "/users/user-1/preferences",
      payload
    });

    expect(firstResponse.statusCode).toBe(200);
    expect(secondResponse.statusCode).toBe(200);
    expect(secondResponse.json()).toEqual(firstResponse.json());
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
    expect(evaluateResponse.json()).toMatchObject({
      error: "validation_error",
      message: "Request validation failed",
      fields: [
        {
          path: "region",
          code: "invalid_enum_value"
        }
      ]
    });
  });

  it("returns the OpenAPI document", async () => {
    app = createTestApp();

    const response = await app.inject({
      method: "GET",
      url: "/openapi.json"
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      openapi: "3.1.0",
      paths: {
        "/evaluate": expect.any(Object),
        "/users/{id}/preferences": expect.any(Object)
      }
    });
  });
});
