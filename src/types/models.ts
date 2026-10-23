export type TaskStatus = "todo" | "in_progress" | "completed";
export type TaskPriority = "low" | "medium" | "high";

export interface User {
  id: number;
  full_name: string;
  email: string;
  role: "admin" | "user";
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  owner_id: number;
  created_at: string;
  updated_at: string;
}

export interface TaskPage {
  items: Task[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface TaskInput {
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
}

export interface TaskFilters {
  page: number;
  size: number;
  search?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
}

export interface ChatbotResult {
  response: string;
  tasks_affected: number[] | null;
}
