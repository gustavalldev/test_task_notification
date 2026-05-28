import type { PrismaClient } from "@prisma/client";
import type { DefaultPreferenceRepository } from "../../domain/repositories.js";
import type {
  Channel,
  DefaultPreference,
  NotificationType
} from "../../domain/types.js";

export class PrismaDefaultPreferenceRepository implements DefaultPreferenceRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async listDefaultPreferences(): Promise<DefaultPreference[]> {
    const rows = await this.prisma.defaultPreference.findMany({
      orderBy: [{ notificationType: "asc" }, { channel: "asc" }]
    });

    return rows.map((row) => ({
      notificationType: row.notificationType as NotificationType,
      channel: row.channel as Channel,
      enabled: row.enabled
    }));
  }

  async findDefaultPreference(
    notificationType: NotificationType,
    channel: Channel
  ): Promise<DefaultPreference | null> {
    const row = await this.prisma.defaultPreference.findUnique({
      where: {
        notificationType_channel: {
          notificationType,
          channel
        }
      }
    });

    if (!row) {
      return null;
    }

    return {
      notificationType: row.notificationType as NotificationType,
      channel: row.channel as Channel,
      enabled: row.enabled
    };
  }
}
