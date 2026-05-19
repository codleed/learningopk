import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const server = new Server(
  {
    name: "learningopk-i18n-mcp",
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
        name: "translate_to_urdu",
        description: "Translate UI strings to Urdu",
        inputSchema: {
          type: "object",
          properties: {
            text: { type: "string", description: "Text to translate" },
            context: { type: "string", description: "UI context (e.g., button, label, error)" },
          },
          required: ["text"],
        },
      },
      {
        name: "romanize",
        description: "Romanize Urdu text for search indexing",
        inputSchema: {
          type: "object",
          properties: {
            text: { type: "string" },
          },
          required: ["text"],
        },
      },
      {
        name: "detect_language",
        description: "Detect if text is English or Urdu",
        inputSchema: {
          type: "object",
          properties: {
            text: { type: "string" },
          },
          required: ["text"],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  switch (request.params.name) {
    case "translate_to_urdu": {
      const args = request.params.arguments as Record<string, unknown>;
      const text = String(args?.text ?? "");
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              original: text,
              translation: `[urdu] ${text}`,
              context: args?.context ?? "general",
            }),
          },
        ],
      };
    }
    case "romanize": {
      const args = request.params.arguments as Record<string, unknown>;
      const text = String(args?.text ?? "");
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ original: text, romanized: text }),
          },
        ],
      };
    }
    case "detect_language": {
      const args = request.params.arguments as Record<string, unknown>;
      const text = String(args?.text ?? "");
      const isUrdu = /[\u0600-\u06FF]/.test(text);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ text, language: isUrdu ? "urdu" : "english" }),
          },
        ],
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
