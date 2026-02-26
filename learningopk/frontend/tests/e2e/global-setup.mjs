import { exec } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const execAsync = promisify(exec);
const pnpmCommand = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const currentFilePath = fileURLToPath(import.meta.url);
const currentDirectory = path.dirname(currentFilePath);
const workspaceRoot = path.resolve(currentDirectory, "../../..");

export default async function globalSetup() {
  await execAsync(`${pnpmCommand} --filter backend db:seed`, {
    cwd: workspaceRoot,
    env: process.env,
    maxBuffer: 10 * 1024 * 1024,
    shell: true
  });
}
