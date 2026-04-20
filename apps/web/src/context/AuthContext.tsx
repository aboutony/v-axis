// apps/web/src/context/AuthContext.tsx

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import type {
  User,
  Tenant,
  LoginInput,
  BootstrapInput,
  BootstrapResponse,
  MfaEnrollment,
  PlatformBootstrap,
} from "../types/auth";
import * as api from "../lib/api";

interface AuthContextType {
  user: User | null;
  tenant: Tenant | null;
  accessToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  platformState: PlatformBootstrap | null;
  login: (input: LoginInput) => Promise<void>;
  logout: () => Promise<void>;
  bootstrap: (input: BootstrapInput) => Promise<BootstrapResponse>;
  checkPlatformState: () => Promise<PlatformBootstrap>;
  beginMfaSetup: () => Promise<MfaEnrollment>;
  verifyMfa: (code: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [platformState, setPlatformState] = useState<PlatformBootstrap | null>(
    null,
  );

  // Check for existing session on mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Try to refresh session
        const response = await api.refreshSession();
        if (response.accessToken) {
          setAccessToken(response.accessToken);
          setUser(response.user as User);
          setTenant(response.tenant);
        }
      } catch {
        // No valid session, that's okay
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const checkPlatformState =
    useCallback(async (): Promise<PlatformBootstrap> => {
      const state = await api.fetchPlatformBootstrap();
      setPlatformState(state);
      return state;
    }, []);

  const login = useCallback(async (input: LoginInput) => {
    setIsLoading(true);
    try {
      const response = await api.login(input);
      setAccessToken(response.accessToken);
      setUser(response.user as User);
      setTenant(response.tenant);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await api.logout();
    } finally {
      setAccessToken(null);
      setUser(null);
      setTenant(null);
      setIsLoading(false);
    }
  }, []);

  const bootstrap = useCallback(
    async (input: BootstrapInput) => {
      setIsLoading(true);
      try {
        const response = await api.bootstrapClient(input);
        // After bootstrap, update platform state
        await checkPlatformState();
        return response;
      } finally {
        setIsLoading(false);
      }
    },
    [checkPlatformState],
  );

  const beginMfaSetup = useCallback(async () => {
    if (!accessToken) throw new Error("Not authenticated");
    const response = await api.beginMfaEnrollment(accessToken);
    return response.enrollment;
  }, [accessToken]);

  const verifyMfa = useCallback(
    async (code: string) => {
      if (!accessToken) throw new Error("Not authenticated");
      const response = await api.verifyTotpEnrollment(accessToken, code);
      setUser(response.user as User);
    },
    [accessToken],
  );

  const value: AuthContextType = {
    user,
    tenant,
    accessToken,
    isLoading,
    isAuthenticated: !!accessToken && !!user,
    platformState,
    login,
    logout,
    bootstrap,
    checkPlatformState,
    beginMfaSetup,
    verifyMfa,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
