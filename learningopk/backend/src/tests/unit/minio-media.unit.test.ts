import assert from "node:assert/strict";
import test from "node:test";

import {
  buildChapterSummaryObjectKey,
  buildProfileImageObjectKey,
  extractManagedObjectKeyFromPublicUrl,
  fileExtensionFromMimeType
} from "../../lib/minio.js";

test("fileExtensionFromMimeType maps supported image and GIF mime types", () => {
  assert.equal(fileExtensionFromMimeType("image/jpeg"), "jpg");
  assert.equal(fileExtensionFromMimeType("image/png"), "png");
  assert.equal(fileExtensionFromMimeType("image/webp"), "webp");
  assert.equal(fileExtensionFromMimeType("image/gif"), "gif");
  assert.equal(fileExtensionFromMimeType("application/pdf"), null);
});

test("buildProfileImageObjectKey creates namespaced profile image keys", () => {
  const key = buildProfileImageObjectKey({
    userId: "user_123",
    fileExtension: "png",
    objectId: "asset_001"
  });

  assert.equal(key, "profile-images/user_123/asset_001.png");
});

test("buildChapterSummaryObjectKey creates chapter summary media keys", () => {
  const key = buildChapterSummaryObjectKey({
    chapterId: 88,
    userId: "admin_456",
    fileExtension: "gif",
    objectId: "asset_002"
  });

  assert.equal(key, "chapter-summaries/88/admin_456/asset_002.gif");
});

test("extractManagedObjectKeyFromPublicUrl returns object key for managed MinIO URLs", () => {
  const key = extractManagedObjectKeyFromPublicUrl({
    publicUrl: "http://localhost:9000",
    bucket: "learningo-media",
    objectUrl: "http://localhost:9000/learningo-media/profile-images/user_123/asset_001.png"
  });

  assert.equal(key, "profile-images/user_123/asset_001.png");
});

test("extractManagedObjectKeyFromPublicUrl ignores non-managed URLs", () => {
  const key = extractManagedObjectKeyFromPublicUrl({
    publicUrl: "http://localhost:9000",
    bucket: "learningo-media",
    objectUrl: "https://cdn.example.com/avatar.png"
  });

  assert.equal(key, null);
});
