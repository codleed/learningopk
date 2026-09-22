/**
 * Shared HRM Types
 *
 * Common types used across all HRM function modules.
 * This file has no dependencies on entity-specific modules to avoid circular imports.
 */

import type { ErpPermission } from "@learningopk/shared";

// ============================================================================
// Context & Error Types
// ============================================================================

export interface HrmFunctionContext {
  schoolId: number;
  userId: string;
  permissions: Set<ErpPermission>;
}

export class HrmError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 400,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "HrmError";
  }

  static validation(message: string, details?: unknown): HrmError {
    return new HrmError("VALIDATION_ERROR", message, 400, details);
  }

  static notFound(resource: string, id?: string | number): HrmError {
    return new HrmError(
      `${resource.toUpperCase()}_NOT_FOUND`,
      `${resource} not found`,
      404,
      id !== undefined ? { id } : undefined
    );
  }

  static conflict(resource: string, field?: string): HrmError {
    return new HrmError(
      `${resource.toUpperCase()}_EXISTS`,
      `${resource} already exists${field ? ` (${field})` : ""}`,
      409
    );
  }

  static forbidden(action: string): HrmError {
    return new HrmError("PERMISSION_DENIED", `Missing permission: ${action}`, 403);
  }

  static internal(message: string): HrmError {
    return new HrmError("INTERNAL_ERROR", message, 500);
  }
}

export function requirePermission(context: HrmFunctionContext, permission: ErpPermission): void {
  if (!context.permissions.has(permission)) {
    throw HrmError.forbidden(permission);
  }
}

// ============================================================================
// Pagination & Query Types
// ============================================================================

export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export function normalizePagination(params: PaginationParams): Required<PaginationParams> {
  return {
    page: Math.max(1, Math.floor(params.page ?? 1)),
    pageSize: Math.min(100, Math.max(1, Math.floor(params.pageSize ?? 20))),
  };
}

// ============================================================================
// Function Registry Type
// ============================================================================

export interface HrmFunction<
  TArgs extends Record<string, any> = Record<string, any>,
  TResult = any,
> {
  (context: HrmFunctionContext, args: TArgs): Promise<TResult>;
  requiredPermission: ErpPermission;
  description: string;
}

// Helper to register functions with metadata
export function registerHrmFunction<TArgs extends Record<string, any>, TResult>(
  name: string,
  fn: (context: HrmFunctionContext, args: TArgs) => Promise<TResult>,
  requiredPermission: ErpPermission,
  description: string
): void {
  // Registration happens at module load time via side effects in entity files
  // This function exists for documentation purposes
}
