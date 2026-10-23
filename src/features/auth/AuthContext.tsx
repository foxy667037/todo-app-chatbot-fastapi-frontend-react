import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { api, setAccessToken, setUnauthorizedHandler } from "../../api/client";
import type { User } from "../../types/models";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signIn: (token: string, user: User) => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const TOKEN_KEY = "daymark_access_token";

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [token, setToken] = useState(() => sessionStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(Boolean(token));
  const validatedToken = useRef<string | null>(null);

  const signOut = useCallback(() => {
    sessionStorage.removeItem(TOKEN_KEY);
    setAccessToken(null);
    setToken(null);
    setUser(null);
    queryClient.clear();
    navigate("/login", { replace: true });
  }, [navigate, queryClient]);

  const signIn = useCallback((newToken: string, newUser: User) => {
    sessionStorage.setItem(TOKEN_KEY, newToken);
    setAccessToken(newToken);
    setToken(newToken);
    setUser(newUser);
    validatedToken.current = newToken;
    setLoading(false);
  }, []);

  useEffect(() => {
    setAccessToken(token);
    if (!token) {
      setLoading(false);
      return;
    }
    if (validatedToken.current === token) {
      validatedToken.current = null;
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    api.me(controller.signal)
      .then(setUser)
      .catch(() => {
        if (controller.signal.aborted) return;
        sessionStorage.removeItem(TOKEN_KEY);
        setAccessToken(null);
        setToken(null);
        setUser(null);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [token]);

  useEffect(() => {
    setUnauthorizedHandler(signOut);
    return () => setUnauthorizedHandler(null);
  }, [signOut]);

  const value = useMemo(() => ({ user, loading, signIn, signOut }), [
    user,
    loading,
    signIn,
    signOut,
  ]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
