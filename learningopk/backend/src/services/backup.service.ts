import * as fs from "node:fs";
import * as path from "node:path";
import { execFile } from "node:child_process";
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

async function runDockerExec(args: string[], stdin?: string): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = execFile(
      "docker",
      ["exec", CONTAINER_NAME, ...args],
      {
        maxBuffer: 500 * 1024 * 1024,
        encoding: "buffer"
      },
      (error, stdout, stderr) => {
        const out = stdout?.toString() ?? "";
        const err = stderr?.toString() ?? "";
        if (error) {
          reject(new Error(`Docker exec failed: ${err || error.message}`));
          return;
        }
        resolve({ stdout: out, stderr: err });
      }
    );

    if (stdin !== undefined && child.stdin) {
      child.stdin.write(stdin);
      child.stdin.end();
    }
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

  const { stdout } = await runDockerExec([
    "pg_dump",
    "-U", DB_USER,
    "-d", DB_NAME,
    "--clean",
    "--if-exists",
    "--no-owner",
    "--no-acl"
  ]);

  fs.writeFileSync(filepath, stdout, "utf-8");

  const stat = fs.statSync(filepath);
  return {
    name: filename,
    sizeBytes: stat.size,
    createdAt: stat.birthtime.toISOString()
  };
}

export async function restoreBackup(filename: string): Promise<void> {
  ensureBackupsDir();

  const filepath = path.join(BACKUPS_DIR, filename);
  if (!fs.existsSync(filepath)) {
    throw new Error(`Backup file not found: ${filename}`);
  }

  const sql = fs.readFileSync(filepath, "utf-8");

  await clearDatabase(db);

  await runDockerExec([
    "psql",
    "-U", DB_USER,
    "-d", DB_NAME
  ], sql);
}

export async function deleteBackup(filename: string): Promise<void> {
  ensureBackupsDir();

  const filepath = path.join(BACKUPS_DIR, filename);
  if (!fs.existsSync(filepath)) {
    throw new Error(`Backup file not found: ${filename}`);
  }

  fs.unlinkSync(filepath);
}
