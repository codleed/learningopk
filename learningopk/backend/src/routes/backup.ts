import { Router, type Response } from "express";
import { exec } from "child_process";
import { promisify } from "util";
import { z } from "zod";
import { requireAdminRole } from "../lib/admin.js";
import { requireSession, type AuthenticatedRequest } from "../lib/session.js";
import { persistAuditLog } from "./admin.js";
import { env } from "../lib/env.js";

const execAsync = promisify(exec);

const backupQuerySchema = z.object({
  includeData: z.boolean().optional().default(true),
  compression: z.enum(["none", "gzip", "zip"]).optional().default("gzip")
});

const restoreQuerySchema = z.object({
  confirmRestore: z.boolean()
});

interface BackupMetadata {
  id: string;
  filename: string;
  size: number;
  createdAt: string;
  tables: string[];
  includesData: boolean;
}

const BACKUP_DIR = process.env.BACKUP_DIR || "./backups";

const parseDatabaseUrl = (url: string) => {
  const match = url.match(/postgres(?:ql)?:\/\/([^:]+):[^@]+@([^:]+):(\d+)\/(\w+)/);
  if (!match) {
    return { user: "postgres", host: "localhost", port: 5432, database: "learningopk" };
  }
  return {
    user: match[1],
    host: match[2],
    port: parseInt(match[3], 10),
    database: match[4]
  };
};

const dbConfig = parseDatabaseUrl(env.DATABASE_URL);

export const backupRouter = Router();

const getBackupList = async (): Promise<BackupMetadata[]> => {
  try {
    const { stdout } = await execAsync(`ls -la ${BACKUP_DIR}/*.sql* 2>/dev/null || echo ""`);
    const files = stdout
      .trim()
      .split("\n")
      .filter(Boolean)
      .slice(1);

    return files.map((line) => {
      const parts = line.split(/\s+/);
      const filename = parts[parts.length - 1];
      const size = parseInt(parts[4], 10);
      const dateStr = `${parts[5]} ${parts[6]} ${parts[7]}`;
      const compressed = filename.endsWith(".gz") || filename.endsWith(".zip");
      
      return {
        id: filename.replace(/[^a-zA-Z0-9-]/g, ""),
        filename,
        size: compressed ? Math.round(size / 3) : size,
        createdAt: new Date(dateStr).toISOString(),
        tables: [],
        includesData: !filename.includes("_schema")
      };
    });
  } catch {
    return [];
  }
};

backupRouter.get("/status", requireSession, async (req: AuthenticatedRequest, res: Response) => {
  if (!(await requireAdminRole(req, res))) {
    return;
  }

  try {
    const backups = await getBackupList();
    
    res.status(200).json({
      backupDir: BACKUP_DIR,
      dbName: dbConfig.database,
      backups: backups.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
      canBackup: true,
      canRestore: backups.length > 0
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to get backup status",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

backupRouter.post("/create", requireSession, async (req: AuthenticatedRequest, res: Response) => {
  if (!(await requireAdminRole(req, res))) {
    return;
  }

  const parsedBody = backupQuerySchema.safeParse(req.body);
  if (!parsedBody.success) {
    res.status(400).json({
      error: "Invalid backup parameters",
      details: parsedBody.error.flatten()
    });
    return;
  }

  const { includeData, compression } = parsedBody.data;
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const dataSuffix = includeData ? "full" : "schema";
  const ext = compression === "gzip" ? ".sql.gz" : compression === "zip" ? ".sql.zip" : ".sql";
  const filename = `backup_${timestamp}_${dataSuffix}${ext}`;
  const filepath = `${BACKUP_DIR}/${filename}`;

  try {
    await execAsync(`mkdir -p ${BACKUP_DIR}`);

    let command: string;
    if (includeData) {
      command = `pg_dump -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.user} -d ${dbConfig.database} -f "${filepath.replace(ext, ".sql")}"`;
    } else {
      command = `pg_dump -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.user} -d ${dbConfig.database} --schema-only -f "${filepath.replace(ext, ".sql")}"`;
    }

    await execAsync(command);

    if (compression === "gzip") {
      await execAsync(`gzip "${filepath.replace(ext, ".sql")}"`);
    }

    const actorId = req.session.user.id;
    const actorName = req.session.user.name;

    await persistAuditLog({
      scope: "settings",
      action: "Create database backup",
      target: filename,
      status: "success",
      message: `Created ${includeData ? "full" : "schema-only"} backup`,
      actorId,
      actorName
    });

    const backups = await getBackupList();
    const created = backups.find(b => b.filename === filename);

    res.status(201).json({
      success: true,
      backup: created ?? {
        id: timestamp,
        filename,
        size: 0,
        createdAt: new Date().toISOString(),
        tables: [],
        includesData
      }
    });
  } catch (error) {
    const actorId = req.session.user.id;
    const actorName = req.session.user.name;

    await persistAuditLog({
      scope: "settings",
      action: "Create database backup",
      target: "backup",
      status: "failed",
      message: error instanceof Error ? error.message : "Unknown error",
      actorId,
      actorName
    });

    res.status(500).json({
      error: "Failed to create backup",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

backupRouter.get("/download/:filename", requireSession, async (req: AuthenticatedRequest, res: Response) => {
  if (!(await requireAdminRole(req, res))) {
    return;
  }

  const { filename } = req.params;
  const filepath = `${BACKUP_DIR}/${filename}`;

  try {
    res.download(filepath, filename);
  } catch {
    res.status(404).json({
      error: "Backup file not found"
    });
  }
});

backupRouter.delete("/:filename", requireSession, async (req: AuthenticatedRequest, res: Response) => {
  if (!(await requireAdminRole(req, res))) {
    return;
  }

  const { filename } = req.params;
  
  if (!filename.match(/^backup_[\d-]+_(full|schema)(\.sql(\.gz|\.zip))?$/)) {
    res.status(400).json({
      error: "Invalid backup filename"
    });
    return;
  }

  const filepath = `${BACKUP_DIR}/${filename}`;

  try {
    await execAsync(`rm -f "${filepath}"`);

    const actorId = req.session.user.id;
    const actorName = req.session.user.name;

    await persistAuditLog({
      scope: "settings",
      action: "Delete database backup",
      target: filename,
      status: "success",
      message: "Deleted backup file",
      actorId,
      actorName
    });

    res.status(200).json({
      success: true,
      deleted: filename
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to delete backup",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

backupRouter.post("/restore", requireSession, async (req: AuthenticatedRequest, res: Response) => {
  if (!(await requireAdminRole(req, res))) {
    return;
  }

  const parsedBody = restoreQuerySchema.safeParse(req.body);
  if (!parsedBody.success || !parsedBody.data.confirmRestore) {
    res.status(400).json({
      error: "Restore confirmation required"
    });
    return;
  }

  const { filename } = req.body;
  if (!filename) {
    res.status(400).json({
      error: "Backup filename required"
    });
    return;
  }

  const filepath = `${BACKUP_DIR}/${filename}`;
  const actorId = req.session.user.id;
  const actorName = req.session.user.name;

  try {
    const isCompressed = filename.endsWith(".gz") || filename.endsWith(".zip");
    let sqlFile = filepath;
    
    if (isCompressed) {
      sqlFile = filepath.replace(/\.(gz|zip)$/, "");
      if (filename.endsWith(".gz")) {
        await execAsync(`gunzip -c "${filepath}" > "${sqlFile}"`);
      } else {
        await execAsync(`unzip -p "${filepath}" > "${sqlFile}"`);
      }
    }

    await execAsync(`psql -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.user} -d ${dbConfig.database} -f "${sqlFile}"`);

    if (isCompressed && sqlFile !== filepath) {
      await execAsync(`rm -f "${sqlFile}"`);
    }

    await persistAuditLog({
      scope: "settings",
      action: "Restore database",
      target: filename,
      status: "success",
      message: "Database restored from backup",
      actorId,
      actorName
    });

    res.status(200).json({
      success: true,
      restored: filename,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    await persistAuditLog({
      scope: "settings",
      action: "Restore database",
      target: filename,
      status: "failed",
      message: error instanceof Error ? error.message : "Unknown error",
      actorId,
      actorName
    });

    res.status(500).json({
      error: "Failed to restore database",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});
