import { Router } from "express";

import { learnRepository } from "../repositories/learn.repository.js";

export const subjectsRouter = Router();

subjectsRouter.get("/", async (_req, res) => {
  try {
    const allSubjects = await learnRepository.findAllSubjects();

    res.json({ subjects: allSubjects });
  } catch (error) {
    console.error("Get subjects error:", error);
    res.status(500).json({ error: "Failed to fetch subjects" });
  }
});