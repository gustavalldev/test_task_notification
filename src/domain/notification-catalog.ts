import { DomainValidationError } from "./errors.js";
import type { Channel, NotificationType } from "./types.js";

const channelByNotificationType: Record<NotificationType, Channel> = {
  transactional_email: "email",
  transactional_sms: "sms",
  transactional_push: "push",
  transactional_messenger: "messenger",
  marketing_email: "email",
  marketing_sms: "sms",
  marketing_push: "push",
  marketing_messenger: "messenger"
};

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

export function isSuppressibleByQuietHours(notificationType: NotificationType): boolean {
  return notificationType.startsWith("marketing_");
}
