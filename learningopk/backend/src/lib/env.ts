import { config } from "dotenv";
import { z } from "zod";

config();

const schema = z.object({
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.string().url(),
  FRONTEND_ORIGIN: z.string().url(),
  MINIO_ENDPOINT: z.string().min(1).default("localhost"),
  MINIO_PORT: z
    .string()
    .regex(/^\d+$/)
    .default("9000"),
  MINIO_USE_SSL: z.enum(["true", "false"]).default("false"),
  MINIO_ACCESS_KEY: z.string().min(1),
  MINIO_SECRET_KEY: z.string().min(1),
  MINIO_BUCKET: z.string().min(1).default("learningo-media"),
  MINIO_PUBLIC_URL: z.string().url().default("http://localhost:9000"),
  MINIO_BUCKET_IN_PUBLIC_URL: z.enum(["true", "false"]).default("true"),
  MISTRAL_API_KEY: z.string().min(1).optional().default("not-configured"),
  PORT: z
    .string()
    .regex(/^\d+$/)
    .default("3001")
});

export const env = schema.parse(process.env);
