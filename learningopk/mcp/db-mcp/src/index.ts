import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { Client } from "pg";

const ALLOWED_TABLES = [
  "classrooms",
  "classroom_students",
  "assignments",
  "assignment_submissions",
  "classroom_announcements",
  "user",
  "schools",
  "boards",
  "board_classes",
  "subjects",
  "chapters",
  "quizzes",
  "quiz_questions",
  "quiz_attempts",
  "mock_exams",
  "user_progress",
  "formulas",
  "student_notes",
  "forum_threads",
  "forum_replies",
];

let isConnected = false;
let client: Client | null = null;

function getClient(): Client {
  if (!client) {
    client = new Client({
      connectionString: process.env.DATABASE_URL,
    });
  }
  return client;
}

const server = new Server(
  {
    name: "learningopk-db-mcp",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "list_tables",
        description: "List all tables in the database",
        inputSchema: { type: "object", properties: {} },
      },
      {
        name: "describe_table",
        description: "Describe columns and types of a table",
        inputSchema: {
          type: "object",
          properties: {
            table: { type: "string", description: "Table name" },
          },
          required: ["table"],
        },
      },
      {
        name: "safe_query",
        description: "Execute a read-only SELECT query against whitelisted tables",
        inputSchema: {
          type: "object",
          properties: {
            sql: { type: "string", description: "SELECT query only" },
          },
          required: ["sql"],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const db = getClient();
  if (!isConnected) {
    await db.connect();
    isConnected = true;
  }

  switch (request.params.name) {
    case "list_tables": {
      const result = await db.query(
        "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
      );
      return {
        content: [{ type: "text", text: JSON.stringify(result.rows, null, 2) }],
      };
    }
    case "describe_table": {
      const table = String((request.params.arguments as Record<string, unknown>)?.table ?? "");
      const result = await db.query(
        "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = $1",
        [table]
      );
      return {
        content: [{ type: "text", text: JSON.stringify(result.rows, null, 2) }],
      };
    }
    case "safe_query": {
      const sql = String((request.params.arguments as Record<string, unknown>)?.sql ?? "");
      const trimmed = sql.trim().toLowerCase();
      if (!trimmed.startsWith("select")) {
        throw new Error("Only SELECT queries are allowed");
      }
      // Validate only whitelisted tables are referenced (FROM + all JOIN variants)
      const tableMatches = sql.match(/(?:from|join)\s+["']?(\w+)["']?/gi);
      if (tableMatches) {
        for (const match of tableMatches) {
          const tableName = match.replace(/(?:from|join)\s+["']?/i, "").replace(/["']/g, "").toLowerCase();
          if (!ALLOWED_TABLES.includes(tableName) && tableName !== "information_schema") {
            throw new Error(`Table "${tableName}" is not in the allowed tables list`);
          }
        }
      }
      const result = await db.query(sql);
      return {
        content: [{ type: "text", text: JSON.stringify(result.rows, null, 2) }],
      };
    }
    default:
      throw new Error(`Unknown tool: ${request.params.name}`);
  }
});

process.on("SIGTERM", async () => {
  if (client) {
    await client.end();
  }
  process.exit(0);
});

process.on("SIGINT", async () => {
  if (client) {
    await client.end();
  }
  process.exit(0);
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
