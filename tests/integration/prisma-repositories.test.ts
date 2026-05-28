import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { NotificationPreferencesService } from "../../src/domain/notification-preferences-service.js";
import { createPrismaClient } from "../../src/infrastructure/prisma/client.js";
import { PrismaDefaultPreferenceRepository } from "../../src/infrastructure/prisma/prisma-default-preference-repository.js";
import { PrismaGlobalPolicyRepository } from "../../src/infrastructure/prisma/prisma-global-policy-repository.js";
import { PrismaPreferenceRepository } from "../../src/infrastructure/prisma/prisma-preference-repository.js";

function getIntegrationDatabaseUrl(): string {
  const databaseUrl = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      "TEST_DATABASE_URL or DATABASE_URL is required for integration tests"
    );
  }

  return databaseUrl;
}

async function cleanMutableTables(prisma: PrismaClient): Promise<void> {
  await prisma.globalPolicy.deleteMany();
  await prisma.userPreference.deleteMany();
  await prisma.quietHours.deleteMany();
}

describe("Prisma repositories", () => {
  let prisma: PrismaClient;
  let service: NotificationPreferencesService;

  beforeAll(async () => {
    prisma = createPrismaClient(getIntegrationDatabaseUrl());
    service = new NotificationPreferencesService(
      new PrismaDefaultPreferenceRepository(prisma),
      new PrismaPreferenceRepository(prisma),
      new PrismaGlobalPolicyRepository(prisma)
    );

    await prisma.$connect();
  });

  beforeEach(async () => {
    await cleanMutableTables(prisma);
  });

  afterAll(async () => {
    await cleanMutableTables(prisma);
    await prisma.$disconnect();
  });

  it("reads seeded defaults from PostgreSQL and upserts user overrides idempotently", async () => {
    const userId = "integration-user-defaults";

    const defaults = await service.getPreferences(userId);

    expect(defaults.preferences).toContainEqual({
      notificationType: "marketing_email",
      channel: "email",
      enabled: false,
      source: "default"
    });
    expect(defaults.preferences).toContainEqual({
      notificationType: "marketing_messenger",
      channel: "messenger",
      enabled: true,
      source: "default"
    });

    const command = {
      preferences: [
        {
          notificationType: "marketing_email" as const,
          channel: "email" as const,
          enabled: true
        }
      ]
    };

    await service.updatePreferences(userId, command);
    await service.updatePreferences(userId, command);

    await expect(
      prisma.userPreference.count({
        where: {
          userId,
          notificationType: "marketing_email",
          channel: "email"
        }
      })
    ).resolves.toBe(1);

    await expect(
      service.evaluate({
        userId,
        notificationType: "marketing_email",
        channel: "email",
        region: "EU",
        datetime: "2026-05-21T21:30:00Z"
      })
    ).resolves.toEqual({
      decision: "allow",
      reason: "allowed"
    });
  });

  it("applies global policies and quiet hours through PostgreSQL-backed repositories", async () => {
    const userId = "integration-user-evaluate";

    await service.updatePreferences(userId, {
      preferences: [
        {
          notificationType: "marketing_sms",
          channel: "sms",
          enabled: true
        }
      ],
      quietHours: {
        enabled: true,
        startMinute: 22 * 60,
        endMinute: 8 * 60,
        timezone: "Europe/Moscow"
      }
    });
    await service.createGlobalPolicy({
      notificationType: "marketing_sms",
      channel: "sms",
      region: "EU"
    });

    await expect(
      service.evaluate({
        userId,
        notificationType: "marketing_sms",
        channel: "sms",
        region: "EU",
        datetime: "2026-05-21T21:30:00Z"
      })
    ).resolves.toEqual({
      decision: "deny",
      reason: "blocked_by_global_policy"
    });

    await expect(
      service.evaluate({
        userId,
        notificationType: "marketing_push",
        channel: "push",
        region: "US",
        datetime: "2026-05-21T20:30:00Z"
      })
    ).resolves.toEqual({
      decision: "deny",
      reason: "blocked_by_quiet_hours"
    });
  });

  it("enforces database constraints for invalid notification pairs and regions", async () => {
    await expect(
      prisma.userPreference.create({
        data: {
          userId: "integration-user-constraints",
          notificationType: "marketing_email",
          channel: "sms",
          enabled: true
        }
      })
    ).rejects.toThrow();

    await expect(
      prisma.globalPolicy.create({
        data: {
          notificationType: "marketing_sms",
          channel: "sms",
          region: "Europe",
          enabled: true
        }
      })
    ).rejects.toThrow();
  });
});
