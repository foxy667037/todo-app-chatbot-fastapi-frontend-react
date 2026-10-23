import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Check, ChevronLeft, ChevronRight, CircleAlert, CircleCheck, Clock3, ListFilter, LoaderCircle, Plus, Search, ShieldCheck, SlidersHorizontal, SquarePen, Trash2, Users, X } from "lucide-react";
import { AppShell } from "../../components/layout/AppShell";
import { Modal } from "../../components/common/Modal";
import { TaskForm } from "../../components/tasks/TaskForm";
import { api } from "../../api/client";
import { useAuth } from "../auth/AuthContext";
import type { Task, TaskInput, TaskPriority, TaskStatus, User } from "../../types/models";

const pageSize = 20;
const statuses: TaskStatus[] = ["todo", "in_progress", "completed"];
const statusLabel: Record<TaskStatus, string> = {
  todo: "To do",
  in_progress: "In progress",
  completed: "Completed",
};
const priorityLabel: Record<TaskPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

function formatDate(value: string | null) {
  if (!value) return "No due date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function StatCard({ title, count, kind, icon: Icon, loading }: {
  title: string;
  count: number | undefined;
  kind: string;
  icon: typeof Check;
  loading: boolean;
}) {
  return (
    <article className={`stat-card stat-${kind}`}>
      <div className="stat-top">
        <span>{title}</span>
        <span className="stat-icon"><Icon size={18} /></span>
      </div>
      <strong className="stat-value">{loading ? <span className="skeleton-number" /> : count ?? "—"}</strong>
      <span className="stat-caption">{kind === "total" ? "Across your workspace" : "Tasks right now"}</span>
    </article>
  );
}

function TaskLabels({ task }: { task: Task }) {
  return (
    <div className="task-labels">
      <span className={`status-chip status-${task.status}`}><span />{statusLabel[task.status]}</span>
      <span className={`priority-chip priority-${task.priority}`}>{priorityLabel[task.priority]}</span>
    </div>
  );
}

export function DashboardPage({ admin = false }: { admin?: boolean }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<TaskStatus | "">("");
  const [priority, setPriority] = useState<TaskPriority | "">("");
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState<"create" | "edit" | "details" | "delete" | null>(null);
  const [selected, setSelected] = useState<Task | null>(null);
  const [notice, setNotice] = useState("");
  const [mutationError, setMutationError] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const filters = useMemo(() => ({
    page,
    size: pageSize,
    ...(search ? { search } : {}),
    ...(status ? { status } : {}),
    ...(priority ? { priority } : {}),
  }), [page, search, status, priority]);

  const taskQuery = useQuery({
    queryKey: ["tasks", user?.id, filters],
    queryFn: ({ signal }) => api.listTasks(filters, signal),
    enabled: Boolean(user),
  });
  const statQueries = useQueries({
    queries: [
      { queryKey: ["task-count", user?.id, "all"], queryFn: ({ signal }) => api.listTasks({ page: 1, size: 1 }, signal), enabled: Boolean(user) },
      ...statuses.map((taskStatus) => ({
        queryKey: ["task-count", user?.id, taskStatus],
        queryFn: ({ signal }: { signal: AbortSignal }) => api.listTasks({ page: 1, size: 1, status: taskStatus }, signal),
        enabled: Boolean(user),
      })),
    ],
  });
  const usersQuery = useQuery({
    queryKey: ["users", user?.id],
    queryFn: ({ signal }) => api.listUsers(signal),
    enabled: admin && user?.role === "admin",
  });
  const usersById = useMemo(
    () => new Map<number, User>((usersQuery.data ?? []).map((item): [number, User] => [item.id, item])),
    [usersQuery.data],
  );

  const refreshData = () => {
    void queryClient.invalidateQueries({ queryKey: ["tasks"] });
    void queryClient.invalidateQueries({ queryKey: ["task-count"] });
  };
  const createMutation = useMutation({
    mutationFn: (input: TaskInput) => api.createTask(input),
    onSuccess: () => { refreshData(); setModal(null); setNotice("Your task has been created."); setMutationError(""); },
    onError: (error: Error) => setMutationError(error.message),
  });
  const updateMutation = useMutation({
    mutationFn: (input: TaskInput) => api.updateTask(selected!.id, input),
    onSuccess: () => { refreshData(); setModal(null); setNotice("Your changes have been saved."); setMutationError(""); },
    onError: (error: Error) => setMutationError(error.message),
  });
  const deleteMutation = useMutation({
    mutationFn: () => api.deleteTask(selected!.id),
    onSuccess: () => { refreshData(); setModal(null); setNotice("Task deleted."); setMutationError(""); },
    onError: (error: Error) => setMutationError(error.message),
  });
  const openModal = (kind: typeof modal, task?: Task) => {
    setSelected(task ?? null);
    setMutationError("");
    setModal(kind);
  };
  const total = taskQuery.data?.total ?? 0;
  const pages = taskQuery.data?.pages ?? 0;
  const statValues = statQueries.map((query) => query.data?.total);
  const statsLoading = statQueries.some((query) => query.isPending);
  const totalLoadingError = statQueries.find((query) => query.isError)?.error as Error | undefined;
  const rows = taskQuery.data?.items ?? [];

  return (
    <AppShell admin={admin}>
      <div className="dashboard-content">
        <div className="page-heading">
          <div>
            <span className="eyebrow">{admin ? "ADMINISTRATOR" : "YOUR SPACE"}</span>
            <h1>{admin ? "Team overview" : `Good ${new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"}, ${user?.full_name.split(" ")[0] ?? "there"}`}</h1>
            <p>{admin ? "Keep a clear view of work across every account." : "A clear view of what’s on your plate today."}</p>
          </div>
          <button className="button button-primary create-task-button" onClick={() => openModal("create")} type="button"><Plus size={18} /> New task</button>
        </div>

        <section aria-label="Task summary" className="stats-grid">
          <StatCard count={statValues[0]} icon={ListFilter} kind="total" loading={statsLoading} title="Total tasks" />
          <StatCard count={statValues[1]} icon={Clock3} kind="todo" loading={statsLoading} title="To do" />
          <StatCard count={statValues[2]} icon={LoaderCircle} kind="progress" loading={statsLoading} title="In progress" />
          <StatCard count={statValues[3]} icon={CircleCheck} kind="completed" loading={statsLoading} title="Completed" />
        </section>
        {totalLoadingError && <div className="inline-error" role="alert"><CircleAlert size={17} /> Summary counts couldn’t be loaded. <button onClick={() => void queryClient.invalidateQueries({ queryKey: ["task-count"] })} type="button">Try again</button></div>}

        <section aria-label={admin ? "All users’ tasks" : "Your tasks"} className="task-section">
          <div className="section-heading">
            <div>
              <h2>{admin ? "All tasks" : "Your tasks"} <span className="task-total">{total}</span></h2>
              <p>{admin ? "Review and manage tasks across your organization." : "Everything you’re working on, in one place."}</p>
            </div>
            {admin && <div className="admin-badge"><ShieldCheck size={15} /> Admin view</div>}
          </div>
          <div className="filters-bar">
            <label className="search-control">
              <Search size={17} />
              <span className="sr-only">Search tasks</span>
              <input maxLength={255} onChange={(event) => setSearchInput(event.target.value)} placeholder="Search tasks…" value={searchInput} />
              {searchInput && <button aria-label="Clear search" className="clear-search" onClick={() => setSearchInput("")} type="button"><X size={15} /></button>}
            </label>
            <label className="filter-select">
              <SlidersHorizontal size={15} /><span className="sr-only">Filter by status</span>
              <select onChange={(event) => { setStatus(event.target.value as TaskStatus | ""); setPage(1); }} value={status}>
                <option value="">All statuses</option>
                {statuses.map((item) => <option key={item} value={item}>{statusLabel[item]}</option>)}
              </select>
            </label>
            <label className="filter-select">
              <ListFilter size={15} /><span className="sr-only">Filter by priority</span>
              <select onChange={(event) => { setPriority(event.target.value as TaskPriority | ""); setPage(1); }} value={priority}>
                <option value="">All priorities</option>
                {(["low", "medium", "high"] as const).map((item) => <option key={item} value={item}>{priorityLabel[item]} priority</option>)}
              </select>
            </label>
          </div>

          {taskQuery.isPending ? (
            <div className="state-panel"><span className="loading-mark" /><p>Loading your tasks…</p></div>
          ) : taskQuery.isError ? (
            <div className="state-panel state-error">
              <span className="state-icon error-icon"><CircleAlert size={21} /></span>
              <h3>Tasks couldn’t be loaded</h3><p>{taskQuery.error.message}</p>
              <button className="button button-secondary" onClick={() => void taskQuery.refetch()} type="button">Try again</button>
            </div>
          ) : rows.length === 0 ? (
            <div className="state-panel empty-state">
              <span className="state-icon"><Check size={21} /></span>
              <h3>{search || status || priority ? "No tasks match those filters" : "A fresh page"}</h3>
              <p>{search || status || priority ? "Try changing your search or filters." : "Create a task to start bringing your plans together."}</p>
              {search || status || priority
                ? <button className="button button-secondary" onClick={() => { setSearchInput(""); setStatus(""); setPriority(""); }} type="button">Clear filters</button>
                : <button className="button button-primary" onClick={() => openModal("create")} type="button"><Plus size={17} /> Create your first task</button>}
            </div>
          ) : (
            <>
              <div className="task-list">
                {rows.map((task) => (
                  <article className="task-row" key={task.id}>
                    <button aria-label={`View ${task.title}`} className="task-main" onClick={() => openModal("details", task)} type="button">
                      <span className={`task-check task-check-${task.status}`}>{task.status === "completed" && <Check size={14} />}</span>
                      <span className="task-copy">
                        <strong className={task.status === "completed" ? "task-done" : ""}>{task.title}</strong>
                        <span className="task-description">{task.description || "No description added"}</span>
                      </span>
                    </button>
                    <div className="task-meta">
                      <TaskLabels task={task} />
                      <span className={`due-date ${task.due_date && new Date(task.due_date).getTime() < Date.now() && task.status !== "completed" ? "is-overdue" : ""}`}>
                        <CalendarDays size={14} />{formatDate(task.due_date)}
                      </span>
                      {admin && <span className="owner-name"><Users size={14} />{usersQuery.isPending ? "Loading owner…" : usersById.get(task.owner_id)?.full_name ?? `User #${task.owner_id}`}</span>}
                    </div>
                    <div className="task-actions">
                      <button aria-label={`Edit ${task.title}`} className="icon-button" onClick={() => openModal("edit", task)} type="button"><SquarePen size={17} /></button>
                      <button aria-label={`Delete ${task.title}`} className="icon-button danger-hover" onClick={() => openModal("delete", task)} type="button"><Trash2 size={17} /></button>
                    </div>
                  </article>
                ))}
              </div>
              <footer className="list-footer">
                <span>Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total} tasks</span>
                <div className="pagination">
                  <button aria-label="Previous page" className="icon-button" disabled={page <= 1} onClick={() => setPage((current) => current - 1)} type="button"><ChevronLeft size={18} /></button>
                  <span>Page {page} of {Math.max(pages, 1)}</span>
                  <button aria-label="Next page" className="icon-button" disabled={pages === 0 || page >= pages} onClick={() => setPage((current) => current + 1)} type="button"><ChevronRight size={18} /></button>
                </div>
              </footer>
            </>
          )}
          {admin && usersQuery.isError && <div className="inline-error" role="alert"><CircleAlert size={17} /> Owner names are unavailable. Task owner IDs are still shown; <button onClick={() => void usersQuery.refetch()} type="button">retry user list</button>.</div>}
        </section>
      </div>

      {notice && <div className="toast-success" role="status"><Check size={17} />{notice}<button aria-label="Dismiss notification" onClick={() => setNotice("")} type="button"><X size={15} /></button></div>}
      {modal === "create" && <Modal onClose={() => setModal(null)} title="Create a task" description="Add the details and choose what matters most.">
        <TaskForm busy={createMutation.isPending} error={mutationError} onCancel={() => setModal(null)} onSubmit={(input) => createMutation.mutate(input)} />
      </Modal>}
      {modal === "edit" && selected && <Modal onClose={() => setModal(null)} title="Edit task" description={`Update the details for “${selected.title}”.`}>
        <TaskForm busy={updateMutation.isPending} error={mutationError} onCancel={() => setModal(null)} onSubmit={(input) => updateMutation.mutate(input)} task={selected} />
      </Modal>}
      {modal === "details" && selected && <Modal onClose={() => setModal(null)} title="Task details">
        <div className="details-content">
          <h3>{selected.title}</h3>
          <TaskLabels task={selected} />
          <div className="detail-block"><span>Description</span><p>{selected.description || "No description added."}</p></div>
          <div className="detail-facts">
            <div><CalendarDays size={16} /><span>Due date<strong>{formatDate(selected.due_date)}</strong></span></div>
            <div><Users size={16} /><span>Owner<strong>{usersById.get(selected.owner_id)?.full_name ?? (admin ? `User #${selected.owner_id}` : user?.full_name)}</strong></span></div>
          </div>
          <div className="modal-actions"><button className="button button-quiet" onClick={() => setModal(null)} type="button">Close</button><button className="button button-primary" onClick={() => openModal("edit", selected)} type="button"><SquarePen size={16} /> Edit task</button></div>
        </div>
      </Modal>}
      {modal === "delete" && selected && <Modal onClose={() => setModal(null)} title="Delete this task?" description="This action can’t be undone.">
        <div className="delete-content">
          <div className="delete-preview"><span className="task-check"><Check size={14} /></span><strong>{selected.title}</strong></div>
          <p>This task will be permanently removed from your workspace.</p>
          {mutationError && <p className="form-alert" role="alert">{mutationError}</p>}
          <div className="modal-actions"><button className="button button-quiet" onClick={() => setModal(null)} type="button">Keep task</button><button className="button button-danger" disabled={deleteMutation.isPending} onClick={() => deleteMutation.mutate()} type="button"><Trash2 size={16} />{deleteMutation.isPending ? "Deleting…" : "Delete task"}</button></div>
        </div>
      </Modal>}
    </AppShell>
  );
}
