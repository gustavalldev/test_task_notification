export const openApiDocument = {
  openapi: "3.1.0",
  info: {
    title: "Notification Preferences Service",
    version: "1.0.0",
    description:
      "REST API for user notification preferences, quiet hours, and send evaluation."
  },
  paths: {
    "/health": {
      get: {
        summary: "Health check",
        responses: {
          "200": {
            description: "Service is healthy"
          }
        }
      }
    },
    "/users/{id}/preferences": {
      get: {
        summary: "Get user preferences",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" }
          }
        ],
        responses: {
          "200": {
            description: "Merged defaults, user overrides, and quiet hours",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/PreferencesSnapshot" }
              }
            }
          }
        }
      },
      post: {
        summary: "Update user preferences and quiet hours",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" }
          }
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UpdatePreferencesRequest" }
            }
          }
        },
        responses: {
          "200": {
            description: "Updated preference snapshot",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/PreferencesSnapshot" }
              }
            }
          },
          "400": {
            description: "Validation error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" }
              }
            }
          }
        }
      }
    },
    "/evaluate": {
      post: {
        summary: "Evaluate whether a notification can be sent",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/EvaluateRequest" }
            }
          }
        },
        responses: {
          "200": {
            description: "Send decision",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/EvaluateResponse" }
              }
            }
          },
          "400": {
            description: "Validation error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" }
              }
            }
          }
        }
      }
    },
    "/policies": {
      post: {
        summary: "Create a global deny policy",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreatePolicyRequest" }
            }
          }
        },
        responses: {
          "201": {
            description: "Created policy",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/GlobalPolicy" }
              }
            }
          },
          "400": {
            description: "Validation error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" }
              }
            }
          }
        }
      }
    },
    "/openapi.json": {
      get: {
        summary: "OpenAPI document",
        responses: {
          "200": {
            description: "OpenAPI 3.1 document"
          }
        }
      }
    }
  },
  components: {
    schemas: {
      Channel: {
        type: "string",
        enum: ["email", "sms", "push", "messenger"]
      },
      NotificationType: {
        type: "string",
        enum: [
          "transactional_email",
          "transactional_sms",
          "transactional_push",
          "transactional_messenger",
          "marketing_email",
          "marketing_sms",
          "marketing_push",
          "marketing_messenger"
        ]
      },
      Region: {
        type: "string",
        enum: ["EU", "US", "UK", "CA", "APAC", "LATAM", "MEA"]
      },
      EvaluationReason: {
        type: "string",
        enum: [
          "allowed",
          "blocked_by_global_policy",
          "blocked_by_user_preference",
          "blocked_by_default",
          "blocked_by_quiet_hours"
        ]
      },
      Preference: {
        type: "object",
        required: ["notificationType", "channel", "enabled", "source"],
        properties: {
          notificationType: { $ref: "#/components/schemas/NotificationType" },
          channel: { $ref: "#/components/schemas/Channel" },
          enabled: { type: "boolean" },
          source: { type: "string", enum: ["default", "user"] }
        }
      },
      QuietHours: {
        type: "object",
        required: ["enabled", "start", "end", "timezone"],
        properties: {
          enabled: { type: "boolean" },
          start: { type: "string", pattern: "^([01]\\d|2[0-3]):[0-5]\\d$" },
          end: { type: "string", pattern: "^([01]\\d|2[0-3]):[0-5]\\d$" },
          timezone: { type: "string", example: "Europe/Moscow" }
        }
      },
      PreferencesSnapshot: {
        type: "object",
        required: ["userId", "preferences", "quietHours"],
        properties: {
          userId: { type: "string" },
          preferences: {
            type: "array",
            items: { $ref: "#/components/schemas/Preference" }
          },
          quietHours: {
            anyOf: [{ $ref: "#/components/schemas/QuietHours" }, { type: "null" }]
          }
        }
      },
      UpdatePreferencesRequest: {
        type: "object",
        properties: {
          preferences: {
            type: "array",
            items: {
              type: "object",
              required: ["notificationType", "channel", "enabled"],
              properties: {
                notificationType: {
                  $ref: "#/components/schemas/NotificationType"
                },
                channel: { $ref: "#/components/schemas/Channel" },
                enabled: { type: "boolean" }
              }
            }
          },
          quietHours: { $ref: "#/components/schemas/QuietHours" }
        }
      },
      EvaluateRequest: {
        type: "object",
        required: ["userId", "notificationType", "channel", "region", "datetime"],
        properties: {
          userId: { type: "string" },
          notificationType: { $ref: "#/components/schemas/NotificationType" },
          channel: { $ref: "#/components/schemas/Channel" },
          region: { $ref: "#/components/schemas/Region" },
          datetime: {
            type: "string",
            format: "date-time",
            example: "2026-05-21T21:30:00Z"
          }
        }
      },
      EvaluateResponse: {
        type: "object",
        required: ["decision", "reason"],
        properties: {
          decision: { type: "string", enum: ["allow", "deny"] },
          reason: { $ref: "#/components/schemas/EvaluationReason" }
        }
      },
      CreatePolicyRequest: {
        type: "object",
        properties: {
          notificationType: {
            anyOf: [{ $ref: "#/components/schemas/NotificationType" }, { type: "null" }]
          },
          channel: {
            anyOf: [{ $ref: "#/components/schemas/Channel" }, { type: "null" }]
          },
          region: {
            anyOf: [{ $ref: "#/components/schemas/Region" }, { type: "null" }]
          },
          enabled: { type: "boolean", default: true },
          reason: {
            type: "string",
            enum: ["blocked_by_global_policy"],
            default: "blocked_by_global_policy"
          }
        }
      },
      GlobalPolicy: {
        allOf: [
          { $ref: "#/components/schemas/CreatePolicyRequest" },
          {
            type: "object",
            required: ["id", "enabled", "reason"],
            properties: {
              id: { type: "string" }
            }
          }
        ]
      },
      ErrorResponse: {
        type: "object",
        required: ["error", "message"],
        properties: {
          error: { type: "string" },
          message: { type: "string" },
          fields: {
            type: "array",
            items: {
              type: "object",
              required: ["path", "message", "code"],
              properties: {
                path: { type: "string" },
                message: { type: "string" },
                code: { type: "string" }
              }
            }
          }
        }
      }
    }
  }
} as const;
