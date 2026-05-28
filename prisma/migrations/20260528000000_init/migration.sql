CREATE TABLE "UserPreference" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "notificationType" TEXT NOT NULL,
  "channel" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UserPreference_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "QuietHours" (
  "userId" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "startMinute" INTEGER NOT NULL,
  "endMinute" INTEGER NOT NULL,
  "timezone" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "QuietHours_pkey" PRIMARY KEY ("userId")
);

CREATE TABLE "GlobalPolicy" (
  "id" TEXT NOT NULL,
  "notificationType" TEXT,
  "channel" TEXT,
  "region" TEXT,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "reason" TEXT NOT NULL DEFAULT 'blocked_by_global_policy',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GlobalPolicy_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserPreference_userId_notificationType_channel_key"
  ON "UserPreference"("userId", "notificationType", "channel");

CREATE INDEX "UserPreference_userId_idx" ON "UserPreference"("userId");

CREATE INDEX "GlobalPolicy_notificationType_channel_region_idx"
  ON "GlobalPolicy"("notificationType", "channel", "region");
