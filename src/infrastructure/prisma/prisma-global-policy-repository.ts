import type { PrismaClient } from "@prisma/client";
import type {
  CreateGlobalPolicyInput,
  GlobalPolicyRepository
} from "../../domain/repositories.js";
import type {
  Channel,
  EvaluationInput,
  EvaluationReason,
  GlobalPolicy,
  NotificationType,
  Region
} from "../../domain/types.js";

export class PrismaGlobalPolicyRepository implements GlobalPolicyRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findMatchingPolicies(input: EvaluationInput): Promise<GlobalPolicy[]> {
    const rows = await this.prisma.globalPolicy.findMany({
      where: {
        enabled: true,
        AND: [
          {
            OR: [{ notificationType: null }, { notificationType: input.notificationType }]
          },
          {
            OR: [{ channel: null }, { channel: input.channel }]
          },
          {
            OR: [{ region: null }, { region: input.region }]
          }
        ]
      },
      orderBy: { createdAt: "asc" }
    });

    return rows.map((row) => ({
      id: row.id,
      notificationType: row.notificationType as NotificationType | null,
      channel: row.channel as Channel | null,
      region: row.region as Region | null,
      enabled: row.enabled,
      reason: row.reason as EvaluationReason
    }));
  }

  async createPolicy(input: CreateGlobalPolicyInput): Promise<GlobalPolicy> {
    const row = await this.prisma.globalPolicy.create({
      data: {
        notificationType: input.notificationType ?? null,
        channel: input.channel ?? null,
        region: input.region ?? null,
        enabled: input.enabled ?? true,
        reason: input.reason ?? "blocked_by_global_policy"
      }
    });

    return {
      id: row.id,
      notificationType: row.notificationType as NotificationType | null,
      channel: row.channel as Channel | null,
      region: row.region as Region | null,
      enabled: row.enabled,
      reason: row.reason as EvaluationReason
    };
  }
}
