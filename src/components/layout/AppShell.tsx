import { useState } from "react";
import { NavLink } from "react-router-dom";
import { Bot, ChevronDown, CircleUserRound, LayoutDashboard, ListTodo, LogOut, Menu, UsersRound, X } from "lucide-react";
import { useAuth } from "../../features/auth/AuthContext";
import { ChatWidget } from "../chatbot/ChatWidget";
import type { ReactNode } from "react";

export function AppShell({ children, admin = false, usersPage = false }: { children: ReactNode; admin?: boolean; usersPage?: boolean }) {
  const { user, signOut } = useAuth();
  const [mobileNav, setMobileNav] = useState(false);
  const home = admin ? "/admin" : "/dashboard";

  return (
    <div className="app-frame">
      <aside className={`sidebar ${mobileNav ? "sidebar-open" : ""}`}>
        <div className="sidebar-top">
          <NavLink className="brand" onClick={() => setMobileNav(false)} to={home}>
            <span className="brand-mark"><ListTodo size={20} /></span><span>daymark</span>
          </NavLink>
          <button aria-label="Close navigation" className="icon-button mobile-close" onClick={() => setMobileNav(false)} type="button"><X size={19} /></button>
        </div>
        <div className="workspace-label">WORKSPACE</div>
        <nav aria-label="Main navigation" className="main-nav">
          <NavLink end className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`} onClick={() => setMobileNav(false)} to={home}>
            <LayoutDashboard size={18} /><span>{admin ? "Overview" : "My tasks"}</span>
          </NavLink>
          {admin && <NavLink className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`} onClick={() => setMobileNav(false)} to="/admin/users"><UsersRound size={18} /><span>Users</span></NavLink>}
        </nav>
        <div className="sidebar-note">
          <div className="note-icon"><Bot size={17} /></div>
          <strong>A hand when you need it</strong>
          <p>Your AI assistant can help organize your next step.</p>
        </div>
        <div className="sidebar-bottom">
          <div className="profile-card">
            <div className="profile-avatar">{user?.full_name.slice(0, 1).toUpperCase()}</div>
            <div className="profile-copy"><strong>{user?.full_name}</strong><span>{admin ? "Administrator" : "Personal workspace"}</span></div>
            <ChevronDown size={16} />
          </div>
          <button className="signout-button" onClick={signOut} type="button"><LogOut size={17} /> Sign out</button>
        </div>
      </aside>
      {mobileNav && <button aria-label="Close navigation overlay" className="sidebar-scrim" onClick={() => setMobileNav(false)} type="button" />}
      <div className="main-column">
        <header className="topbar">
          <button aria-label="Open navigation" className="icon-button mobile-menu" onClick={() => setMobileNav(true)} type="button"><Menu size={20} /></button>
          <div className="breadcrumb"><span>Workspace</span><span className="breadcrumb-divider">/</span><strong>{usersPage ? "Users" : admin ? "Overview" : "My tasks"}</strong></div>
          <div className="topbar-right">
            <span className="topbar-date">{new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric" }).format(new Date())}</span>
            <span className="topbar-divider" />
            <span className="topbar-user"><CircleUserRound size={17} /> {user?.full_name}</span>
          </div>
        </header>
        <main className="page-content">{children}</main>
      </div>
      <ChatWidget />
    </div>
  );
}
