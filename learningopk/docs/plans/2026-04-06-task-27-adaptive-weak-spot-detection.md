# TASK-27 Adaptive Weak-Spot Detection Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add historical weak-spot detection per subject, surface it on the dashboard with exercise links, and feed the same weak areas into AI tutor context.

**Architecture:** Compute weak areas on read from existing quiz attempts plus exercise/question content similarity, only once a learner has at least three attempts in a subject. Expose the ranked results through the dashboard summary payload and reuse them in AI tutor context/system prompt wording.

**Tech Stack:** TypeScript, Express, Drizzle ORM, Zod, Next.js, React
