import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, Search, ShieldCheck, UserRound, UsersRound } from "lucide-react";
import { AppShell } from "../../components/layout/AppShell";
import { api } from "../../api/client";
import { useAuth } from "../auth/AuthContext";

export function UsersPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const query = useQuery({
    queryKey: ["users", user?.id],
    queryFn: ({ signal }) => api.listUsers(signal),
    enabled: user?.role === "admin",
  });
  const users = useMemo(() => {
    const value = search.trim().toLocaleLowerCase();
    return (query.data ?? []).filter((item) =>
      !value || item.full_name.toLocaleLowerCase().includes(value) || item.email.toLocaleLowerCase().includes(value),
    );
  }, [query.data, search]);

  return (
    <AppShell admin usersPage>
      <div className="dashboard-content">
        <div className="page-heading">
          <div>
            <span className="eyebrow">ADMINISTRATOR</span>
            <h1>People</h1>
            <p>Accounts registered in your workspace. User information is read-only.</p>
          </div>
          <span className="people-count"><UsersRound size={16} />{query.data?.length ?? "—"} users</span>
        </div>
        <section className="task-section users-section">
          <div className="section-heading">
            <div><h2>User directory</h2><p>Account access and task ownership at a glance.</p></div>
          </div>
          <label className="search-control users-search">
            <Search size={17} /><span className="sr-only">Search users</span>
            <input onChange={(event) => setSearch(event.target.value)} placeholder="Search by name or email…" value={search} />
          </label>
          {query.isPending ? <div className="state-panel"><span className="loading-mark" /><p>Loading users…</p></div>
            : query.isError ? <div className="state-panel state-error">
              <span className="state-icon error-icon"><AlertCircle size={21} /></span>
              <h3>User list couldn’t be loaded</h3><p>{query.error.message}</p>
              <button className="button button-secondary" onClick={() => void query.refetch()} type="button">Try again</button>
            </div>
              : users.length === 0 ? <div className="state-panel">
                <span className="state-icon"><UserRound size={21} /></span>
                <h3>{search ? "No users found" : "No accounts yet"}</h3>
                <p>{search ? "Try another name or email address." : "Registered accounts will appear here."}</p>
              </div>
                : <div className="user-list">
                  {users.map((item) => (
                    <article className="user-row" key={item.id}>
                      <span className="profile-avatar user-avatar">{item.full_name.slice(0, 1).toUpperCase()}</span>
                      <div className="user-info"><strong>{item.full_name}</strong><span>{item.email}</span></div>
                      <span className={`user-role ${item.role === "admin" ? "role-admin" : ""}`}>
                        {item.role === "admin" && <ShieldCheck size={14} />}{item.role === "admin" ? "Administrator" : "Member"}
                      </span>
                      <span className={`user-account-status ${item.is_active ? "account-active" : "account-inactive"}`}>
                        <span />{item.is_active ? "Active" : "Inactive"}
                      </span>
                      <span className="user-joined">Joined {new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date(item.created_at))}</span>
                    </article>
                  ))}
                </div>}
          {!query.isPending && !query.isError && <footer className="list-footer"><span>Showing {users.length} of {query.data?.length ?? 0} users</span><span>Managed by your account administrator</span></footer>}
        </section>
      </div>
    </AppShell>
  );
}
