import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { betterAuth } from "better-auth";

import { db } from "./db/index.js";
import { accounts, sessions, users, verifications } from "./db/schema.js";
import { env } from "./env.js";

export const auth = betterAuth({
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  trustedOrigins: [env.FRONTEND_ORIGIN],
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: users,
      session: sessions,
      account: accounts,
      verification: verifications
    }
  }),
  user: {
    additionalFields: {
      class: {
        type: "string",
        required: false
      },
      degree: {
        type: "string",
        required: false
      },
      board: {
        type: "string",
        required: false
      },
      role: {
        type: "string",
        required: false,
        input: false
      }
    }
  },
  emailAndPassword: {
    enabled: true,
    autoSignIn: true
  }
});

export type Session = typeof auth.$Infer.Session;
