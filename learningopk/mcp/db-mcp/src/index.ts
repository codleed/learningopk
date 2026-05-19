import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { Client } from "pg";

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

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
        description: "Execute a read-only SELECT query",
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
  if (!client.connect) {
    await client.connect();
  }

  switch (request.params.name) {
    case "list_tables": {
      const result = await client.query(
        "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
      );
      return {
        content: [{ type: "text", text: JSON.stringify(result.rows, null, 2) }],
      };
    }
    case "describe_table": {
      const table = String((request.params.arguments as Record<string, unknown>)?.table ?? "");
      const result = await client.query(
        `SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = $1`,
        [table]
      );
      return {
        content: [{ type: "text", text: JSON.stringify(result.rows, null, 2) }],
      };
    }
    case "safe_query": {
      const sql = String((request.params.arguments as Record<string, unknown>)?.sql ?? "");
      if (!sql.trim().toLowerCase().startsWith("select")) {
        throw new Error("Only SELECT queries are allowed");
      }
      const result = await client.query(sql);
      return {
        content: [{ type: "text", text: JSON.stringify(result.rows, null, 2) }],
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

main().catch(console.error);
