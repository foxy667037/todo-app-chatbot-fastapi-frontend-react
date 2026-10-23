import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./features/auth/AuthContext";
import { LoginPage, RegisterPage } from "./features/auth/AuthPages";
import { DashboardPage } from "./features/dashboard/DashboardPage";
import { UsersPage } from "./features/admin/UsersPage";
import type { ReactNode } from "react";

function LoadingScreen() {
  return <main className="route-loading"><span className="loading-mark" /><p>Preparing your workspace…</p></main>;
}

function RequireAuth({ children, adminOnly = false }: { children: ReactNode; adminOnly?: boolean }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== "admin") return <Navigate to="/dashboard" replace />;
  return children;
}

function HomeRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  return <Navigate to={user?.role === "admin" ? "/admin" : user ? "/dashboard" : "/login"} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route element={<LoginPage />} path="/login" />
      <Route element={<RegisterPage />} path="/register" />
      <Route element={<RequireAuth><DashboardPage /></RequireAuth>} path="/dashboard" />
      <Route element={<RequireAuth adminOnly><DashboardPage admin /></RequireAuth>} path="/admin" />
      <Route element={<RequireAuth adminOnly><UsersPage /></RequireAuth>} path="/admin/users" />
      <Route element={<HomeRedirect />} path="/" />
      <Route element={<HomeRedirect />} path="*" />
    </Routes>
  );
}
