import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import type { Task, TaskInput } from "../../types/models";

const schema = z.object({
  title: z.string().trim().min(1, "A task title is required.").max(255),
  description: z.string().max(4000, "Keep the description under 4,000 characters."),
  status: z.enum(["todo", "in_progress", "completed"]),
  priority: z.enum(["low", "medium", "high"]),
  due_date: z.string(),
});

type FormValues = z.infer<typeof schema>;

function toLocalInput(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

interface TaskFormProps {
  task?: Task;
  busy: boolean;
  error?: string;
  onCancel: () => void;
  onSubmit: (input: TaskInput) => void;
}

export function TaskForm({ task, busy, error, onCancel, onSubmit }: TaskFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: task?.title ?? "",
      description: task?.description ?? "",
      status: task?.status ?? "todo",
      priority: task?.priority ?? "medium",
      due_date: toLocalInput(task?.due_date ?? null),
    },
  });

  return (
    <form
      className="task-form"
      onSubmit={handleSubmit((values) => {
        onSubmit({
          title: values.title.trim(),
          description: values.description.trim() || null,
          status: values.status,
          priority: values.priority,
          due_date: values.due_date ? new Date(values.due_date).toISOString() : null,
        });
      })}
    >
      <label>
        Task name
        <input autoFocus maxLength={255} placeholder="What needs to get done?" {...register("title")} />
        {errors.title && <span className="field-error">{errors.title.message}</span>}
      </label>
      <label>
        Description <span className="label-muted">Optional</span>
        <textarea maxLength={4000} placeholder="Add a few helpful details…" rows={4} {...register("description")} />
        {errors.description && <span className="field-error">{errors.description.message}</span>}
      </label>
      <div className="form-grid">
        <label>
          Status
          <select {...register("status")}>
            <option value="todo">To do</option>
            <option value="in_progress">In progress</option>
            <option value="completed">Completed</option>
          </select>
        </label>
        <label>
          Priority
          <select {...register("priority")}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </label>
      </div>
      <label>
        Due date <span className="label-muted">Optional</span>
        <input type="datetime-local" {...register("due_date")} />
      </label>
      {error && <p className="form-alert" role="alert">{error}</p>}
      <div className="modal-actions">
        <button className="button button-quiet" onClick={onCancel} type="button">Cancel</button>
        <button className="button button-primary" disabled={busy} type="submit">
          {busy ? "Saving…" : task ? "Save changes" : "Create task"}
        </button>
      </div>
    </form>
  );
}
