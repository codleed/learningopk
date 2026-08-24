import { eq } from "drizzle-orm";

import { db } from "../lib/db/index.js";
import { aiContext } from "../lib/db/schema.js";

/** Maximum number of items allowed in weak_topics and strong_topics arrays. */
const MAX_TOPICS = 20;

/** Maximum number of items allowed in last_concepts_discussed array. */
const MAX_LAST_CONCEPTS = 10;

export type AiContextRow = typeof aiContext.$inferSelect;

export type AiContextUpdate = {
  weakTopics: string[];
  strongTopics: string[];
  preferredExplanationStyle: string;
  lastConceptsDiscussed: string[];
};

export class AiContextRepository {
  async findByUserId(userId: string): Promise<AiContextRow | null> {
    const rows = await db.select().from(aiContext).where(eq(aiContext.userId, userId)).limit(1);

    return rows[0] ?? null;
  }

  async upsertContext(userId: string, data: Partial<AiContextUpdate>): Promise<AiContextRow> {
    const now = new Date();

    const rows = await db
      .insert(aiContext)
      .values({
        userId,
        ...(data.weakTopics !== undefined && { weakTopics: data.weakTopics.slice(0, MAX_TOPICS) }),
        ...(data.strongTopics !== undefined && {
          strongTopics: data.strongTopics.slice(0, MAX_TOPICS),
        }),
        ...(data.preferredExplanationStyle !== undefined && {
          preferredExplanationStyle: data.preferredExplanationStyle,
        }),
        ...(data.lastConceptsDiscussed !== undefined && {
          lastConceptsDiscussed: data.lastConceptsDiscussed.slice(0, MAX_LAST_CONCEPTS),
        }),
        updatedAt: now,
        createdAt: now,
      })
      .onConflictDoUpdate({
        target: aiContext.userId,
        set: {
          ...(data.weakTopics !== undefined && {
            weakTopics: data.weakTopics.slice(0, MAX_TOPICS),
          }),
          ...(data.strongTopics !== undefined && {
            strongTopics: data.strongTopics.slice(0, MAX_TOPICS),
          }),
          ...(data.preferredExplanationStyle !== undefined && {
            preferredExplanationStyle: data.preferredExplanationStyle,
          }),
          ...(data.lastConceptsDiscussed !== undefined && {
            lastConceptsDiscussed: data.lastConceptsDiscussed.slice(0, MAX_LAST_CONCEPTS),
          }),
          updatedAt: now,
        },
      })
      .returning();

    // Safe assertion — upsert always returns at least one row
    return rows[0] as AiContextRow;
  }

  async addWeakTopic(userId: string, topic: string): Promise<void> {
    const normalizedTopic = topic.trim().toLowerCase();
    if (normalizedTopic.length === 0) return;

    const existing = await this.findByUserId(userId);
    if (!existing) {
      await this.upsertContext(userId, { weakTopics: [normalizedTopic] });
      return;
    }

    const currentTopics = existing.weakTopics;
    if (currentTopics.includes(normalizedTopic)) return;
    if (currentTopics.length >= MAX_TOPICS) return;

    const updatedTopics = [...currentTopics, normalizedTopic];
    await db
      .update(aiContext)
      .set({ weakTopics: updatedTopics, updatedAt: new Date() })
      .where(eq(aiContext.userId, userId));
  }

  async removeWeakTopic(userId: string, topic: string): Promise<void> {
    const normalizedTopic = topic.trim().toLowerCase();
    const existing = await this.findByUserId(userId);
    if (!existing) return;

    const updatedTopics = existing.weakTopics.filter((t) => t !== normalizedTopic);
    await db
      .update(aiContext)
      .set({ weakTopics: updatedTopics, updatedAt: new Date() })
      .where(eq(aiContext.userId, userId));
  }

  async addStrongTopic(userId: string, topic: string): Promise<void> {
    const normalizedTopic = topic.trim().toLowerCase();
    if (normalizedTopic.length === 0) return;

    const existing = await this.findByUserId(userId);
    if (!existing) {
      await this.upsertContext(userId, { strongTopics: [normalizedTopic] });
      return;
    }

    const currentTopics = existing.strongTopics;
    if (currentTopics.includes(normalizedTopic)) return;
    if (currentTopics.length >= MAX_TOPICS) return;

    const updatedTopics = [...currentTopics, normalizedTopic];
    await db
      .update(aiContext)
      .set({ strongTopics: updatedTopics, updatedAt: new Date() })
      .where(eq(aiContext.userId, userId));
  }

  async removeStrongTopic(userId: string, topic: string): Promise<void> {
    const normalizedTopic = topic.trim().toLowerCase();
    const existing = await this.findByUserId(userId);
    if (!existing) return;

    const updatedTopics = existing.strongTopics.filter((t) => t !== normalizedTopic);
    await db
      .update(aiContext)
      .set({ strongTopics: updatedTopics, updatedAt: new Date() })
      .where(eq(aiContext.userId, userId));
  }

  async updateLastConcepts(userId: string, concepts: string[]): Promise<void> {
    const normalizedConcepts = concepts
      .map((c) => c.trim().toLowerCase())
      .filter((c) => c.length > 0)
      .slice(0, MAX_LAST_CONCEPTS);

    if (normalizedConcepts.length === 0) return;

    const existing = await this.findByUserId(userId);
    if (!existing) {
      await this.upsertContext(userId, { lastConceptsDiscussed: normalizedConcepts });
      return;
    }

    // Merge with existing — newest first, deduplicated, capped
    const merged = [...new Set([...normalizedConcepts, ...existing.lastConceptsDiscussed])].slice(
      0,
      MAX_LAST_CONCEPTS
    );
    await db
      .update(aiContext)
      .set({ lastConceptsDiscussed: merged, updatedAt: new Date() })
      .where(eq(aiContext.userId, userId));
  }

  async updatePreferredStyle(userId: string, style: string): Promise<void> {
    const trimmedStyle = style.trim().toLowerCase();
    if (trimmedStyle.length === 0) return;

    const existing = await this.findByUserId(userId);
    if (!existing) {
      await this.upsertContext(userId, { preferredExplanationStyle: trimmedStyle });
      return;
    }

    await db
      .update(aiContext)
      .set({ preferredExplanationStyle: trimmedStyle, updatedAt: new Date() })
      .where(eq(aiContext.userId, userId));
  }
}

export const aiContextRepository = new AiContextRepository();
