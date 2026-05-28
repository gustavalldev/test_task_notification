import type {
  Channel,
  DefaultPreference,
  EvaluationInput,
  GlobalPolicy,
  NotificationType,
  QuietHours,
  UserPreferenceOverride
} from "./types.js";

export interface DefaultPreferenceRepository {
  listDefaultPreferences(): Promise<DefaultPreference[]>;
  findDefaultPreference(
    notificationType: NotificationType,
    channel: Channel
  ): Promise<DefaultPreference | null>;
}

export type UpsertUserPreferenceInput = {
  userId: string;
  notificationType: NotificationType;
  channel: Channel;
  enabled: boolean;
};

export interface PreferenceRepository {
  listUserPreferences(userId: string): Promise<UserPreferenceOverride[]>;
  findUserPreference(
    userId: string,
    notificationType: NotificationType,
    channel: Channel
  ): Promise<UserPreferenceOverride | null>;
  upsertUserPreference(input: UpsertUserPreferenceInput): Promise<UserPreferenceOverride>;
  getQuietHours(userId: string): Promise<QuietHours | null>;
  upsertQuietHours(userId: string, quietHours: QuietHours): Promise<QuietHours>;
}

export type CreateGlobalPolicyInput = Omit<GlobalPolicy, "id" | "enabled" | "reason"> & {
  enabled?: boolean;
  reason?: GlobalPolicy["reason"];
};

export interface GlobalPolicyRepository {
  findMatchingPolicies(input: EvaluationInput): Promise<GlobalPolicy[]>;
  createPolicy(input: CreateGlobalPolicyInput): Promise<GlobalPolicy>;
}
