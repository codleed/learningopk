import { eq } from "drizzle-orm";

import { db } from "../lib/db/index.js";
import { adminSettings } from "../lib/db/schema.js";

export class AdminSettingsRepository {
  async findByKeys(keys: string[]) {
    if (keys.length === 0) {
      return [] as Array<{ key: string; value: string }>;
    }

    const results: Array<{ key: string; value: string }> = [];
    for (const key of keys) {
      const rows = await db
        .select({
          key: adminSettings.key,
          value: adminSettings.value,
        })
        .from(adminSettings)
        .where(eq(adminSettings.key, key))
        .limit(1);

      const row = rows[0];
      if (row) {
        results.push(row);
      }
    }

    return results;
  }
}

export const adminSettingsRepository = new AdminSettingsRepository();
