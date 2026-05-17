import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { betterAuth } from "better-auth";
import { emailOTP } from "better-auth/plugins";

import { db } from "./db/index.js";
import { accounts, sessions, users, verifications } from "./db/schema.js";
import { sendEmail } from "./email.js";
import { env } from "./env.js";
import { logger } from "./logger.js";

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
        required: true
      },
      degree: {
        type: "string",
        required: false
      },
      board: {
        type: "string",
        required: true
      },
      role: {
        type: "string",
        required: false,
        input: false
      },
      schoolId: {
        type: "number",
        required: false,
        input: false
      }
    }
  },
  emailAndPassword: {
    enabled: true,
    autoSignIn: true
  },
  plugins: [
    emailOTP({
      async sendVerificationOTP({ email, otp, type }) {
        void sendEmail({
          to: email,
          subject: type === "email-verification"
            ? "Verify your email - LearningoPK"
            : "Your sign-in code - LearningoPK",
          text: `Your verification code is: ${otp}. It expires in 5 minutes.`,
          html: `<p>Your verification code is: <strong>${otp}</strong></p><p>It expires in 5 minutes.</p>`,
        }).catch((err) => {
          logger.error({ error: err }, "sendVerificationOTP email failed");
        });
      },
      sendVerificationOnSignUp: true,
      otpLength: 6,
      expiresIn: 300,
    }),
  ],
});

export type Session = typeof auth.$Infer.Session;
