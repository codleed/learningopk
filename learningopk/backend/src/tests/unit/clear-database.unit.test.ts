import assert from "node:assert/strict";
import test from "node:test";

import { CLEAR_TABLES, buildClearDatabaseSql } from "../../lib/db/clear-database.js";

test("buildClearDatabaseSql generates a truncate statement with identity reset and cascade", () => {
  const statement = buildClearDatabaseSql();

  assert.match(statement, /^DO \$\$[\s\S]*RESTART IDENTITY CASCADE[\s\S]*END \$\$;$/);
  assert.match(statement, /study_group_activities/);
  assert.match(statement, /formula_access_events/);
  assert.match(statement, /forum_reply_votes/);
  assert.match(statement, /admin_audit_logs/);
  assert.match(statement, /'user'/);
});

test("CLEAR_TABLES includes all critical auth and learning tables without duplicates", () => {
  assert.equal(CLEAR_TABLES.includes("account"), true);
  assert.equal(CLEAR_TABLES.includes("session"), true);
  assert.equal(CLEAR_TABLES.includes("verification"), true);
  assert.equal(CLEAR_TABLES.includes("user"), true);
  assert.equal(CLEAR_TABLES.includes("boards"), true);
  assert.equal(CLEAR_TABLES.includes("board_classes"), true);
  assert.equal(CLEAR_TABLES.includes("quizzes"), true);
  assert.equal(CLEAR_TABLES.includes("forum_threads"), true);
  assert.equal(CLEAR_TABLES.includes("chapter_summary_media"), true);
  assert.equal(CLEAR_TABLES.includes("revision_notes"), true);
  assert.equal(CLEAR_TABLES.includes("flashcard_reviews"), true);
  assert.equal(CLEAR_TABLES.includes("formulas"), true);
  assert.equal(CLEAR_TABLES.includes("user_starred_formulas"), true);
  assert.equal(CLEAR_TABLES.includes("formula_access_events"), true);
  assert.equal(CLEAR_TABLES.includes("exam_analysis"), true);
  assert.equal(CLEAR_TABLES.includes("user_daily_momentum_goals"), true);
  assert.equal(CLEAR_TABLES.includes("streak_wagers"), true);
  assert.equal(CLEAR_TABLES.includes("study_groups"), true);
  assert.equal(CLEAR_TABLES.includes("study_group_members"), true);
  assert.equal(CLEAR_TABLES.includes("study_group_activities"), true);

  assert.equal(new Set(CLEAR_TABLES).size, CLEAR_TABLES.length);
});
