import { useEffect, useState } from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import { useMutation, useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import { NavLink, Route, Routes } from "react-router-dom";

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
    label: "Command Center",
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

const productPillars = [
  {
    title: "Predictive Governance",
    description:
      "Turn expiry and compliance drift into a live operational signal instead of a spreadsheet surprise.",
  },
  {
    title: "Tenant Sovereignty",
    description:
      "Design for shared SaaS efficiency today and dedicated enterprise isolation tomorrow without rewriting the core.",
  },
  {
    title: "Command Accountability",
    description:
      "Every alert becomes an owned task with a due date, escalation path, and audit footprint.",
  },
];

const stackHighlights = [
  "React + Vite frontend shell",
  "Fastify API with OpenAPI docs",
  "PostgreSQL + Drizzle data model",
  "Redis-ready session and queue layer",
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
                  ? "Loading platform brief"
                  : "Foundation active"}
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
            element={<CommandCenterPage platformQuery={platformQuery} />}
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

function CommandCenterPage({
  platformQuery,
}: {
  platformQuery: UseQueryResult<PlatformBootstrapResponse, Error>;
}) {
  const bootstrap = platformQuery.data;

  return (
    <div className="page-grid">
      <section className="hero-card">
        <div className="hero-copy">
          <p className="eyebrow">Single Pane of Glass</p>
          <h3>
            {bootstrap?.platform.name ?? "V-AXIS"} is being laid down as a
            sovereign operating system for document governance.
          </h3>
          <p className="hero-body">
            The platform now spans a serious monorepo foundation, a tenant-aware
            API, a shared product-domain package, and a working operator
            workspace that can create tenants, manage taxonomy, register
            documents, and surface governance health.
          </p>
        </div>

        <div className="hero-metrics">
          <MetricCard
            label="Configured category slots"
            value={String(bootstrap?.platform.categorySlots ?? 8)}
          />
          <MetricCard
            label="Seeded document types"
            value={String(bootstrap?.seededDocumentTypes.length ?? 19)}
          />
          <MetricCard
            label="Default role families"
            value={String(bootstrap?.roles.length ?? 4)}
          />
        </div>
      </section>

      <section className="card">
        <div className="card-header">
          <div>
            <p className="eyebrow">Product Pillars</p>
            <h3>What makes this platform necessary</h3>
          </div>
        </div>

        <div className="pillar-grid">
          {productPillars.map((pillar) => (
            <article className="pillar-card" key={pillar.title}>
              <h4>{pillar.title}</h4>
              <p>{pillar.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="card">
        <div className="card-header">
          <div>
            <p className="eyebrow">Operational Slice</p>
            <h3>What is live in this delivery</h3>
          </div>
        </div>

        <div className="feature-grid">
          <FeatureCard
            title="Tenant Bootstrap"
            body="Create the first client environment and client admin with seeded category slots."
          />
          <FeatureCard
            title="Workspace Login"
            body="Authenticate into a tenant and keep a local operator session for the control plane."
          />
          <FeatureCard
            title="Taxonomy Control"
            body="Rename categories, add entities, and shape the holding structure from the app."
          />
          <FeatureCard
            title="Document Intake"
            body="Register records with validation, DNA-code generation, version scaffolding, and live risk recalculation."
          />
        </div>
      </section>

      <section className="card">
        <div className="card-header">
          <div>
            <p className="eyebrow">Seeded Taxonomy</p>
            <h3>Initial Saudi/GCC compliance corpus</h3>
          </div>
        </div>

        <div className="document-type-list">
          {(bootstrap?.seededDocumentTypes ?? []).map((documentType) => (
            <article className="document-type-row" key={documentType.code}>
              <div>
                <span className="code-chip">#{documentType.code}</span>
                <h4>{documentType.label}</h4>
                <p>{documentType.notes}</p>
              </div>
              <div className="document-type-meta">
                <span className="badge">{documentType.sector}</span>
                <span className="meta-pill">
                  {documentType.requiresExpiry ? "Expiry-tracked" : "No expiry"}
                </span>
                <span className="meta-pill">
                  {documentType.requiresCr ? "CR-linked" : "Standalone"}
                </span>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
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
            body="Docker Compose local stack with Postgres, Redis, and Mailpit, all using free/open-source tooling."
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

function FeatureCard({ title, body }: { title: string; body: string }) {
  return (
    <article className="feature-card">
      <h4>{title}</h4>
      <p>{body}</p>
    </article>
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
