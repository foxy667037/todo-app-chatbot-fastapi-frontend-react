import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { ArrowRight, CheckCircle2, CircleCheck, ListTodo } from "lucide-react";
import { useForm } from "react-hook-form";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import type { ReactNode } from "react";
import { api, setAccessToken } from "../../api/client";
import { useAuth } from "./AuthContext";
import { loginSchema, registrationSchema, type LoginValues, type RegistrationValues } from "./schemas";

function AuthFrame({ children, mode }: { children: ReactNode; mode: "login" | "register" }) {
  return (
    <main className="auth-page">
      <div className="auth-visual">
        <Link className="brand brand-light" to="/">
          <span className="brand-mark"><ListTodo size={20} /></span>
          <span>daymark</span>
        </Link>
        <div className="auth-visual-copy">
          <span className="eyebrow">MAKE ROOM FOR WHAT MATTERS</span>
          <h1>A little more focus.<br />A lot less noise.</h1>
          <p>Your plans, priorities, and progress — all in one thoughtful place.</p>
          <div className="visual-check"><CheckCircle2 size={18} /> A calmer way to get things done</div>
        </div>
        <span className="visual-footer">Simple by design. Ready when you are.</span>
      </div>
      <section className="auth-panel">
        <div className="auth-mobile-brand">
          <span className="brand-mark"><ListTodo size={20} /></span> daymark
        </div>
        <div className="auth-content">
          {children}
          <p className="auth-switch">
            {mode === "login" ? "New to Daymark?" : "Already have an account?"}{" "}
            <Link to={mode === "login" ? "/register" : "/login"}>
              {mode === "login" ? "Create an account" : "Sign in"}
            </Link>
          </p>
          <p className="auth-security"><CircleCheck size={14} /> Your tasks stay private to your account.</p>
        </div>
      </section>
    </main>
  );
}

function destination(role: string) {
  return role === "admin" ? "/admin" : "/dashboard";
}

export function LoginPage() {
  const { user, signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const form = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });
  const mutation = useMutation({
    mutationFn: async (values: LoginValues) => {
      const result = await api.login(values);
      setAccessToken(result.access_token);
      try {
        return { token: result.access_token, user: await api.me() };
      } catch (error) {
        setAccessToken(null);
        throw error;
      }
    },
    onSuccess: ({ token, user: currentUser }) => {
      signIn(token, currentUser);
      navigate(destination(currentUser.role), { replace: true });
    },
  });
  if (user) return <Navigate to={destination(user.role)} replace />;

  return (
    <AuthFrame mode="login">
      <span className="eyebrow">WELCOME BACK</span>
      <h2>Sign in to your space</h2>
      <p className="auth-intro">Pick up right where you left off.</p>
      {location.state?.registered && <p className="success-alert" role="status">Your account is ready. Sign in to continue.</p>}
      <form className="auth-form" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
        <label>Email address
          <input aria-label="Email address" autoComplete="email" placeholder="you@example.com" {...form.register("email")} />
          {form.formState.errors.email && <span className="field-error">{form.formState.errors.email.message}</span>}
        </label>
        <label>Password
          <input aria-label="Password" autoComplete="current-password" type="password" {...form.register("password")} />
          {form.formState.errors.password && <span className="field-error">{form.formState.errors.password.message}</span>}
        </label>
        {mutation.error && <p className="form-alert" role="alert">{mutation.error.message}</p>}
        <button className="button button-primary button-wide" disabled={mutation.isPending} type="submit">
          {mutation.isPending ? "Signing in…" : "Sign in"} {!mutation.isPending && <ArrowRight size={17} />}
        </button>
      </form>
    </AuthFrame>
  );
}

export function RegisterPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const form = useForm<RegistrationValues>({ resolver: zodResolver(registrationSchema) });
  const mutation = useMutation({
    mutationFn: (values: RegistrationValues) => api.register(values),
    onSuccess: () => navigate("/login", { replace: true, state: { registered: true } }),
  });
  if (user) return <Navigate to={destination(user.role)} replace />;

  return (
    <AuthFrame mode="register">
      <span className="eyebrow">GET STARTED</span>
      <h2>Create your account</h2>
      <p className="auth-intro">A fresh start for the things you want to do.</p>
      <form className="auth-form" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
        <label>Full name
          <input aria-label="Full name" autoComplete="name" placeholder="Your name" {...form.register("full_name")} />
          {form.formState.errors.full_name && <span className="field-error">{form.formState.errors.full_name.message}</span>}
        </label>
        <label>Email address
          <input aria-label="Email address" autoComplete="email" placeholder="you@example.com" {...form.register("email")} />
          {form.formState.errors.email && <span className="field-error">{form.formState.errors.email.message}</span>}
        </label>
        <label>Password <span className="label-muted">At least 12 characters</span>
          <input aria-label="Password" autoComplete="new-password" type="password" {...form.register("password")} />
          {form.formState.errors.password && <span className="field-error">{form.formState.errors.password.message}</span>}
        </label>
        {mutation.error && <p className="form-alert" role="alert">{mutation.error.message}</p>}
        <button className="button button-primary button-wide" disabled={mutation.isPending} type="submit">
          {mutation.isPending ? "Creating account…" : "Create account"} {!mutation.isPending && <ArrowRight size={17} />}
        </button>
      </form>
    </AuthFrame>
  );
}
