import type {
  CreateGlobalPolicyInput,
  GlobalPolicyRepository,
  PreferenceRepository,
  UpsertUserPreferenceInput
} from "../../src/domain/repositories.js";
import type {
  Channel,
  EvaluationInput,
  GlobalPolicy,
  NotificationType,
  QuietHours,
  UserPreferenceOverride
} from "../../src/domain/types.js";

export class InMemoryPreferenceRepository implements PreferenceRepository {
  private readonly preferences = new Map<string, UserPreferenceOverride>();
  private readonly quietHours = new Map<string, QuietHours>();

  async listUserPreferences(userId: string): Promise<UserPreferenceOverride[]> {
    return [...this.preferences.values()].filter((preference) => preference.userId === userId);
  }

  async findUserPreference(
    userId: string,
    notificationType: NotificationType,
    channel: Channel
  ): Promise<UserPreferenceOverride | null> {
    return this.preferences.get(preferenceKey(userId, notificationType, channel)) ?? null;
  }

  async upsertUserPreference(
    input: UpsertUserPreferenceInput
  ): Promise<UserPreferenceOverride> {
    const preference = { ...input };
    this.preferences.set(
      preferenceKey(input.userId, input.notificationType, input.channel),
      preference
    );
    return preference;
  }

  async getQuietHours(userId: string): Promise<QuietHours | null> {
    return this.quietHours.get(userId) ?? null;
  }

  async upsertQuietHours(userId: string, quietHours: QuietHours): Promise<QuietHours> {
    this.quietHours.set(userId, { ...quietHours });
    return quietHours;
  }

  countUserPreferenceRows(userId: string): number {
    return [...this.preferences.values()].filter((preference) => preference.userId === userId)
      .length;
  }
}

export class InMemoryGlobalPolicyRepository implements GlobalPolicyRepository {
  private readonly policies: GlobalPolicy[] = [];
  private nextId = 1;

  async findMatchingPolicies(input: EvaluationInput): Promise<GlobalPolicy[]> {
    return this.policies.filter(
      (policy) =>
        policy.enabled &&
        (policy.notificationType == null ||
          policy.notificationType === input.notificationType) &&
        (policy.channel == null || policy.channel === input.channel) &&
        (policy.region == null || policy.region === input.region)
    );
  }

  async createPolicy(input: CreateGlobalPolicyInput): Promise<GlobalPolicy> {
    const policy: GlobalPolicy = {
      id: String(this.nextId++),
      notificationType: input.notificationType ?? null,
      channel: input.channel ?? null,
      region: input.region ?? null,
      enabled: input.enabled ?? true,
      reason: input.reason ?? "blocked_by_global_policy"
    };

    this.policies.push(policy);
    return policy;
  }
}

function preferenceKey(
  userId: string,
  notificationType: NotificationType,
  channel: Channel
): string {
  return `${userId}:${notificationType}:${channel}`;
}
