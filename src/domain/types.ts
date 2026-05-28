export const channels = ["email", "sms", "push", "messenger"] as const;
export type Channel = (typeof channels)[number];

export const notificationTypes = [
  "transactional_email",
  "transactional_sms",
  "transactional_push",
  "transactional_messenger",
  "marketing_email",
  "marketing_sms",
  "marketing_push",
  "marketing_messenger"
] as const;
export type NotificationType = (typeof notificationTypes)[number];

export const regions = ["EU", "US", "UK", "CA", "APAC", "LATAM", "MEA"] as const;
export type Region = (typeof regions)[number];

export type PreferenceSource = "default" | "user";

export type NotificationPreference = {
  notificationType: NotificationType;
  channel: Channel;
  enabled: boolean;
  source: PreferenceSource;
};

export type DefaultPreference = {
  notificationType: NotificationType;
  channel: Channel;
  enabled: boolean;
};

export type UserPreferenceOverride = {
  userId: string;
  notificationType: NotificationType;
  channel: Channel;
  enabled: boolean;
};

export type QuietHours = {
  enabled: boolean;
  startMinute: number;
  endMinute: number;
  timezone: string;
};

export type GlobalPolicy = {
  id?: string;
  notificationType?: NotificationType | null;
  channel?: Channel | null;
  region?: Region | null;
  enabled: boolean;
  reason: EvaluationReason;
};

export type EvaluationInput = {
  userId: string;
  notificationType: NotificationType;
  channel: Channel;
  region: Region;
  datetime: string;
};

export type EvaluationDecision = "allow" | "deny";

export type EvaluationReason =
  | "allowed"
  | "blocked_by_global_policy"
  | "blocked_by_user_preference"
  | "blocked_by_default"
  | "blocked_by_quiet_hours";

export type EvaluationResult = {
  decision: EvaluationDecision;
  reason: EvaluationReason;
};

export type PreferencesSnapshot = {
  userId: string;
  preferences: NotificationPreference[];
  quietHours: QuietHours | null;
};
