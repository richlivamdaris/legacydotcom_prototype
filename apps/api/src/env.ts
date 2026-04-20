import "dotenv/config";
import { config as loadEnv } from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: resolve(here, "../.env.local"), override: true });

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.includes("REPLACE_ME")) {
    throw new Error(
      `Missing env var ${name}. Set it in apps/api/.env.local (test-mode values only).`
    );
  }
  return value;
}

export const env = {
  STRIPE_SECRET_KEY: required("STRIPE_SECRET_KEY"),
  STRIPE_WEBHOOK_SECRET: required("STRIPE_WEBHOOK_SECRET"),
  PORT: Number(process.env.PORT ?? 3001),
  WEB_ORIGIN: process.env.WEB_ORIGIN ?? "http://localhost:5173",
};
