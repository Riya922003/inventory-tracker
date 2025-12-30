/**
 * API Client with robust error handling
 * Handles both JSON and HTML responses gracefully
 */

export interface ApiResponse<T> {
  ok: boolean;
  status: number;
  data?: T;
  error?: string;
  details?: string;
}

/**
 * Fetch with comprehensive error handling
 * Checks content-type before parsing to avoid JSON parse errors
 */
export async function fetchWithErrorHandling<T>(
  url: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(url, {
      ...options,
      credentials: options?.credentials || "include",
    });

    // Get content type to determine how to parse response
    const contentType = response.headers.get("content-type") || "";
    const isJson = contentType.includes("application/json");

    // Handle successful responses
    if (response.ok) {
      if (isJson) {
        const data = await response.json();
        return {
          ok: true,
          status: response.status,
          data,
        };
      }
      // Non-JSON success response (shouldn't happen for our APIs)
      return {
        ok: true,
        status: response.status,
        data: undefined,
      };
    }

    // Handle error responses
    if (isJson) {
      try {
        const errorData = await response.json();
        return {
          ok: false,
          status: response.status,
          error: errorData.error || "An error occurred",
          details: errorData.details,
        };
      } catch (parseError) {
        // JSON parsing failed even though content-type says JSON
        return {
          ok: false,
          status: response.status,
          error: "Failed to parse error response",
          details: "The server returned an invalid JSON response",
        };
      }
    }

    // HTML or other non-JSON error response
    const textResponse = await response.text();
    
    // Check if it's an HTML response
    if (textResponse.trim().startsWith("<!DOCTYPE") || textResponse.trim().startsWith("<html")) {
      return {
        ok: false,
        status: response.status,
        error: "Unexpected server response",
        details: "The server returned an HTML page instead of JSON. This may indicate a server error or misconfiguration.",
      };
    }

    // Plain text error
    return {
      ok: false,
      status: response.status,
      error: textResponse || "An error occurred",
    };
  } catch (error) {
    // Network error or other fetch failure
    if (error instanceof TypeError && error.message.includes("fetch")) {
      return {
        ok: false,
        status: 0,
        error: "Network error",
        details: "Unable to connect to the server. Please check your internet connection.",
      };
    }

    // Other unexpected errors
    return {
      ok: false,
      status: 0,
      error: "Unexpected error",
      details: error instanceof Error ? error.message : "An unknown error occurred",
    };
  }
}

/**
 * Handle API response with automatic redirects and error display
 */
export function handleApiResponse<T>(
  response: ApiResponse<T>,
  options?: {
    onUnauthorized?: () => void;
    onForbidden?: (error: string) => void;
    onServerError?: (error: string) => void;
    onNetworkError?: (error: string) => void;
  }
): T | null {
  if (response.ok && response.data) {
    return response.data;
  }

  // Handle specific status codes
  switch (response.status) {
    case 401:
      // Unauthorized - redirect to login
      if (options?.onUnauthorized) {
        options.onUnauthorized();
      } else {
        window.location.href = "/";
      }
      break;

    case 403:
      // Forbidden - show access denied
      if (options?.onForbidden) {
        options.onForbidden(response.error || "Access denied");
      }
      break;

    case 500:
    case 502:
    case 503:
    case 504:
      // Server errors
      if (options?.onServerError) {
        options.onServerError(response.error || "Server error");
      }
      break;

    case 0:
      // Network error
      if (options?.onNetworkError) {
        options.onNetworkError(response.error || "Network error");
      }
      break;

    default:
      // Other errors - log for debugging
      console.error("API Error:", response);
  }

  return null;
}
