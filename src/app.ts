import Fastify, { type FastifyBaseLogger, type FastifyInstance } from "fastify";
import { ZodError, z, type ZodIssue } from "zod";
import { channels, notificationTypes, regions } from "./domain/types.js";
import type {
  EvaluationResult,
  PreferencesSnapshot,
  QuietHours
} from "./domain/types.js";
import { DomainValidationError } from "./domain/errors.js";
import { parseTimeToMinute } from "./domain/quiet-hours.js";
import { NotificationPreferencesService } from "./domain/notification-preferences-service.js";
import { createPrismaClient } from "./infrastructure/prisma/client.js";
import { PrismaDefaultPreferenceRepository } from "./infrastructure/prisma/prisma-default-preference-repository.js";
import { PrismaGlobalPolicyRepository } from "./infrastructure/prisma/prisma-global-policy-repository.js";
import { PrismaPreferenceRepository } from "./infrastructure/prisma/prisma-preference-repository.js";
import { openApiDocument } from "./openapi.js";

type AppOptions = {
  service?: NotificationPreferencesService;
  logger?: boolean | { level?: string };
};

const paramsWithUserIdSchema = z.object({
  id: z.string().min(1)
});

const notificationTypeSchema = z.enum(notificationTypes);
const channelSchema = z.enum(channels);
const regionSchema = z.preprocess(
  (value) => (typeof value === "string" ? value.trim().toUpperCase() : value),
  z.enum(regions)
);

const quietHoursApiSchema = z.object({
  enabled: z.boolean(),
  start: z.string(),
  end: z.string(),
  timezone: z.string().min(1)
});

const updatePreferencesSchema = z.object({
  preferences: z
    .array(
      z.object({
        notificationType: notificationTypeSchema,
        channel: channelSchema,
        enabled: z.boolean()
      })
    )
    .optional(),
  quietHours: quietHoursApiSchema.optional()
});

const evaluateSchema = z.object({
  userId: z.string().min(1),
  notificationType: notificationTypeSchema,
  channel: channelSchema,
  region: regionSchema,
  datetime: z.string().min(1)
});

const createPolicySchema = z.object({
  notificationType: notificationTypeSchema.nullable().optional(),
  channel: channelSchema.nullable().optional(),
  region: regionSchema.nullable().optional(),
  enabled: z.boolean().optional(),
  reason: z.literal("blocked_by_global_policy").optional()
});

export function createApp(options: AppOptions = {}): FastifyInstance {
  const app = Fastify({
    logger: options.logger ?? true
  });

  let service = options.service;
  const prisma = service ? null : createPrismaClient();

  if (!service) {
    service = new NotificationPreferencesService(
      new PrismaDefaultPreferenceRepository(prisma!),
      new PrismaPreferenceRepository(prisma!),
      new PrismaGlobalPolicyRepository(prisma!)
    );
  }

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ZodError) {
      reply.status(400).send({
        error: "validation_error",
        message: "Request validation failed",
        fields: formatZodIssues(error.issues)
      });
      return;
    }

    if (error instanceof DomainValidationError) {
      reply.status(400).send({
        error: "validation_error",
        message: error.message,
        fields: []
      });
      return;
    }

    app.log.error({ error }, "Unhandled request error");
    reply.status(500).send({
      error: "internal_server_error",
      message: "Unexpected server error"
    });
  });

  app.addHook("onClose", async () => {
    await prisma?.$disconnect();
  });

  app.get("/health", async () => ({ status: "ok" }));
  app.get("/openapi.json", async () => openApiDocument);

  app.get("/users/:id/preferences", async (request) => {
    const params = paramsWithUserIdSchema.parse(request.params);
    const snapshot = await service.getPreferences(params.id);
    return presentPreferencesSnapshot(snapshot);
  });

  app.post("/users/:id/preferences", async (request) => {
    const params = paramsWithUserIdSchema.parse(request.params);
    const body = updatePreferencesSchema.parse(request.body);
    const snapshot = await service.updatePreferences(params.id, {
      preferences: body.preferences,
      quietHours: body.quietHours ? toQuietHours(body.quietHours) : undefined
    });

    logPreferenceUpdate(request.log, params.id, body);

    return presentPreferencesSnapshot(snapshot);
  });

  app.post("/evaluate", async (request) => {
    const body = evaluateSchema.parse(request.body);
    const result = await service.evaluate(body);

    logEvaluation(request.log, body.userId, body.notificationType, body.channel, result);

    return result;
  });

  app.post("/policies", async (request, reply) => {
    const body = createPolicySchema.parse(request.body);
    const policy = await service.createGlobalPolicy({
      notificationType: body.notificationType,
      channel: body.channel,
      region: body.region,
      enabled: body.enabled,
      reason: body.reason
    });

    request.log.info({ policy }, "Global notification policy created");

    reply.status(201);
    return policy;
  });

  return app;
}

function toQuietHours(input: z.infer<typeof quietHoursApiSchema>): QuietHours {
  return {
    enabled: input.enabled,
    startMinute: parseTimeToMinute(input.start),
    endMinute: parseTimeToMinute(input.end),
    timezone: input.timezone
  };
}

function presentPreferencesSnapshot(snapshot: PreferencesSnapshot) {
  return {
    ...snapshot,
    quietHours: snapshot.quietHours ? presentQuietHours(snapshot.quietHours) : null
  };
}

function presentQuietHours(quietHours: QuietHours) {
  return {
    enabled: quietHours.enabled,
    start: formatMinute(quietHours.startMinute),
    end: formatMinute(quietHours.endMinute),
    timezone: quietHours.timezone
  };
}

function formatMinute(minute: number): string {
  const hours = Math.floor(minute / 60);
  const minutes = minute % 60;
  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}`;
}

function formatZodIssues(issues: ZodIssue[]) {
  return issues.map((issue) => ({
    path: issue.path.length > 0 ? issue.path.map(String).join(".") : "body",
    message: issue.message,
    code: issue.code
  }));
}

function logPreferenceUpdate(
  log: FastifyBaseLogger,
  userId: string,
  body: z.infer<typeof updatePreferencesSchema>
) {
  log.info(
    {
      userId,
      preferencesUpdated: body.preferences?.length ?? 0,
      quietHoursUpdated: Boolean(body.quietHours)
    },
    "Notification preferences updated"
  );
}

function logEvaluation(
  log: FastifyBaseLogger,
  userId: string,
  notificationType: string,
  channel: string,
  result: EvaluationResult
) {
  log.info(
    {
      userId,
      notificationType,
      channel,
      decision: result.decision,
      reason: result.reason
    },
    "Notification send decision evaluated"
  );
}
