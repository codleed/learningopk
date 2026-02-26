import { toNodeHandler } from "better-auth/node";
import { Router } from "express";

import { auth } from "../lib/auth.js";

export const authRouter = Router();

authRouter.all("/*splat", toNodeHandler(auth));
