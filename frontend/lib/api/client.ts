/**
 * API Client for SentientFlow Backend
 *
 * Provides type-safe API calls with automatic error handling,
 * JSON serialization, and query parameter support.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean>;
}

class ApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public detail?: string
  ) {
    super(`HTTP ${status}: ${detail || statusText}`);
    this.name = "ApiError";
  }
}

/**
 * Makes an API request with automatic error handling
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { params, ...fetchOptions } = options;

  // Build URL with query parameters
  let url = `${API_BASE_URL}${endpoint}`;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      searchParams.append(key, String(value));
    });
    url += `?${searchParams.toString()}`;
  }

  // Set default headers
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...fetchOptions.headers,
  };

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      headers,
    });

    // Handle non-2xx responses
    if (!response.ok) {
      let detail: string | undefined;
      try {
        const errorData = await response.json();
        detail = errorData.detail || errorData.message;
      } catch {
        // Response body not JSON
      }

      throw new ApiError(response.status, response.statusText, detail);
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return undefined as T;
    }

    // Parse JSON response
    return await response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    // Network or other errors
    throw new Error(
      `Network error: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Connection API types
 */
export interface Connection {
  id: string;
  user_id: string | null;
  provider: "openai" | "anthropic" | "gemini" | "grok";
  name: string;
  config: Record<string, any>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ConnectionCreate {
  provider: "openai" | "anthropic" | "gemini" | "grok";
  name: string;
  api_key: string;
  config?: Record<string, any>;
}

export interface ConnectionUpdate {
  name?: string;
  api_key?: string;
  config?: Record<string, any>;
}

/**
 * Workflow API types
 */
export interface WorkflowListItem {
  id: string;
  user_id: string | null;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface WorkflowDetail extends WorkflowListItem {
  definition: {
    nodes: any[];
    edges: any[];
    variables?: any[];
  };
}

export interface WorkflowCreate {
  name: string;
  description?: string;
  definition: {
    nodes: any[];
    edges: any[];
    variables?: any[];
  };
}

export interface WorkflowUpdate {
  name?: string;
  description?: string;
  definition?: {
    nodes: any[];
    edges: any[];
    variables?: any[];
  };
}

export interface WorkflowListParams {
  limit?: number;
  offset?: number;
  search?: string;
}

/**
 * Main API client
 */
export const api = {
  /**
   * Connection endpoints
   */
  connections: {
    /**
     * List all connections
     * @param provider Optional filter by provider
     */
    list: (provider?: string) =>
      apiRequest<Connection[]>("/api/connections", {
        params: provider ? { provider } : undefined,
      }),

    /**
     * Get a specific connection
     */
    get: (id: string) => apiRequest<Connection>(`/api/connections/${id}`),

    /**
     * Create a new connection
     */
    create: (data: ConnectionCreate) =>
      apiRequest<Connection>("/api/connections", {
        method: "POST",
        body: JSON.stringify(data),
      }),

    /**
     * Update a connection
     */
    update: (id: string, data: ConnectionUpdate) =>
      apiRequest<Connection>(`/api/connections/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),

    /**
     * Delete a connection
     */
    delete: (id: string) =>
      apiRequest<void>(`/api/connections/${id}`, {
        method: "DELETE",
      }),

    /**
     * Activate a connection (sets it as active for its provider)
     */
    activate: (id: string) =>
      apiRequest<Connection>(`/api/connections/${id}/activate`, {
        method: "PATCH",
      }),
  },

  /**
   * Workflow CRUD endpoints
   */
  workflows: {
    /**
     * List workflows with pagination and search
     */
    list: (params?: WorkflowListParams) =>
      apiRequest<WorkflowListItem[]>("/api/workflows", {
        params: params as Record<string, string | number | boolean> | undefined
      }),

    /**
     * Get a specific workflow with full definition
     */
    get: (id: string) => apiRequest<WorkflowDetail>(`/api/workflows/${id}`),

    /**
     * Create a new workflow
     */
    create: (data: WorkflowCreate) =>
      apiRequest<WorkflowDetail>("/api/workflows", {
        method: "POST",
        body: JSON.stringify(data),
      }),

    /**
     * Update a workflow
     */
    update: (id: string, data: WorkflowUpdate) =>
      apiRequest<WorkflowDetail>(`/api/workflows/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),

    /**
     * Delete a workflow
     */
    delete: (id: string) =>
      apiRequest<void>(`/api/workflows/${id}`, {
        method: "DELETE",
      }),

    /**
     * Duplicate a workflow
     */
    duplicate: (id: string) =>
      apiRequest<WorkflowDetail>(`/api/workflows/${id}/duplicate`),
  },
};

export { ApiError };
