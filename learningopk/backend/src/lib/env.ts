import { config } from "dotenv";
import { z } from "zod";

config();

const schema = z.object({
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.string().url(),
  FRONTEND_ORIGIN: z.string().url(),
  MISTRAL_API_KEY: z.string().min(1).optional().default("not-configured"),
  PORT: z
    .string()
    .regex(/^\d+$/)
    .default("3001")
});

export const env = schema.parse(process.env);
