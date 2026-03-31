import { useEffect, useState } from "react";
import { useMutation, useQuery, type UseQueryResult } from "@tanstack/react-query";
import clsx from "clsx";
import { Navigate, NavLink, Route, Routes } from "react-router-dom";

import {
  bootstrapClient,
  fetchPlatformBootstrap,
  type AuthSession,
  type BootstrapClientInput,
  type PlatformBootstrapResponse,
} from "./lib/api";
import { clearStoredSession, loadStoredSession, storeSession } from "./lib/session";
import { AccessPage } from "./pages/AccessPage";
import { ClientAdminPage } from "./pages/ClientAdminPage";
import { WorkspacePage } from "./pages/WorkspacePage";

type ThemeMode = "light" | "dark";

export function App() {
  const [theme, setTheme] = useState<ThemeMode>("light");
  const [session, setSession] = useState<AuthSession | null>(null);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    setSession(loadStoredSession());
  }, []);

  const platformQuery = useQuery({
    queryKey: ["platform-bootstrap"],
    queryFn: fetchPlatformBootstrap,
  });

  function handleSessionChange(nextSession: AuthSession | null) {
    if (nextSession) {
      storeSession(nextSession);
    } else {
      clearStoredSession();
    }

    setSession(nextSession);
  }

  const hasTenants = platformQuery.data?.platformState.hasTenants ?? false;
  const navigationItems = hasTenants
    ? [
        { label: "Overview", to: "/" },
        { label: "Workspace", to: "/workspace" },
      ]
    : [
        { label: "Overview", to: "/" },
        { label: "Setup", to: "/launchpad" },
      ];

  return (
    <div className="client-shell">
      <aside className="client-sidebar">
        <div className="client-brand">
          <div className="brand-mark">V</div>
          <div>
            <p className="eyebrow">Client Admin Portal</p>
            <h1>V-AXIS</h1>
          </div>
        </div>

        <nav className="client-nav">
          {navigationItems.map((item) => (
            <NavLink
              key={item.to}
              className={({ isActive }) =>
                clsx("client-nav-link", isActive && "client-nav-link-active")
              }
              to={item.to}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="client-side-note">
          <p className="eyebrow">Purpose</p>
          <h2>Built for the person accountable for keeping the company clean.</h2>
          <p>
            Track what is expiring, what is missing, who owns the next action,
            and what puts operating continuity at risk.
          </p>
        </div>
      </aside>

      <main className="client-main">
        <header className="client-topbar">
          <div>
            <p className="eyebrow">Live Workspace</p>
            <h2>
              {session
                ? `${session.tenant.clientName} administration`
                : hasTenants
                  ? "Secure sign-in for your tenant"
                  : "Set up your first client tenant"}
            </h2>
          </div>

          <div className="client-topbar-actions">
            <div className="status-chip">
              {session
                ? session.user.email
                : platformQuery.isLoading
                  ? "Loading"
                  : hasTenants
                    ? "Tenant ready"
                    : "No tenant yet"}
            </div>
            <button
              className="theme-toggle"
              onClick={() =>
                setTheme((current) => (current === "dark" ? "light" : "dark"))
              }
              type="button"
            >
              {theme === "dark" ? "Switch to light" : "Switch to dark"}
            </button>
          </div>
        </header>

        <Routes>
          <Route
            path="/"
            element={
              <HomeEntry
                hasTenants={hasTenants}
                platformQuery={platformQuery}
                session={session}
              />
            }
          />
          <Route
            path="/workspace"
            element={
              <ClientAdminPage
                onSessionChange={handleSessionChange}
                session={session}
              />
            }
          />
          <Route
            path="/launchpad"
            element={
              <LaunchpadPage
                hasTenants={hasTenants}
                onSessionChange={handleSessionChange}
                session={session}
              />
            }
          />
          <Route path="/access" element={<AccessPage />} />
          <Route
            path="/control"
            element={
              <WorkspacePage
                onSessionChange={handleSessionChange}
                session={session}
              />
            }
          />
        </Routes>
      </main>
    </div>
  );
}

function HomeEntry({
  platformQuery,
  session,
  hasTenants,
}: {
  platformQuery: UseQueryResult<PlatformBootstrapResponse, Error>;
  session: AuthSession | null;
  hasTenants: boolean;
}) {
  if (platformQuery.isLoading) {
    return <StatusPanel title="Preparing your workspace" body="Checking the live tenant state and opening the right entry point." />;
  }

  if (platformQuery.error) {
    return (
      <StatusPanel
        title="We could not open the workspace"
        body={platformQuery.error.message}
        tone="error"
      />
    );
  }

  if (!platformQuery.data?.platformState.databaseReady) {
    return (
      <StatusPanel
        title="The service is live, but setup is incomplete"
        body={
          platformQuery.data?.platformState.startupIssue ??
          "The production database still needs to be initialized."
        }
        tone="warn"
      />
    );
  }

  if (session || hasTenants) {
    return <Navigate replace to="/workspace" />;
  }

  return <Navigate replace to="/launchpad" />;
}

function LaunchpadPage({
  hasTenants,
  session,
}: {
  hasTenants: boolean;
  onSessionChange: (session: AuthSession | null) => void;
  session: AuthSession | null;
}) {
  const [form, setForm] = useState<BootstrapClientInput>({
    clientName: "",
    slug: "",
    adminFullName: "",
    adminEmail: "",
    adminPassword: "",
  });

  const bootstrapMutation = useMutation({
    mutationFn: bootstrapClient,
  });

  if (session || hasTenants) {
    return <Navigate replace to="/workspace" />;
  }

  return (
    <div className="client-page">
      <section className="client-hero">
        <div className="client-hero-copy">
          <p className="eyebrow">First-Time Setup</p>
          <h1>Start with one client tenant and one accountable administrator.</h1>
          <p className="client-hero-body">
            This creates the first tenant, provisions the initial category
            structure, and issues the first client-admin identity for the
            workspace.
          </p>
          <div className="client-hero-pills">
            <span className="client-pill">Tenant-ready</span>
            <span className="client-pill">Seeded taxonomy</span>
            <span className="client-pill">First admin access</span>
          </div>
        </div>

        <div className="client-card">
          <div className="client-card-header">
            <div>
              <p className="eyebrow">Launchpad</p>
              <h2>Create the first tenant</h2>
            </div>
          </div>

          <form
            className="client-form-grid"
            onSubmit={(event) => {
              event.preventDefault();
              bootstrapMutation.mutate(form);
            }}
          >
            <label>
              Company or group name
              <input
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    clientName: event.target.value,
                  }))
                }
                placeholder="Your company name"
                value={form.clientName}
              />
            </label>
            <label>
              Tenant slug
              <input
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    slug: event.target.value,
                  }))
                }
                placeholder="your-company"
                value={form.slug}
              />
            </label>
            <label>
              Admin full name
              <input
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    adminFullName: event.target.value,
                  }))
                }
                placeholder="Client administrator"
                value={form.adminFullName}
              />
            </label>
            <label>
              Admin email
              <input
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    adminEmail: event.target.value,
                  }))
                }
                placeholder="admin@company.com"
                type="email"
                value={form.adminEmail}
              />
            </label>
            <label>
              Create password
              <input
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    adminPassword: event.target.value,
                  }))
                }
                type="password"
                value={form.adminPassword}
              />
            </label>
            <button
              className="primary-button"
              disabled={bootstrapMutation.isPending}
              type="submit"
            >
              {bootstrapMutation.isPending
                ? "Provisioning..."
                : "Create first client tenant"}
            </button>

            {bootstrapMutation.error ? (
              <p className="form-feedback error">
                {bootstrapMutation.error.message}
              </p>
            ) : null}

            {bootstrapMutation.data ? (
              <div className="success-panel">
                <h4>{bootstrapMutation.data.message}</h4>
                <p>
                  {bootstrapMutation.data.tenant.clientName} is ready. Continue to
                  the workspace and sign in as{" "}
                  <strong>{bootstrapMutation.data.admin.email}</strong>.
                </p>
                <NavLink className="secondary-button client-link-button" to="/workspace">
                  Continue to sign-in
                </NavLink>
              </div>
            ) : null}
          </form>
        </div>
      </section>
    </div>
  );
}

function StatusPanel({
  title,
  body,
  tone = "neutral",
}: {
  title: string;
  body: string;
  tone?: "neutral" | "warn" | "error";
}) {
  return (
    <div className="client-page">
      <section className={`client-card client-status-panel client-status-${tone}`}>
        <p className="eyebrow">Workspace Status</p>
        <h2>{title}</h2>
        <p>{body}</p>
      </section>
    </div>
  );
}
