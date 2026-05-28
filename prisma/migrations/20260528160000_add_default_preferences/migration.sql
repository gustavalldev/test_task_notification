CREATE TABLE "DefaultPreference" (
  "notificationType" TEXT NOT NULL,
  "channel" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DefaultPreference_pkey" PRIMARY KEY ("notificationType", "channel")
);

INSERT INTO "DefaultPreference"
  ("notificationType", "channel", "enabled", "createdAt", "updatedAt")
VALUES
  ('transactional_email', 'email', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('transactional_sms', 'sms', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('transactional_push', 'push', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('transactional_messenger', 'messenger', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('marketing_email', 'email', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('marketing_sms', 'sms', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('marketing_push', 'push', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('marketing_messenger', 'messenger', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

ALTER TABLE "DefaultPreference"
  ADD CONSTRAINT "DefaultPreference_notification_channel_check"
  CHECK (
    ("notificationType" = 'transactional_email' AND "channel" = 'email') OR
    ("notificationType" = 'transactional_sms' AND "channel" = 'sms') OR
    ("notificationType" = 'transactional_push' AND "channel" = 'push') OR
    ("notificationType" = 'transactional_messenger' AND "channel" = 'messenger') OR
    ("notificationType" = 'marketing_email' AND "channel" = 'email') OR
    ("notificationType" = 'marketing_sms' AND "channel" = 'sms') OR
    ("notificationType" = 'marketing_push' AND "channel" = 'push') OR
    ("notificationType" = 'marketing_messenger' AND "channel" = 'messenger')
  );

ALTER TABLE "UserPreference"
  ADD CONSTRAINT "UserPreference_notification_channel_check"
  CHECK (
    ("notificationType" = 'transactional_email' AND "channel" = 'email') OR
    ("notificationType" = 'transactional_sms' AND "channel" = 'sms') OR
    ("notificationType" = 'transactional_push' AND "channel" = 'push') OR
    ("notificationType" = 'transactional_messenger' AND "channel" = 'messenger') OR
    ("notificationType" = 'marketing_email' AND "channel" = 'email') OR
    ("notificationType" = 'marketing_sms' AND "channel" = 'sms') OR
    ("notificationType" = 'marketing_push' AND "channel" = 'push') OR
    ("notificationType" = 'marketing_messenger' AND "channel" = 'messenger')
  );

ALTER TABLE "GlobalPolicy"
  ADD CONSTRAINT "GlobalPolicy_notification_channel_check"
  CHECK (
    "notificationType" IS NULL OR
    "channel" IS NULL OR
    ("notificationType" = 'transactional_email' AND "channel" = 'email') OR
    ("notificationType" = 'transactional_sms' AND "channel" = 'sms') OR
    ("notificationType" = 'transactional_push' AND "channel" = 'push') OR
    ("notificationType" = 'transactional_messenger' AND "channel" = 'messenger') OR
    ("notificationType" = 'marketing_email' AND "channel" = 'email') OR
    ("notificationType" = 'marketing_sms' AND "channel" = 'sms') OR
    ("notificationType" = 'marketing_push' AND "channel" = 'push') OR
    ("notificationType" = 'marketing_messenger' AND "channel" = 'messenger')
  );

ALTER TABLE "GlobalPolicy"
  ADD CONSTRAINT "GlobalPolicy_region_check"
  CHECK ("region" IS NULL OR "region" IN ('EU', 'US', 'UK', 'CA', 'APAC', 'LATAM', 'MEA'));
