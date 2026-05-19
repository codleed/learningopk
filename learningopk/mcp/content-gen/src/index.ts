import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

const server = new Server(
  {
    name: "learningopk-content-gen",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

const generateQuizSchema = z.object({
  chapterId: z.number(),
  questionCount: z.number().min(1).max(30),
  types: z.array(z.enum(["mcq", "short", "fill_in_blanks"])),
  board: z.enum(["FBISE", "Punjab", "Sindh"]),
});

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "generate_quiz",
        description: "Generate board-aligned MCQs, short questions, and fill-in-blanks from chapter curriculum data",
        inputSchema: {
          type: "object",
          properties: {
            chapterId: { type: "number", description: "Chapter ID" },
            questionCount: { type: "number", description: "Number of questions (1-30)" },
            types: { type: "array", items: { type: "string", enum: ["mcq", "short", "fill_in_blanks"] } },
            board: { type: "string", enum: ["FBISE", "Punjab", "Sindh"] },
          },
          required: ["chapterId", "questionCount", "types", "board"],
        },
      },
      {
        name: "generate_flashcards",
        description: "Generate flashcards from chapter content",
        inputSchema: {
          type: "object",
          properties: {
            chapterId: { type: "number" },
            board: { type: "string", enum: ["FBISE", "Punjab", "Sindh"] },
          },
          required: ["chapterId", "board"],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  switch (request.params.name) {
    case "generate_quiz": {
      const args = generateQuizSchema.parse(request.params.arguments);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              status: "generated",
              chapterId: args.chapterId,
              board: args.board,
              questions: Array.from({ length: args.questionCount }, (_, i) => ({
                id: i + 1,
                type: args.types[i % args.types.length],
                question: `Sample ${args.board} question ${i + 1} for chapter ${args.chapterId}`,
                options: args.types[i % args.types.length] === "mcq" ? ["A", "B", "C", "D"] : undefined,
                answer: "A",
              })),
            }, null, 2),
          },
        ],
      };
    }
    case "generate_flashcards": {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ status: "generated", flashcards: [] }),
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
