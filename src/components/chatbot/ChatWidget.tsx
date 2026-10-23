import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Bot, Check, LoaderCircle, MessageCircle, Send, Sparkles, X } from "lucide-react";
import { api } from "../../api/client";

interface ChatEntry {
  id: number;
  role: "user" | "assistant";
  text: string;
  affected?: number[] | null;
  retryMessage?: string;
}

export function ChatWidget() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatEntry[]>([]);
  const [lastFailed, setLastFailed] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: (message: string) => api.sendChatMessage(message),
    onSuccess: (result) => {
      setLastFailed(null);
      setMessages((current) => [
        ...current,
        {
          id: Date.now() + 1,
          role: "assistant",
          text: result.response,
          affected: result.tasks_affected,
        },
      ]);
      if (result.tasks_affected?.length) {
        void queryClient.invalidateQueries({ queryKey: ["tasks"] });
        void queryClient.invalidateQueries({ queryKey: ["task-count"] });
      }
      setInput("");
    },
    onError: (_error, sentMessage) => {
      setLastFailed(sentMessage);
      setMessages((current) => [
        ...current,
        {
          id: Date.now() + 1,
          role: "assistant",
          text: "I couldn't reach the assistant. Your message wasn't confirmed — please try again.",
          retryMessage: sentMessage,
        },
      ]);
    },
  });

  function send(message: string) {
    const clean = message.trim();
    if (!clean || mutation.isPending) return;
    setMessages((current) => [...current, { id: Date.now(), role: "user", text: clean }]);
    mutation.mutate(clean);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    send(input);
  }

  const confirmation = messages.at(-1)?.role === "assistant"
    ? messages.at(-1)?.text.match(/confirm delete task (\d+)/i)?.[1]
    : undefined;

  return (
    <>
      {open && (
        <section aria-label="Task assistant" className="chat-panel">
          <header className="chat-header">
            <div className="chat-avatar"><Bot size={19} /></div>
            <div><strong>Your task assistant</strong><span><span className="online-dot" /> Connected securely</span></div>
            <button aria-label="Close assistant" className="icon-button chat-close" onClick={() => setOpen(false)} type="button"><X size={19} /></button>
          </header>
          <div aria-live="polite" className="chat-messages">
            {messages.length === 0 ? (
              <div className="chat-welcome">
                <span className="welcome-sparkle"><Sparkles size={21} /></span>
                <strong>What can I help you with?</strong>
                <p>Ask me to create, find, view, or update a task.</p>
                <button className="suggestion" onClick={() => send("Show me my tasks")} type="button">Show my tasks <span>↗</span></button>
                <button className="suggestion" onClick={() => send("Help me plan a task")} type="button">Help me plan a task <span>↗</span></button>
              </div>
            ) : messages.map((message) => (
              <div className={`chat-message ${message.role}`} key={message.id}>
                <div className="chat-bubble">{message.text}</div>
                {message.affected?.length ? (
                  <div className="chat-operation"><Check size={14} /> Confirmed task operation · {message.affected.map((id) => `#${id}`).join(", ")}</div>
                ) : null}
                {message.retryMessage && lastFailed === message.retryMessage && (
                  <button className="text-button" disabled={mutation.isPending} onClick={() => send(message.retryMessage!)} type="button">Retry</button>
                )}
              </div>
            ))}
            {mutation.isPending && <div className="typing-indicator"><LoaderCircle className="spin" size={16} /> Thinking…</div>}
            {confirmation && (
              <div className="confirmation-callout">
                <p>This will permanently delete task #{confirmation}. Confirm only if you’re sure.</p>
                <button className="button button-danger button-small" disabled={mutation.isPending} onClick={() => send(`confirm delete task ${confirmation}`)} type="button">
                  Confirm deletion
                </button>
              </div>
            )}
          </div>
          <form className="chat-composer" onSubmit={submit}>
            <label className="sr-only" htmlFor="chat-message">Message the task assistant</label>
            <input id="chat-message" maxLength={4000} onChange={(event) => setInput(event.target.value)} placeholder="Ask about your tasks…" value={input} />
            <button aria-label="Send message" className="send-button" disabled={!input.trim() || mutation.isPending} type="submit"><Send size={17} /></button>
          </form>
          <p className="chat-footnote">Your assistant can only access tasks permitted by your account.</p>
        </section>
      )}
      <button
        aria-expanded={open}
        aria-label={open ? "Close task assistant" : "Open task assistant"}
        className={`chat-launcher ${open ? "is-open" : ""}`}
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        {open ? <X size={21} /> : <><MessageCircle size={20} /><span>Ask AI</span></>}
      </button>
    </>
  );
}
