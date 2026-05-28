import { DomainValidationError } from "./errors.js";
import type { Channel, NotificationPreference, NotificationType } from "./types.js";

const channelByNotificationType: Record<NotificationType, Channel> = {
  transactional_email: "email",
  transactional_sms: "sms",
  transactional_push: "push",
  marketing_email: "email",
  marketing_sms: "sms",
  marketing_push: "push"
};

export const defaultPreferences: readonly NotificationPreference[] = [
  {
    notificationType: "transactional_email",
    channel: "email",
    enabled: true,
    source: "default"
  },
  {
    notificationType: "transactional_sms",
    channel: "sms",
    enabled: true,
    source: "default"
  },
  {
    notificationType: "transactional_push",
    channel: "push",
    enabled: true,
    source: "default"
  },
  {
    notificationType: "marketing_email",
    channel: "email",
    enabled: false,
    source: "default"
  },
  {
    notificationType: "marketing_sms",
    channel: "sms",
    enabled: false,
    source: "default"
  },
  {
    notificationType: "marketing_push",
    channel: "push",
    enabled: true,
    source: "default"
  }
];

export function assertSupportedNotificationPair(
  notificationType: NotificationType,
  channel: Channel
): void {
  if (channelByNotificationType[notificationType] !== channel) {
    throw new DomainValidationError(
      `Notification type ${notificationType} cannot be sent through ${channel}`
    );
  }
}

export function getDefaultPreference(
  notificationType: NotificationType,
  channel: Channel
): NotificationPreference {
  assertSupportedNotificationPair(notificationType, channel);

  const preference = defaultPreferences.find(
    (item) => item.notificationType === notificationType && item.channel === channel
  );

  if (!preference) {
    throw new DomainValidationError(
      `No default preference configured for ${notificationType}/${channel}`
    );
  }

  return preference;
}

export function isSuppressibleByQuietHours(notificationType: NotificationType): boolean {
  return notificationType.startsWith("marketing_");
}
