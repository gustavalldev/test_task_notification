import {
  assertSupportedNotificationPair,
  defaultPreferences,
  getDefaultPreference,
  isSuppressibleByQuietHours
} from "./defaults.js";
import {
  validateEvaluationDatetime,
  validateQuietHours,
  isInQuietHours
} from "./quiet-hours.js";
import type {
  CreateGlobalPolicyInput,
  GlobalPolicyRepository,
  PreferenceRepository
} from "./repositories.js";
import type {
  EvaluationInput,
  EvaluationResult,
  NotificationPreference,
  PreferencesSnapshot,
  QuietHours
} from "./types.js";

export type UpdatePreferencesCommand = {
  preferences?: Array<{
    notificationType: NotificationPreference["notificationType"];
    channel: NotificationPreference["channel"];
    enabled: boolean;
  }>;
  quietHours?: QuietHours;
};

export class NotificationPreferencesService {
  constructor(
    private readonly preferences: PreferenceRepository,
    private readonly policies: GlobalPolicyRepository
  ) {}

  async getPreferences(userId: string): Promise<PreferencesSnapshot> {
    const overrides = await this.preferences.listUserPreferences(userId);
    const quietHours = await this.preferences.getQuietHours(userId);
    const overrideByPair = new Map(
      overrides.map((override) => [
        preferenceKey(override.notificationType, override.channel),
        override
      ])
    );

    const merged = defaultPreferences.map((preference) => {
      const override = overrideByPair.get(
        preferenceKey(preference.notificationType, preference.channel)
      );

      if (!override) {
        return preference;
      }

      return {
        notificationType: preference.notificationType,
        channel: preference.channel,
        enabled: override.enabled,
        source: "user" as const
      };
    });

    return {
      userId,
      preferences: merged,
      quietHours
    };
  }

  async updatePreferences(
    userId: string,
    command: UpdatePreferencesCommand
  ): Promise<PreferencesSnapshot> {
    for (const preference of command.preferences ?? []) {
      assertSupportedNotificationPair(preference.notificationType, preference.channel);
      await this.preferences.upsertUserPreference({
        userId,
        notificationType: preference.notificationType,
        channel: preference.channel,
        enabled: preference.enabled
      });
    }

    if (command.quietHours) {
      validateQuietHours(command.quietHours);
      await this.preferences.upsertQuietHours(userId, command.quietHours);
    }

    return this.getPreferences(userId);
  }

  async evaluate(input: EvaluationInput): Promise<EvaluationResult> {
    assertSupportedNotificationPair(input.notificationType, input.channel);
    validateEvaluationDatetime(input.datetime);

    const matchingPolicies = await this.policies.findMatchingPolicies(input);
    const denyPolicy = matchingPolicies.find((policy) => policy.enabled);
    if (denyPolicy) {
      return {
        decision: "deny",
        reason: denyPolicy.reason
      };
    }

    const override = await this.preferences.findUserPreference(
      input.userId,
      input.notificationType,
      input.channel
    );
    const defaultPreference = getDefaultPreference(input.notificationType, input.channel);
    const enabled = override?.enabled ?? defaultPreference.enabled;

    if (!enabled) {
      return {
        decision: "deny",
        reason: override ? "blocked_by_user_preference" : "blocked_by_default"
      };
    }

    const quietHours = await this.preferences.getQuietHours(input.userId);
    if (
      quietHours &&
      isSuppressibleByQuietHours(input.notificationType) &&
      isInQuietHours(input.datetime, quietHours)
    ) {
      return {
        decision: "deny",
        reason: "blocked_by_quiet_hours"
      };
    }

    return {
      decision: "allow",
      reason: "allowed"
    };
  }

  async createGlobalPolicy(input: CreateGlobalPolicyInput) {
    if (input.notificationType && input.channel) {
      assertSupportedNotificationPair(input.notificationType, input.channel);
    }

    return this.policies.createPolicy(input);
  }
}

function preferenceKey(
  notificationType: NotificationPreference["notificationType"],
  channel: NotificationPreference["channel"]
): string {
  return `${notificationType}:${channel}`;
}
