import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BrowserRouter } from "react-router-dom";
import App from "../App";
import { AuthProvider } from "../features/auth/AuthContext";
import { api } from "../api/client";
import type { ChatbotResult, Task, TaskPage, User } from "../types/models";

vi.mock("../api/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../api/client")>();
  return {
    ...actual,
    api: {
      ...actual.api,
      register: vi.fn(),
      login: vi.fn(),
      me: vi.fn(),
      listTasks: vi.fn(),
      createTask: vi.fn(),
      getTask: vi.fn(),
      updateTask: vi.fn(),
      deleteTask: vi.fn(),
      listUsers: vi.fn(),
      sendChatMessage: vi.fn(),
    },
  };
});

const regularUser: User = {
  id: 11, full_name: "Morgan Lee", email: "morgan@example.com", role: "user",
  is_active: true, created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z",
};
const adminUser: User = { ...regularUser, id: 1, full_name: "Alex Admin", role: "admin" };
const firstTask: Task = {
  id: 7, title: "Plan the launch", description: "Write a short checklist",
  status: "todo", priority: "high", due_date: null, owner_id: 11,
  created_at: "2026-10-01T12:00:00Z", updated_at: "2026-10-01T12:00:00Z",
};

function page(tasks: Task[] = []): TaskPage {
  return { items: tasks, total: tasks.length, page: 1, size: 20, pages: tasks.length ? 1 : 0 };
}

function renderApp(path = "/") {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  window.history.replaceState({}, "", path);
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider><App /></AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.mocked(api.me).mockResolvedValue(regularUser);
  vi.mocked(api.listTasks).mockResolvedValue(page());
  vi.mocked(api.listUsers).mockResolvedValue([]);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("authentication and route access", () => {
  it("validates and completes login, then opens the authenticated dashboard", async () => {
    const user = userEvent.setup();
    vi.mocked(api.login).mockResolvedValue({ access_token: "test-token", token_type: "bearer" });
    renderApp("/login");

    await user.click(screen.getByRole("button", { name: /sign in/i }));
    expect(await screen.findByText("Enter a valid email address.")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Email address"), "morgan@example.com");
    await user.type(screen.getByLabelText("Password"), "SecurePassword123!");
    await user.click(screen.getByRole("button", { name: /sign in/i }));
    expect(await screen.findByRole("heading", { name: /good (morning|afternoon|evening), morgan/i })).toBeInTheDocument();
    expect(api.login).toHaveBeenCalledWith({ email: "morgan@example.com", password: "SecurePassword123!" });
    expect(sessionStorage.getItem("daymark_access_token")).toBe("test-token");
  });

  it("validates registration and returns to sign-in after a successful registration", async () => {
    const user = userEvent.setup();
    vi.mocked(api.register).mockResolvedValue(regularUser);
    renderApp("/register");

    await user.type(screen.getByLabelText("Full name"), "Morgan Lee");
    await user.type(screen.getByLabelText("Email address"), "morgan@example.com");
    await user.type(screen.getByLabelText("Password"), "short");
    await user.click(screen.getByRole("button", { name: /create account/i }));
    expect(await screen.findByText("Use at least 12 characters.")).toBeInTheDocument();
    expect(api.register).not.toHaveBeenCalled();

    await user.clear(screen.getByLabelText("Password"));
    await user.type(screen.getByLabelText("Password"), "SecurePassword123!");
    await user.click(screen.getByRole("button", { name: /create account/i }));
    expect(await screen.findByRole("heading", { name: "Sign in to your space" })).toBeInTheDocument();
    expect(api.register).toHaveBeenCalledWith({
      full_name: "Morgan Lee", email: "morgan@example.com", password: "SecurePassword123!",
    });
  });

  it("redirects unauthenticated visitors to sign-in", async () => {
    renderApp("/dashboard");
    expect(await screen.findByRole("heading", { name: "Sign in to your space" })).toBeInTheDocument();
  });

  it("shows admin navigation only for an authenticated admin", async () => {
    sessionStorage.setItem("daymark_access_token", "admin-token");
    vi.mocked(api.me).mockResolvedValue(adminUser);
    vi.mocked(api.listTasks).mockResolvedValue(page());
    vi.mocked(api.listUsers).mockResolvedValue([adminUser]);
    renderApp("/admin");
    expect(await screen.findByRole("heading", { name: "Team overview" })).toBeInTheDocument();
    expect(screen.getByText("Admin view")).toBeInTheDocument();
    await waitFor(() => expect(api.listUsers).toHaveBeenCalled());
  });

  it("redirects regular users away from the admin route", async () => {
    sessionStorage.setItem("daymark_access_token", "user-token");
    renderApp("/admin");
    expect(await screen.findByRole("heading", { name: /good (morning|afternoon|evening), morgan/i })).toBeInTheDocument();
    expect(screen.queryByText("Admin workspace")).not.toBeInTheDocument();
    expect(api.listUsers).not.toHaveBeenCalled();
  });

  it("lets admins search the supported read-only user directory", async () => {
    const user = userEvent.setup();
    sessionStorage.setItem("daymark_access_token", "admin-token");
    vi.mocked(api.me).mockResolvedValue(adminUser);
    vi.mocked(api.listUsers).mockResolvedValue([
      adminUser,
      { ...regularUser, id: 12, full_name: "Sam Rivera", email: "sam@example.com" },
    ]);
    renderApp("/admin/users");
    expect(await screen.findByRole("heading", { name: "People" })).toBeInTheDocument();
    expect(await screen.findByText("Sam Rivera")).toBeInTheDocument();
    const directory = screen.getByText("User directory").closest("section");
    expect(directory).not.toBeNull();
    await user.type(screen.getByLabelText("Search users"), "alex");
    expect(await within(directory!).findByText("Alex Admin")).toBeInTheDocument();
    expect(within(directory!).queryByText("Sam Rivera")).not.toBeInTheDocument();
  });
});

describe("task management", () => {
  it("creates and deletes a task after explicit confirmation", async () => {
    const user = userEvent.setup();
    sessionStorage.setItem("daymark_access_token", "user-token");
    vi.mocked(api.listTasks).mockResolvedValue(page([firstTask]));
    vi.mocked(api.createTask).mockImplementation(async (input) => ({
      ...firstTask, ...input, id: 8,
    }));
    vi.mocked(api.deleteTask).mockResolvedValue(undefined);
    renderApp("/dashboard");

    await user.click(await screen.findByRole("button", { name: "New task" }));
    await user.type(screen.getByLabelText("Task name"), "Prepare notes");
    await user.click(screen.getByRole("button", { name: "Create task" }));
    await waitFor(() => expect(api.createTask).toHaveBeenCalledWith({
      title: "Prepare notes", description: null, status: "todo", priority: "medium", due_date: null,
    }));

    await user.click(screen.getByRole("button", { name: "Delete Plan the launch" }));
    expect(screen.getByRole("dialog", { name: "Delete this task?" })).toBeInTheDocument();
    expect(api.deleteTask).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Delete task" }));
    await waitFor(() => expect(api.deleteTask).toHaveBeenCalledWith(7));
  });

  it("opens task details and saves an edit", async () => {
    const user = userEvent.setup();
    sessionStorage.setItem("daymark_access_token", "user-token");
    vi.mocked(api.listTasks).mockResolvedValue(page([firstTask]));
    vi.mocked(api.updateTask).mockResolvedValue({ ...firstTask, title: "Launch checklist" });
    renderApp("/dashboard");

    await user.click(await screen.findByRole("button", { name: "View Plan the launch" }));
    expect(within(screen.getByRole("dialog")).getByText("Write a short checklist")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Edit task" }));
    const title = screen.getByLabelText("Task name");
    await user.clear(title);
    await user.type(title, "Launch checklist");
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(api.updateTask).toHaveBeenCalledWith(7, {
      title: "Launch checklist",
      description: "Write a short checklist",
      status: "todo",
      priority: "high",
      due_date: null,
    }));
  });
});

describe("chat assistant", () => {
  it("shows the backend result and sends the exact delete confirmation command", async () => {
    const user = userEvent.setup();
    sessionStorage.setItem("daymark_access_token", "user-token");
    const deletedResult: ChatbotResult = { response: "Task 7 deleted.", tasks_affected: [7] };
    vi.mocked(api.sendChatMessage)
      .mockResolvedValueOnce({ response: 'To permanently delete task 7, send "confirm delete task 7".', tasks_affected: null })
      .mockResolvedValueOnce(deletedResult);
    renderApp("/dashboard");
    await screen.findByRole("heading", { name: /good (morning|afternoon|evening), morgan/i });

    await user.click(screen.getByRole("button", { name: "Open task assistant" }));
    await user.type(screen.getByLabelText("Message the task assistant"), "Delete task 7");
    await user.click(screen.getByRole("button", { name: "Send message" }));
    expect(await screen.findByText(/confirm delete task 7/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Confirm deletion" }));
    expect(await screen.findByText("Confirmed task operation · #7")).toBeInTheDocument();
    expect(api.sendChatMessage).toHaveBeenNthCalledWith(2, "confirm delete task 7");
  });

  it("refreshes task lists and summaries after a chatbot mutation", async () => {
    const user = userEvent.setup();
    sessionStorage.setItem("daymark_access_token", "user-token");
    vi.mocked(api.sendChatMessage).mockResolvedValue({
      response: "Task 8 created.",
      tasks_affected: [8],
    });
    renderApp("/dashboard");
    await screen.findByRole("heading", { name: /good (morning|afternoon|evening), morgan/i });
    await waitFor(() => expect(api.listTasks).toHaveBeenCalledTimes(5));

    await user.click(screen.getByRole("button", { name: "Open task assistant" }));
    await user.type(screen.getByLabelText("Message the task assistant"), "Create a task");
    await user.click(screen.getByRole("button", { name: "Send message" }));

    expect(await screen.findByText("Confirmed task operation · #8")).toBeInTheDocument();
    await waitFor(() => expect(api.listTasks).toHaveBeenCalledTimes(10));
  });

  it("offers retry when the chatbot request fails", async () => {
    const user = userEvent.setup();
    sessionStorage.setItem("daymark_access_token", "user-token");
    vi.mocked(api.sendChatMessage)
      .mockRejectedValueOnce(new Error("service unavailable"))
      .mockResolvedValueOnce({ response: "Found 0 task(s):", tasks_affected: null });
    renderApp("/dashboard");
    await screen.findByRole("heading", { name: /good (morning|afternoon|evening), morgan/i });
    await user.click(screen.getByRole("button", { name: "Open task assistant" }));
    await user.type(screen.getByLabelText("Message the task assistant"), "List my tasks");
    await user.click(screen.getByRole("button", { name: "Send message" }));
    expect(await screen.findByText(/couldn't reach the assistant/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("Found 0 task(s):")).toBeInTheDocument();
    expect(api.sendChatMessage).toHaveBeenNthCalledWith(2, "List my tasks");
  });
});

describe("sign-out", () => {
  it("clears the session and redirects to login", async () => {
    const user = userEvent.setup();
    sessionStorage.setItem("daymark_access_token", "user-token");
    renderApp("/dashboard");
    await screen.findByRole("heading", { name: /good (morning|afternoon|evening), morgan/i });
    await user.click(screen.getByRole("button", { name: "Sign out" }));
    expect(await screen.findByRole("heading", { name: "Sign in to your space" })).toBeInTheDocument();
    expect(sessionStorage.getItem("daymark_access_token")).toBeNull();
  });
});
