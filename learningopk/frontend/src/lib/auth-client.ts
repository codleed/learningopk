import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields } from "better-auth/client/plugins";

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001";

export const authClient = createAuthClient({
  baseURL: backendUrl,
  plugins: [
    inferAdditionalFields({
      user: {
        class: {
          type: "string"
        },
        degree: {
          type: "string"
        },
        board: {
          type: "string"
        }
      }
    })
  ]
});
