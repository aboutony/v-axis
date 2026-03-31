import { useEffect, useState } from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import { useMutation, useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import { Navigate, NavLink, Route, Routes } from "react-router-dom";

import {
  bootstrapClient,
  fetchPlatformBootstrap,
  type AuthSession,
  type BootstrapClientInput,
  type PlatformBootstrapResponse,
} from "./lib/api";
import { AccessPage } from "./pages/AccessPage";
import { WorkspacePage, loadStoredSession } from "./pages/WorkspacePage";

type ThemeMode = "light" | "dark";

const navigationItems = [
  {
    label: "Start",
    to: "/",
    eyebrow: "Now",
  },
  {
    label: "Workspace",
    to: "/workspace",
    eyebrow: "Operate",
  },
  {
    label: "Launchpad",
    to: "/launchpad",
    eyebrow: "Setup",
  },
  {
    label: "Architecture",
    to: "/architecture",
    eyebrow: "System",
  },
];

const stackHighlights = [
  "React + Vite frontend shell",
  "Fastify API with OpenAPI docs",
  "PostgreSQL + Drizzle data model",
  "Redis-backed worker and queue automation",
  "Docker Compose local infrastructure",
  "Mailpit for free local email testing",
];

export function App() {
  const [theme, setTheme] = useState<ThemeMode>("dark");
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

  return (
    <div className="app-shell">
      <div className="ambient ambient-a" />
      <div className="ambient ambient-b" />
      <aside className="sidebar">
        <div className="brand-block">
          <div className="brand-mark">V</div>
          <div>
            <p className="eyebrow">Governance Engine</p>
            <h1>V-AXIS</h1>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navigationItems.map((item) => (
            <NavLink
              key={item.to}
              className={({ isActive }) =>
                clsx("sidebar-link", isActive && "sidebar-link-active")
              }
              to={item.to}
            >
              <span className="sidebar-link-eyebrow">{item.eyebrow}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-card">
          <p className="eyebrow">Open-Source Core</p>
          <h2>Free tools only</h2>
          <ul className="compact-list">
            {stackHighlights.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <div>
            <p className="eyebrow">Operational Readiness</p>
            <h2>Build the platform teams cannot afford to operate without.</h2>
          </div>

          <div className="topbar-actions">
            <div className="status-chip">
              {session
                ? `Operating ${session.tenant.clientName}`
                : platformQuery.isLoading
                  ? "Checking workspace"
                  : platformQuery.data?.platformState.hasTenants
                    ? "Workspace ready"
                    : "Ready for first tenant"}
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
              <HomeEntryPage platformQuery={platformQuery} session={session} />
            }
          />
          <Route
            path="/workspace"
            element={
              <WorkspacePage onSessionChange={setSession} session={session} />
            }
          />
          <Route
            path="/launchpad"
            element={<LaunchpadPage platformQuery={platformQuery} />}
          />
          <Route
            path="/architecture"
            element={<ArchitecturePage platformQuery={platformQuery} />}
          />
          <Route path="/access" element={<AccessPage />} />
        </Routes>
      </main>
    </div>
  );
}

function HomeEntryPage({
  platformQuery,
  session,
}: {
  platformQuery: UseQueryResult<PlatformBootstrapResponse, Error>;
  session: AuthSession | null;
}) {
  if (platformQuery.isLoading) {
    return (
      <div className="page-grid">
        <section className="card">
          <div className="card-header">
            <div>
              <p className="eyebrow">Opening Workspace</p>
              <h3>Checking whether this deployment is ready for setup or sign-in.</h3>
            </div>
          </div>
          <p className="helper-copy">
            V-AXIS now opens into the working product flow instead of the technical
            foundation overview.
          </p>
        </section>
      </div>
    );
  }

  if (platformQuery.error) {
    return (
      <div className="page-grid">
        <section className="card">
          <div className="card-header">
            <div>
              <p className="eyebrow">Platform Check</p>
              <h3>We could not load the live platform state.</h3>
            </div>
          </div>
          <p className="form-feedback error">{platformQuery.error.message}</p>
        </section>
      </div>
    );
  }

  if (!platformQuery.data?.platformState.databaseReady) {
    return (
      <div className="page-grid">
        <section className="card">
          <div className="card-header">
            <div>
              <p className="eyebrow">Initialization Required</p>
              <h3>The live platform is deployed, but its database is not initialized yet.</h3>
            </div>
          </div>
          <p className="helper-copy">
            {platformQuery.data?.platformState.startupIssue ??
              "Finish the production database migration and seed before first use."}
          </p>
          <div className="success-panel">
            <h4>What happens after that</h4>
            <p>
              V-AXIS will automatically open the real product flow: Launchpad if
              no tenant exists yet, or Workspace login if a tenant already exists.
            </p>
          </div>
        </section>
      </div>
    );
  }

  if (session || platformQuery.data?.platformState.hasTenants) {
    return <Navigate replace to="/workspace" />;
  }

  return <Navigate replace to="/launchpad" />;
}

function LaunchpadPage({
  platformQuery,
}: {
  platformQuery: UseQueryResult<PlatformBootstrapResponse, Error>;
}) {
  const [form, setForm] = useState<BootstrapClientInput>({
    clientName: "Zedan Group",
    slug: "zedan-group",
    adminFullName: "Founding Client Admin",
    adminEmail: "admin@zedan.example",
    adminPassword: "ChangeThisNow!2026",
  });

  const bootstrapMutation = useMutation({
    mutationFn: bootstrapClient,
  });

  return (
    <div className="page-grid launchpad-grid">
      <section className="card">
        <div className="card-header">
          <div>
            <p className="eyebrow">Tenant Bootstrap</p>
            <h3>Provision the first client environment</h3>
          </div>
        </div>

        <form
          className="launch-form"
          onSubmit={(event) => {
            event.preventDefault();
            bootstrapMutation.mutate(form);
          }}
        >
          <label>
            Client name
            <input
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  clientName: event.target.value,
                }))
              }
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
              type="email"
              value={form.adminEmail}
            />
          </label>

          <label>
            Bootstrap password
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
              ? "Provisioning tenant..."
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
                Tenant <strong>{bootstrapMutation.data.tenant.clientName}</strong> is
                ready under slug <code>{bootstrapMutation.data.tenant.slug}</code>.
              </p>
              <ul className="compact-list">
                {bootstrapMutation.data.nextSteps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </form>
      </section>

      <section className="card">
        <div className="card-header">
          <div>
            <p className="eyebrow">Delivery Shape</p>
            <h3>What this foundation already supports</h3>
          </div>
        </div>

        <ul className="checklist">
          <li>Tenant bootstrap with seeded category slots</li>
          <li>Client admin creation with permission baseline</li>
          <li>JWT access tokens and refresh token rotation</li>
          <li>Protected routes for taxonomy, documents, and dashboard summaries</li>
          <li>Frontend workspace for operating a live tenant</li>
        </ul>

        <div className="stack-panel">
          <p className="eyebrow">Roadmap staging</p>
          <div className="roadmap-list">
            {(platformQuery.data?.roadmap ?? []).map((item, index) => (
              <div className="roadmap-step" key={item}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <p>{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function ArchitecturePage({
  platformQuery,
}: {
  platformQuery: UseQueryResult<PlatformBootstrapResponse, Error>;
}) {
  return (
    <div className="page-grid architecture-grid">
      <section className="card">
        <div className="card-header">
          <div>
            <p className="eyebrow">Architecture Decisions</p>
            <h3>Free, modern, and built to scale without paid lock-in</h3>
          </div>
        </div>

        <div className="decision-grid">
          <DecisionCard
            title="Frontend"
            body="React with Vite for a fast internal-control platform shell that can later be hosted anywhere."
          />
          <DecisionCard
            title="Backend"
            body="Fastify + TypeScript for a small, high-performance API surface with room for modular growth."
          />
          <DecisionCard
            title="Data"
            body="PostgreSQL + Drizzle schema covering tenants, taxonomy, documents, alerts, sessions, audit, risk scores, and integrations."
          />
          <DecisionCard
            title="Infra"
            body="Docker Compose local stack with Postgres, Redis, and Mailpit, plus a dedicated worker process for scheduled automation and queued delivery."
          />
        </div>
      </section>

      <section className="card">
        <div className="card-header">
          <div>
            <p className="eyebrow">Reference Assessment</p>
            <h3>Why we did not build on the suggested repos</h3>
          </div>
        </div>

        <div className="reference-panel">
          <article>
            <h4>MiroFish</h4>
            <p>
              Impressive simulation work, but it solves a different problem space:
              multi-agent forecasting rather than tenant-safe document governance.
              Pulling it in would increase complexity before we have our core
              control plane in place.
            </p>
          </article>
          <article>
            <h4>PropTech-Sovereign</h4>
            <p>
              Useful as a visual starter, but too thin to serve as the backbone
              of a compliance-grade platform. We kept the spirit of a clean Vite
              frontend while designing a stronger system around it.
            </p>
          </article>
        </div>
      </section>

      <section className="card">
        <div className="card-header">
          <div>
            <p className="eyebrow">Current Contracts</p>
            <h3>Shared product language already exposed to the app</h3>
          </div>
        </div>

        <div className="meta-grid">
          <MetricCard
            label="Permissions"
            value={String(platformQuery.data?.permissions.length ?? 10)}
          />
          <MetricCard
            label="Roles"
            value={String(platformQuery.data?.roles.length ?? 4)}
          />
          <MetricCard label="Roadmap phases" value="5" />
        </div>
      </section>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function DecisionCard({ title, body }: { title: string; body: string }) {
  return (
    <article className="decision-card">
      <h4>{title}</h4>
      <p>{body}</p>
    </article>
  );
}
