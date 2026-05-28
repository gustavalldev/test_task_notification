import type { PrismaClient } from "@prisma/client";
import type {
  PreferenceRepository,
  UpsertUserPreferenceInput
} from "../../domain/repositories.js";
import type {
  Channel,
  NotificationType,
  QuietHours,
  UserPreferenceOverride
} from "../../domain/types.js";

export class PrismaPreferenceRepository implements PreferenceRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async listUserPreferences(userId: string): Promise<UserPreferenceOverride[]> {
    const rows = await this.prisma.userPreference.findMany({
      where: { userId },
      orderBy: [{ notificationType: "asc" }, { channel: "asc" }]
    });

    return rows.map((row) => ({
      userId: row.userId,
      notificationType: row.notificationType as NotificationType,
      channel: row.channel as Channel,
      enabled: row.enabled
    }));
  }

  async findUserPreference(
    userId: string,
    notificationType: NotificationType,
    channel: Channel
  ): Promise<UserPreferenceOverride | null> {
    const row = await this.prisma.userPreference.findUnique({
      where: {
        userId_notificationType_channel: {
          userId,
          notificationType,
          channel
        }
      }
    });

    if (!row) {
      return null;
    }

    return {
      userId: row.userId,
      notificationType: row.notificationType as NotificationType,
      channel: row.channel as Channel,
      enabled: row.enabled
    };
  }

  async upsertUserPreference(
    input: UpsertUserPreferenceInput
  ): Promise<UserPreferenceOverride> {
    const row = await this.prisma.userPreference.upsert({
      where: {
        userId_notificationType_channel: {
          userId: input.userId,
          notificationType: input.notificationType,
          channel: input.channel
        }
      },
      update: {
        enabled: input.enabled
      },
      create: {
        userId: input.userId,
        notificationType: input.notificationType,
        channel: input.channel,
        enabled: input.enabled
      }
    });

    return {
      userId: row.userId,
      notificationType: row.notificationType as NotificationType,
      channel: row.channel as Channel,
      enabled: row.enabled
    };
  }

  async getQuietHours(userId: string): Promise<QuietHours | null> {
    const row = await this.prisma.quietHours.findUnique({
      where: { userId }
    });

    if (!row) {
      return null;
    }

    return {
      enabled: row.enabled,
      startMinute: row.startMinute,
      endMinute: row.endMinute,
      timezone: row.timezone
    };
  }

  async upsertQuietHours(userId: string, quietHours: QuietHours): Promise<QuietHours> {
    const row = await this.prisma.quietHours.upsert({
      where: { userId },
      update: {
        enabled: quietHours.enabled,
        startMinute: quietHours.startMinute,
        endMinute: quietHours.endMinute,
        timezone: quietHours.timezone
      },
      create: {
        userId,
        enabled: quietHours.enabled,
        startMinute: quietHours.startMinute,
        endMinute: quietHours.endMinute,
        timezone: quietHours.timezone
      }
    });

    return {
      enabled: row.enabled,
      startMinute: row.startMinute,
      endMinute: row.endMinute,
      timezone: row.timezone
    };
  }
}
