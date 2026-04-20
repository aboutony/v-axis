// apps/web/src/pages/WorkspaceContainer.tsx
// Container that bridges AuthContext with the existing WorkspacePage

import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuth } from "../context/AuthContext";
import { WorkspacePage } from "./WorkspacePage";
import type { AuthSession } from "../lib/api";

// Create a query client for the workspace
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000,
      retry: 1,
    },
  },
});

export default function WorkspaceContainer() {
  const { user, tenant, accessToken, isAuthenticated, isLoading, logout } =
    useAuth();
  const [session, setSession] = useState<AuthSession | null>(null);

  useEffect(() => {
    if (accessToken && user && tenant) {
      setSession({
        accessToken,
        refreshTokenExpiresAt: "", // Not needed for workspace operations
        user: {
          ...user,
          role: user.role as any,
        },
        tenant,
        message: "Authenticated",
      });
    } else {
      setSession(null);
    }
  }, [accessToken, user, tenant]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      window.location.href = "/login";
    }
  }, [isAuthenticated, isLoading]);

  const handleSessionChange = (newSession: AuthSession | null) => {
    if (!newSession) {
      logout();
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium">Loading workspace...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !session) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <WorkspacePage session={session} onSessionChange={handleSessionChange} />
    </QueryClientProvider>
  );
}
