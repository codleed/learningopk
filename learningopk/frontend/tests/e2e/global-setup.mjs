import { exec } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const execAsync = promisify(exec);
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const currentFilePath = fileURLToPath(import.meta.url);
const currentDirectory = path.dirname(currentFilePath);
const workspaceRoot = path.resolve(currentDirectory, "../../..");

export default async function globalSetup() {
  await execAsync(`${npmCommand} --workspace backend run db:seed`, {
    cwd: workspaceRoot,
    env: process.env,
    maxBuffer: 10 * 1024 * 1024,
    shell: true
  });
}
