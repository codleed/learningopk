/**
 * Generic Function Dispatcher for ERP Modules
 *
 * Handles routing, permission checks, validation, and error mapping
 * for function-based API endpoints.
 */

import type { ErpPermission } from "@learningopk/shared";

import { HrmError } from "./hrm/types.js";

export interface DispatcherContext {
  schoolId: number;
  userId: string;
  permissions: Set<string>;
}

export interface FunctionSpec {
  description: string;
  permission: ErpPermission;
  arguments: Record<string, ArgumentSpec>;
}

export interface ArgumentSpec {
  question: string;
  type: "string" | "number" | "boolean" | "date" | "enum" | "array" | "object";
  required?: boolean;
  default?: any;
  stated?: string; // Question to determine if argument is present
  enumValues?: string[];
}

export interface ModuleSpec {
  functions: Record<string, FunctionSpec>;
}

export interface DispatchResult<T = any> {
  function: string;
  args: Record<string, any>;
  result: T;
}

export class DispatchError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(code: string, message: string, statusCode: number = 400, details?: unknown) {
    super(message);
    this.name = "DispatchError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }

  static validation(message: string, details?: unknown): DispatchError {
    return new DispatchError("VALIDATION_ERROR", message, 400, details);
  }

  static notFound(resource: string, id?: string | number): DispatchError {
    return new DispatchError(
      `${resource.toUpperCase()}_NOT_FOUND`,
      `${resource} not found`,
      404,
      id !== undefined ? { id } : undefined
    );
  }

  static conflict(resource: string, field?: string): DispatchError {
    return new DispatchError(
      `${resource.toUpperCase()}_EXISTS`,
      `${resource} already exists${field ? ` (${field})` : ""}`,
      409
    );
  }

  static forbidden(permission: ErpPermission): DispatchError {
    return new DispatchError("PERMISSION_DENIED", `Missing permission: ${permission}`, 403);
  }

  static internal(message: string): DispatchError {
    return new DispatchError("INTERNAL_ERROR", message, 500);
  }
}

export interface FunctionRegistry {
  [name: string]: {
    fn: (context: DispatcherContext, args: Record<string, any>) => Promise<any>;
    requiredPermission: ErpPermission;
    description: string;
  };
}

/**
 * Create a dispatcher for a module's functions
 */
export function createDispatcher(
  functions: FunctionRegistry,
  spec: ModuleSpec
): (
  intent: string,
  args: Record<string, any>,
  context: DispatcherContext
) => Promise<DispatchResult> {
  return async (intent: string, args: Record<string, any>, context: DispatcherContext) => {
    // Look up function
    const func = functions[intent];
    if (!func) {
      const available = Object.keys(functions).join(", ");
      throw DispatchError.validation(`Unknown function: ${intent}. Available: ${available}`, {
        available: Object.keys(functions),
      });
    }

    // Check permission from spec (more detailed) or function registry
    const specEntry = spec.functions[intent];
    const requiredPermission = specEntry?.permission ?? func.requiredPermission;
    if (!context.permissions.has(requiredPermission)) {
      throw DispatchError.forbidden(requiredPermission);
    }

    // Validate args against spec if available
    if (specEntry) {
      validateArgs(intent, args, specEntry.arguments);
    }

    // Execute function
    try {
      const result = await func.fn(context, args);
      return { function: intent, args, result };
    } catch (error) {
      // Re-throw DispatchError and HrmError as-is
      if (
        error instanceof DispatchError ||
        (error &&
          typeof error === "object" &&
          "constructor" in error &&
          error.constructor.name === "HrmError")
      ) {
        throw error;
      }
      // Wrap unexpected errors
      console.error(`Error executing ${intent}:`, error);
      throw DispatchError.internal(`Failed to execute ${intent}`);
    }
  };
}

/**
 * Validate arguments against spec
 */
function validateArgs(
  functionName: string,
  args: Record<string, any>,
  argSpecs: Record<string, ArgumentSpec>
): void {
  for (const [argName, spec] of Object.entries(argSpecs)) {
    const value = args[argName];

    // Check required
    if (spec.required !== false && (value === undefined || value === null)) {
      throw DispatchError.validation(`Missing required argument: ${argName}`, {
        argument: argName,
        function: functionName,
      });
    }

    // Skip type validation if value is undefined/null and not required
    if (value === undefined || value === null) continue;

    // Type validation
    switch (spec.type) {
      case "string":
        if (typeof value !== "string") {
          throw DispatchError.validation(`Argument ${argName} must be a string`, {
            argument: argName,
            expected: "string",
            received: typeof value,
          });
        }
        break;
      case "number":
        if (typeof value !== "number" || !Number.isFinite(value)) {
          throw DispatchError.validation(`Argument ${argName} must be a number`, {
            argument: argName,
            expected: "number",
            received: typeof value,
          });
        }
        break;
      case "boolean":
        if (typeof value !== "boolean") {
          throw DispatchError.validation(`Argument ${argName} must be a boolean`, {
            argument: argName,
            expected: "boolean",
            received: typeof value,
          });
        }
        break;
      case "date":
        if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
          throw DispatchError.validation(`Argument ${argName} must be an ISO date (YYYY-MM-DD)`, {
            argument: argName,
            expected: "date",
            received: value,
          });
        }
        break;
      case "enum":
        if (spec.enumValues && !spec.enumValues.includes(value)) {
          throw DispatchError.validation(
            `Argument ${argName} must be one of: ${spec.enumValues.join(", ")}`,
            { argument: argName, expected: spec.enumValues, received: value }
          );
        }
        break;
      case "array":
        if (!Array.isArray(value)) {
          throw DispatchError.validation(`Argument ${argName} must be an array`, {
            argument: argName,
            expected: "array",
            received: typeof value,
          });
        }
        break;
      case "object":
        if (typeof value !== "object" || value === null || Array.isArray(value)) {
          throw DispatchError.validation(`Argument ${argName} must be an object`, {
            argument: argName,
            expected: "object",
            received: typeof value,
          });
        }
        break;
    }
  }

  // Check for unknown arguments
  const knownArgs = new Set(Object.keys(argSpecs));
  for (const argName of Object.keys(args)) {
    if (!knownArgs.has(argName)) {
      console.warn(`Unknown argument ${argName} for function ${functionName}`);
    }
  }
}

/**
 * Convert a DispatchError to an HTTP response
 */
export function dispatchErrorToResponse(error: unknown): {
  statusCode: number;
  body: { error: string; code?: string; details?: unknown };
} {
  if (error instanceof DispatchError) {
    return {
      statusCode: error.statusCode,
      body: {
        error: error.message,
        code: error.code,
        ...(error.details !== undefined && { details: error.details }),
      },
    };
  }

  // Handle HrmError (from function layer)
  if (
    error &&
    typeof error === "object" &&
    "constructor" in error &&
    error.constructor.name === "HrmError"
  ) {
    const hrError = error as any;
    return {
      statusCode: hrError.statusCode,
      body: {
        error: hrError.message,
        code: hrError.code,
        ...(hrError.details !== undefined && { details: hrError.details }),
      },
    };
  }

  // Generic error
  return {
    statusCode: 500,
    body: { error: "Internal server error", code: "INTERNAL_ERROR" },
  };
}
