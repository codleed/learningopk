import * as fs from "node:fs";
import * as path from "node:path";
import { execFile, spawn } from "node:child_process";
import { clearDatabase } from "../lib/db/clear-database.js";
import { db } from "../lib/db/index.js";

const BACKUPS_DIR = path.resolve(import.meta.dirname, "..", "..", "..", "backups");
const CONTAINER_NAME = "learningopk_postgres";
const DB_USER = "postgres";
const DB_NAME = "learningo";

export type BackupEntry = {
  name: string;
  sizeBytes: number;
  createdAt: string;
};

function ensureBackupsDir(): void {
  if (!fs.existsSync(BACKUPS_DIR)) {
    fs.mkdirSync(BACKUPS_DIR, { recursive: true });
  }
}

function sanitizeFilename(input: string): string {
  return input.replace(/[^a-zA-Z0-9._-]/g, "_");
}

async function runDocker(args: string[]): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    execFile(
      "docker",
      args,
      { maxBuffer: 500 * 1024 * 1024, encoding: "buffer" },
      (error, stdout, stderr) => {
        const out = stdout?.toString() ?? "";
        const err = stderr?.toString() ?? "";
        if (error) {
          reject(new Error(`Docker command failed: ${err || error.message}`));
          return;
        }
        resolve({ stdout: out, stderr: err });
      }
    );
  });
}

export async function listBackups(): Promise<BackupEntry[]> {
  ensureBackupsDir();
  const entries = fs.readdirSync(BACKUPS_DIR)
    .filter((name) => name.endsWith(".sql"))
    .map((name) => {
      const stat = fs.statSync(path.join(BACKUPS_DIR, name));
      return {
        name,
        sizeBytes: stat.size,
        createdAt: stat.birthtime.toISOString()
      };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return entries;
}

export async function createBackup(label?: string): Promise<BackupEntry> {
  ensureBackupsDir();

  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, "-");
  const safeLabel = label ? `-${sanitizeFilename(label)}` : "";
  const filename = `backup-${timestamp}${safeLabel}.sql`;
  const filepath = path.join(BACKUPS_DIR, filename);

  await new Promise<void>((resolve, reject) => {
    const child = spawn("docker", [
      "exec", CONTAINER_NAME,
      "pg_dump",
      "-U", DB_USER,
      "-d", DB_NAME,
      "--clean",
      "--if-exists",
      "--no-owner",
      "--no-acl"
    ]);
    const stream = fs.createWriteStream(filepath);
    child.stdout.pipe(stream);
    child.stderr.on("data", () => {});
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`pg_dump exited with code ${code}`));
      }
    });
  });

  const stat = fs.statSync(filepath);
  return {
    name: filename,
    sizeBytes: stat.size,
    createdAt: stat.birthtime.toISOString()
  };
}

const CONTAINER_RESTORE_PATH = "/tmp/learningo_restore.sql";

export async function restoreBackup(filename: string): Promise<void> {
  ensureBackupsDir();

  const safeFilename = path.basename(filename);
  const filepath = path.join(BACKUPS_DIR, safeFilename);
  if (!fs.existsSync(filepath)) {
    throw new Error(`Backup file not found: ${safeFilename}`);
  }

  await clearDatabase(db);

  await runDocker(["cp", filepath, `${CONTAINER_NAME}:${CONTAINER_RESTORE_PATH}`]);

  try {
    await runDocker([
      "exec", CONTAINER_NAME,
      "psql",
      "-U", DB_USER,
      "-d", DB_NAME,
      "-f", CONTAINER_RESTORE_PATH
    ]);
  } finally {
    await runDocker([
      "exec", CONTAINER_NAME,
      "rm", "-f", CONTAINER_RESTORE_PATH
    ]).catch(() => {});
  }
}

export async function deleteBackup(filename: string): Promise<void> {
  ensureBackupsDir();

  const safeFilename = path.basename(filename);
  const filepath = path.join(BACKUPS_DIR, safeFilename);
  if (!fs.existsSync(filepath)) {
    throw new Error(`Backup file not found: ${safeFilename}`);
  }

  fs.unlinkSync(filepath);
}
