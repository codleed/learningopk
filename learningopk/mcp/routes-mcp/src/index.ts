import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { glob } from "glob";
import { readFile } from "fs/promises";
import { join, resolve, normalize } from "path";

const ROUTES_DIR = resolve(process.env.ROUTES_DIR || "./backend/src/routes");

function safeRoutePath(input: string): string | null {
  // Reject path traversal attempts and non-.ts files
  const normalized = normalize(input);
  if (normalized.startsWith("..") || normalized.startsWith("/") || normalized.startsWith("\\")) {
    return null;
  }
  if (!normalized.endsWith(".ts")) {
    return null;
  }
  const fullPath = resolve(join(ROUTES_DIR, normalized));
  if (!fullPath.startsWith(ROUTES_DIR)) {
    return null;
  }
  return fullPath;
}

const server = new Server(
  {
    name: "learningopk-routes-mcp",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

async function listRoutes(): Promise<Array<{ method: string; path: string; file: string }>> {
  const files = await glob("**/*.ts", { cwd: ROUTES_DIR });
  const routes: Array<{ method: string; path: string; file: string }> = [];

  for (const file of files) {
    const content = await readFile(join(ROUTES_DIR, file), "utf-8");
    const lines = content.split("\n");
    for (const line of lines) {
      const match = line.match(
        /(router\.|app\.)((get|post|patch|put|delete)\s*\(\s*["'`])([^"'`]+)/
      );
      if (match) {
        routes.push({
          method: match[3].toUpperCase(),
          path: match[4],
          file,
        });
      }
    }
  }

  return routes;
}

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "list_routes",
        description: "List all API endpoints",
        inputSchema: { type: "object", properties: {} },
      },
      {
        name: "get_route_schema",
        description: "Get request/response schema for a route file",
        inputSchema: {
          type: "object",
          properties: {
            file: { type: "string", description: "Route file name (e.g., teacher.ts)" },
          },
          required: ["file"],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  switch (request.params.name) {
    case "list_routes": {
      const routes = await listRoutes();
      return {
        content: [{ type: "text", text: JSON.stringify(routes, null, 2) }],
      };
    }
    case "get_route_schema": {
      const args = request.params.arguments as Record<string, unknown>;
      const file = String(args?.file ?? "");
      const safePath = safeRoutePath(file);
      if (!safePath) {
        throw new Error(`Invalid route file name: ${file}`);
      }
      const content = await readFile(safePath, "utf-8").catch(() => null);
      if (!content) {
        throw new Error(`Route file not found: ${file}`);
      }
      return {
        content: [{ type: "text", text: content }],
      };
    }
    default:
      throw new Error(`Unknown tool: ${request.params.name}`);
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

process.on("SIGTERM", () => process.exit(0));
process.on("SIGINT", () => process.exit(0));

main().catch(console.error);
