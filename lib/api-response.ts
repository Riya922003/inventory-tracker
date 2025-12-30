/**
 * API Response Helpers
 * Provides consistent response formatting for all API routes
 */

import { NextResponse } from "next/server";

export interface ErrorResponse {
  error: string;
  details?: string;
  code?: string;
}

export interface SuccessResponse<T> {
  success?: boolean;
  [key: string]: any;
}

/**
 * Create a JSON error response with consistent formatting
 * @param message - User-friendly error message
 * @param status - HTTP status code
 * @param details - Optional technical details (shown in development mode)
 * @param code - Optional error code for programmatic handling
 */
export function jsonError(
  message: string,
  status: number = 500,
  details?: string,
  code?: string
): NextResponse {
  const errorResponse: ErrorResponse = {
    error: message,
  };

  // Include details in development mode or if explicitly provided
  if (details && (process.env.NODE_ENV === "development" || status < 500)) {
    errorResponse.details = details;
  }

  if (code) {
    errorResponse.code = code;
  }

  return NextResponse.json(errorResponse, { status });
}

/**
 * Create a JSON success response
 * @param data - Response data
 * @param status - HTTP status code (default: 200)
 */
export function jsonSuccess<T>(
  data: T,
  status: number = 200
): NextResponse {
  return NextResponse.json(data, { status });
}

/**
 * Common error responses for reuse
 */
export const CommonErrors = {
  unauthorized: (message: string = "Unauthorized - Authentication required") =>
    jsonError(message, 401, undefined, "UNAUTHORIZED"),

  forbidden: (message: string = "Forbidden - Insufficient permissions") =>
    jsonError(message, 403, undefined, "FORBIDDEN"),

  notFound: (resource: string = "Resource") =>
    jsonError(`${resource} not found`, 404, undefined, "NOT_FOUND"),

  badRequest: (message: string, details?: string) =>
    jsonError(message, 400, details, "BAD_REQUEST"),

  serverError: (message: string = "An error occurred", details?: string) =>
    jsonError(message, 500, details, "SERVER_ERROR"),

  validationError: (message: string, details?: string) =>
    jsonError(message, 422, details, "VALIDATION_ERROR"),
};
