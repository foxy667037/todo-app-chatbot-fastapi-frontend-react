import type {
  ChatbotResult,
  Task,
  TaskFilters,
  TaskInput,
  TaskPage,
  User,
} from "../types/models";

const baseUrl = (
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api/v1"
).replace(/\/+$/, "");

let accessToken: string | null = null;
let unauthorizedHandler: (() => void) | null = null;

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function setUnauthorizedHandler(handler: (() => void) | null) {
  unauthorizedHandler = handler;
}

function errorMessage(status: number): string {
  if (status === 401) return "Your session has expired. Please sign in again.";
  if (status === 403) return "You do not have permission to do that.";
  if (status === 404) return "That item could not be found.";
  if (status === 422) return "Please check the information and try again.";
  if (status >= 500)
    return "The service is temporarily unavailable. Please try again.";
  if (status === 0)
    return "Could not connect. Check your connection and try again.";
  return "The request could not be completed. Please try again.";
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  authenticated = true,
): Promise<T> {
  console.log(options.headers);
  const headers = new Headers(options.headers);
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (authenticated && accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, { ...options, headers });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError")
      throw error;
    throw new ApiError(errorMessage(0), 0);
  }

  if (response.status === 401 && authenticated && accessToken) {
    unauthorizedHandler?.();
  }
  if (!response.ok) {
    throw new ApiError(errorMessage(response.status), response.status);
  }
  if (response.status === 204) return undefined as T;
  try {
    return (await response.json()) as T;
  } catch {
    throw new ApiError(
      "The service returned an unexpected response.",
      response.status,
    );
  }
}

export const api = {
  register: (
    input: { full_name: string; email: string; password: string },
    signal?: AbortSignal,
  ) =>
    request<User>(
      "/auth/register",
      {
        method: "POST",
        body: JSON.stringify(input),
        signal,
      },
      false,
    ),
  login: (input: { email: string; password: string }, signal?: AbortSignal) =>
    request<{ access_token: string; token_type: "bearer" }>(
      "/auth/login",
      {
        method: "POST",
        body: JSON.stringify(input),
        signal,
      },
      false,
    ),
  me: (signal?: AbortSignal) => request<User>("/auth/me", { signal }),
  listTasks: (filters: TaskFilters, signal?: AbortSignal) => {
    const params = new URLSearchParams({
      page: String(filters.page),
      size: String(filters.size),
    });
    if (filters.search) params.set("search", filters.search);
    if (filters.status) params.set("status", filters.status);
    if (filters.priority) params.set("priority", filters.priority);
    return request<TaskPage>(`/tasks?${params.toString()}`, { signal });
  },
  createTask: (input: TaskInput, signal?: AbortSignal) =>
    request<Task>("/tasks", {
      method: "POST",
      body: JSON.stringify(input),
      signal,
    }),
  getTask: (id: number, signal?: AbortSignal) =>
    request<Task>(`/tasks/${id}`, { signal }),
  updateTask: (id: number, input: Partial<TaskInput>, signal?: AbortSignal) =>
    request<Task>(`/tasks/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
      signal,
    }),
  deleteTask: (id: number, signal?: AbortSignal) =>
    request<void>(`/tasks/${id}`, { method: "DELETE", signal }),
  listUsers: (signal?: AbortSignal) => request<User[]>("/users", { signal }),
  sendChatMessage: (message: string, signal?: AbortSignal) =>
    request<ChatbotResult>("/chatbot/message", {
      method: "POST",
      body: JSON.stringify({ message }),
      signal,
    }),
};
