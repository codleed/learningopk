/**
 * Standard API Response Helper
 * 
 * Provides consistent response shapes across all API endpoints.
 * 
 * Response Shapes:
 * 
 * Success (with data):
 * { data: T }
 * 
 * Success (with pagination):
 * { data: T[], pagination: { page, limit, total, totalPages } }
 * 
 * Success (no content):
 * { success: true }
 * 
 * Error:
 * { error: string, code?: string, details?: unknown }
 */

export type ApiResponse<T> = {
  data?: T;
  success?: boolean;
  error?: string;
  code?: string;
  details?: unknown;
};

export type PaginatedResponse<T> = {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export function successResponse<T>(data: T): ApiResponse<T> {
  return { data };
}

export function paginatedResponse<T>(
  data: T[],
  page: number,
  limit: number,
  total: number
): PaginatedResponse<T> {
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export function noContentResponse(): ApiResponse<null> {
  return { success: true };
}

export function errorResponse(
  message: string,
  code?: string,
  details?: unknown
): ApiResponse<null> {
  return { error: message, code, details };
}

/**
 * Usage Example:
 * 
 * // In your route handler
 * import { successResponse, errorResponse } from './response';
 * 
 * router.get('/users', async (req, res) => {
 *   try {
 *     const users = await getUsers();
 *     res.json(successResponse(users));
 *   } catch (err) {
 *     res.status(500).json(errorResponse('Failed to fetch users', 'FETCH_ERROR'));
 *   }
 * });
 */

// Recommended: Add to all route handlers
// Current Inconsistency: Some return directly, some wrap in { data }
// Target: All responses should use successResponse() wrapper
