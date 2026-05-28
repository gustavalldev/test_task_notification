export type AppConfig = {
  host: string;
  port: number;
  logLevel: string;
};

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return {
    host: env.HOST ?? "0.0.0.0",
    port: Number(env.PORT ?? 3000),
    logLevel: env.LOG_LEVEL ?? "info"
  };
}
