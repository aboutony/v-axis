import { useEffect, useMemo, useState, type ComponentType } from "react";
import {
  Activity,
  AlertTriangle,
  Bell,
  BookOpen,
  CheckCircle2,
  FileText,
  Gauge,
  GitBranch,
  Globe2,
  Loader2,
  LockKeyhole,
  LogOut,
  Mail,
  RefreshCcw,
  ShieldCheck,
  Upload,
  Users,
  Webhook,
} from "lucide-react";

import { AuthProvider, useAuth } from "./context/AuthContext";
import {
  acknowledgeNotification,
  approveOcrExtraction,
  bootstrapClient,
  createConnector,
  createWebhook,
  downloadDocumentFile,
  downloadDocumentVersionFile,
  escalateOverdueNotifications,
  fetchAuditLogs,
  fetchAutomationOverview,
  fetchConnectors,
  fetchDashboardSummary,
  fetchDocumentTypes,
  fetchDocumentVersions,
  fetchDocuments,
  fetchDocumentOcr,
  fetchNotifications,
  fetchPlatformBootstrap,
  fetchRules,
  fetchTaxonomy,
  fetchUsers,
  fetchWebhooks,
  previewDocumentOcr,
  refreshGovernance,
  resolveNotification,
  retryOcrExtraction,
  replayAutomationDelivery,
  replayAutomationOcr,
  runAutomationMaintenance,
  sendUserInvite,
  testConnectorEmail,
  testWebhook,
  uploadDocument,
  type AuditLogsResponse,
  type AutomationOverviewResponse,
  type ConnectorsResponse,
  type DashboardSummaryResponse,
  type DocumentTypesResponse,
  type DocumentVersionsResponse,
  type DocumentsResponse,
  type NotificationsResponse,
  type OcrExtractionResponse,
  type OcrExtractionsResponse,
  type PlatformBootstrapResponse,
  type RulesResponse,
  type TaxonomyResponse,
  type UsersResponse,
  type WebhooksResponse,
} from "./lib/api";
import type { BootstrapInput, LoginInput } from "./types/auth";

type ProductModule =
  | "dashboard"
  | "taxonomy"
  | "documents"
  | "users"
  | "governance"
  | "notifications"
  | "audit"
  | "webhooks"
  | "connectors"
  | "automation";

type ModuleDefinition = {
  key: ProductModule;
  label: string;
  icon: ComponentType<{ className?: string }>;
};

const modules: ModuleDefinition[] = [
  { key: "dashboard", label: "Dashboard", icon: Gauge },
  { key: "taxonomy", label: "Taxonomy", icon: GitBranch },
  { key: "documents", label: "Documents", icon: FileText },
  { key: "users", label: "Users", icon: Users },
  { key: "governance", label: "Governance", icon: ShieldCheck },
  { key: "notifications", label: "Notifications", icon: Bell },
  { key: "audit", label: "Audit", icon: BookOpen },
  { key: "webhooks", label: "Webhooks", icon: Webhook },
  { key: "connectors", label: "Connectors", icon: Mail },
  { key: "automation", label: "Automation", icon: Activity },
];

type LoadState<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
};

function emptyState<T>(): LoadState<T> {
  return {
    data: null,
    loading: false,
    error: null,
  };
}

function normalizeError(error: unknown) {
  return error instanceof Error ? error.message : "Action could not be completed.";
}

function triggerBrowserDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function ProductEntry() {
  return (
    <AuthProvider>
      <ProductApp />
    </AuthProvider>
  );
}

function ProductApp() {
  const auth = useAuth();
  const [platform, setPlatform] = useState<LoadState<PlatformBootstrapResponse>>(
    emptyState,
  );

  useEffect(() => {
    let active = true;
    setPlatform({ data: null, loading: true, error: null });
    fetchPlatformBootstrap()
      .then((data) => {
        if (active) {
          setPlatform({ data, loading: false, error: null });
        }
      })
      .catch((error) => {
        if (active) {
          setPlatform({ data: null, loading: false, error: normalizeError(error) });
        }
      });

    return () => {
      active = false;
    };
  }, []);

  if (auth.isLoading) {
    return (
      <ProductFrame>
        <LoadingBlock label="Checking secure session" />
      </ProductFrame>
    );
  }

  if (!auth.isAuthenticated) {
    return (
      <ProductFrame>
        <AccessPanel platform={platform} />
      </ProductFrame>
    );
  }

  return <Workspace />;
}

function ProductFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {children}
      </div>
    </div>
  );
}

function AccessPanel({
  platform,
}: {
  platform: LoadState<PlatformBootstrapResponse>;
}) {
  const auth = useAuth();
  const [mode, setMode] = useState<"login" | "bootstrap">("login");
  const [loginInput, setLoginInput] = useState<LoginInput>({
    tenantSlug: "",
    email: "",
    password: "",
    mfaCode: "",
  });
  const [bootstrapInput, setBootstrapInput] = useState<BootstrapInput>({
    clientName: "",
    slug: "",
    adminFullName: "",
    adminEmail: "",
    adminPassword: "",
  });
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const databaseReady = platform.data?.platformState.databaseReady ?? false;

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    try {
      await auth.login(loginInput);
      setMessage("Signed in successfully.");
    } catch (loginError) {
      setError(normalizeError(loginError));
    }
  }

  async function handleBootstrap(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    try {
      const response = await bootstrapClient(bootstrapInput);
      setMessage(`${response.tenant.clientName} created. You can now sign in.`);
      setLoginInput((current) => ({
        ...current,
        tenantSlug: response.tenant.slug,
        email: response.admin.email,
      }));
      setMode("login");
    } catch (bootstrapError) {
      setError(normalizeError(bootstrapError));
    }
  }

  return (
    <main className="grid min-h-[calc(100vh-3rem)] gap-8 py-6 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
      <section>
        <a
          href="/demo"
          className="inline-flex items-center gap-2 rounded-full border border-emerald-300/30 px-4 py-2 text-sm font-semibold text-emerald-100 hover:bg-emerald-300/10"
        >
          <Globe2 className="h-4 w-4" />
          Protected demo remains available
        </a>
        <p className="mt-10 text-xs font-semibold uppercase tracking-[0.28em] text-emerald-300">
          V-AXIS Product
        </p>
        <h1 className="mt-4 max-w-2xl text-4xl font-black tracking-tight sm:text-6xl">
          Real workspace, separate from the demo.
        </h1>
        <p className="mt-5 max-w-xl text-base leading-7 text-slate-300">
          This shell connects to the platform API for tenant setup, secure access,
          governance, document operations, notifications, audit, integrations, and
          worker visibility.
        </p>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <ReadinessCard
            icon={databaseReady ? CheckCircle2 : AlertTriangle}
            label="Backend database"
            value={
              platform.loading
                ? "Checking"
                : databaseReady
                  ? "Ready"
                  : platform.data?.platformState.startupIssue ?? "Not confirmed"
            }
            tone={databaseReady ? "good" : "warn"}
          />
          <ReadinessCard
            icon={LockKeyhole}
            label="Access model"
            value="JWT, refresh sessions, MFA-ready"
            tone="good"
          />
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20 sm:p-7">
        <div className="mb-5 grid grid-cols-2 rounded-2xl bg-slate-900 p-1">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`rounded-xl px-4 py-3 text-sm font-bold transition ${
              mode === "login" ? "bg-emerald-400 text-slate-950" : "text-slate-300"
            }`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => setMode("bootstrap")}
            className={`rounded-xl px-4 py-3 text-sm font-bold transition ${
              mode === "bootstrap"
                ? "bg-emerald-400 text-slate-950"
                : "text-slate-300"
            }`}
          >
            Bootstrap
          </button>
        </div>

        {mode === "login" ? (
          <form className="space-y-4" onSubmit={handleLogin}>
            <Field
              label="Tenant slug"
              value={loginInput.tenantSlug}
              onChange={(value) =>
                setLoginInput((current) => ({ ...current, tenantSlug: value }))
              }
              required
            />
            <Field
              label="Email"
              type="email"
              value={loginInput.email}
              onChange={(value) =>
                setLoginInput((current) => ({ ...current, email: value }))
              }
              required
            />
            <Field
              label="Password"
              type="password"
              value={loginInput.password}
              onChange={(value) =>
                setLoginInput((current) => ({ ...current, password: value }))
              }
              required
            />
            <Field
              label="MFA code"
              value={loginInput.mfaCode ?? ""}
              onChange={(value) =>
                setLoginInput((current) => ({ ...current, mfaCode: value }))
              }
            />
            <ActionButton
              label="Sign in"
              loading={auth.isLoading}
              disabled={auth.isLoading || !databaseReady}
            />
          </form>
        ) : (
          <form className="space-y-4" onSubmit={handleBootstrap}>
            <Field
              label="Client name"
              value={bootstrapInput.clientName}
              onChange={(value) =>
                setBootstrapInput((current) => ({ ...current, clientName: value }))
              }
              required
            />
            <Field
              label="Tenant slug"
              value={bootstrapInput.slug}
              onChange={(value) =>
                setBootstrapInput((current) => ({ ...current, slug: value }))
              }
              required
            />
            <Field
              label="Admin full name"
              value={bootstrapInput.adminFullName}
              onChange={(value) =>
                setBootstrapInput((current) => ({
                  ...current,
                  adminFullName: value,
                }))
              }
              required
            />
            <Field
              label="Admin email"
              type="email"
              value={bootstrapInput.adminEmail}
              onChange={(value) =>
                setBootstrapInput((current) => ({ ...current, adminEmail: value }))
              }
              required
            />
            <Field
              label="Admin password"
              type="password"
              value={bootstrapInput.adminPassword}
              onChange={(value) =>
                setBootstrapInput((current) => ({
                  ...current,
                  adminPassword: value,
                }))
              }
              required
            />
            <ActionButton
              label="Create tenant"
              loading={auth.isLoading}
              disabled={auth.isLoading || !databaseReady}
            />
          </form>
        )}

        <Feedback message={message} error={error ?? platform.error} />
      </section>
    </main>
  );
}

function Workspace() {
  const auth = useAuth();
  const [activeModule, setActiveModule] = useState<ProductModule>("dashboard");

  return (
    <ProductFrame>
      <header className="mb-6 flex flex-col gap-4 border-b border-white/10 pb-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-300">
            {auth.tenant?.clientName ?? "V-AXIS"}
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight">
            Product Workspace
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <a
            href="/demo"
            className="rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-white/10"
          >
            Open demo
          </a>
          <button
            type="button"
            onClick={() => void auth.logout()}
            className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-slate-950 hover:bg-emerald-100"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <nav className="rounded-3xl border border-white/10 bg-white/[0.04] p-3">
          {modules.map((module) => {
            const Icon = module.icon;
            return (
              <button
                key={module.key}
                type="button"
                onClick={() => setActiveModule(module.key)}
                className={`mb-1 flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold transition ${
                  activeModule === module.key
                    ? "bg-emerald-400 text-slate-950"
                    : "text-slate-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon className="h-4 w-4" />
                {module.label}
              </button>
            );
          })}
        </nav>

        <section className="min-w-0">
          <ModuleContent activeModule={activeModule} />
        </section>
      </div>
    </ProductFrame>
  );
}

function ModuleContent({ activeModule }: { activeModule: ProductModule }) {
  switch (activeModule) {
    case "dashboard":
      return <DashboardModule />;
    case "taxonomy":
      return <TaxonomyModule />;
    case "documents":
      return <DocumentsModule />;
    case "users":
      return <UsersModule />;
    case "governance":
      return <GovernanceModule />;
    case "notifications":
      return <NotificationsModule />;
    case "audit":
      return <AuditModule />;
    case "webhooks":
      return <WebhooksModule />;
    case "connectors":
      return <ConnectorsModule />;
    case "automation":
      return <AutomationModule />;
    default:
      return null;
  }
}

function useAuthedResource<T>(
  loader: (accessToken: string) => Promise<T>,
  deps: React.DependencyList = [],
) {
  const { accessToken } = useAuth();
  const [state, setState] = useState<LoadState<T>>(emptyState);
  const [refreshId, setRefreshId] = useState(0);

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    let active = true;
    setState((current) => ({ ...current, loading: true, error: null }));
    loader(accessToken)
      .then((data) => {
        if (active) {
          setState({ data, loading: false, error: null });
        }
      })
      .catch((error) => {
        if (active) {
          setState({ data: null, loading: false, error: normalizeError(error) });
        }
      });

    return () => {
      active = false;
    };
  }, [accessToken, refreshId, ...deps]);

  return {
    ...state,
    refresh: () => setRefreshId((current) => current + 1),
  };
}

function DashboardModule() {
  const summary = useAuthedResource<DashboardSummaryResponse>(fetchDashboardSummary);

  return (
    <ModulePanel
      title="Dashboard"
      description="Live portfolio health, alerts, gaps, and recent activity."
      loading={summary.loading}
      error={summary.error}
      onRefresh={summary.refresh}
    >
      {summary.data ? (
        <>
          <MetricGrid
            metrics={[
              ["Portfolio health", `${summary.data.portfolioHealthScore}%`],
              ["Critical alerts", String(summary.data.criticalAlerts.length)],
              ["Timeline items", String(summary.data.expiryTimeline.length)],
              ["Open notifications", String(summary.data.notificationSummary.open)],
            ]}
          />
          <DataList
            title="Critical Alerts"
            items={summary.data.criticalAlerts.slice(0, 6).map((alert) => ({
              title: alert.title,
              detail: `${alert.entityName} - ${alert.reason}`,
              tone: alert.severity,
            }))}
          />
        </>
      ) : null}
    </ModulePanel>
  );
}

function TaxonomyModule() {
  const taxonomy = useAuthedResource<TaxonomyResponse>(fetchTaxonomy);

  return (
    <ModulePanel
      title="Taxonomy"
      description="Tenant categories, entities, and operational structure."
      loading={taxonomy.loading}
      error={taxonomy.error}
      onRefresh={taxonomy.refresh}
    >
      {taxonomy.data ? (
        <div className="grid gap-4 md:grid-cols-2">
          {taxonomy.data.categories.map((category) => (
            <article
              key={category.id}
              className="rounded-2xl border border-white/10 bg-slate-900/60 p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-bold">{category.label}</h3>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-300">
                  Slot {category.slotNumber}
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-400">
                {category.entities.length} entities
              </p>
              <div className="mt-4 space-y-2">
                {category.entities.slice(0, 4).map((entity) => (
                  <div
                    key={entity.id}
                    className="rounded-xl bg-white/[0.04] px-3 py-2 text-sm"
                  >
                    {entity.entityName}
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </ModulePanel>
  );
}

function DocumentsModule() {
  const { accessToken } = useAuth();
  const documents = useAuthedResource<DocumentsResponse>((token) =>
    fetchDocuments(token),
  );
  const documentTypes = useAuthedResource<DocumentTypesResponse>(fetchDocumentTypes);
  const [message, setMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [ocrBusyId, setOcrBusyId] = useState<string | null>(null);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(
    null,
  );
  const [ocrState, setOcrState] =
    useState<LoadState<OcrExtractionsResponse>>(emptyState);
  const [versionState, setVersionState] =
    useState<LoadState<DocumentVersionsResponse>>(emptyState);
  const [ocrPreview, setOcrPreview] =
    useState<OcrExtractionResponse["ocr"] | null>(null);

  useEffect(() => {
    const firstDocumentId = documents.data?.documents[0]?.id ?? null;
    if (!selectedDocumentId && firstDocumentId) {
      setSelectedDocumentId(firstDocumentId);
    }
  }, [documents.data, selectedDocumentId]);

  useEffect(() => {
    if (!accessToken || !selectedDocumentId) {
      return;
    }

    let active = true;
    setOcrState((current) => ({ ...current, loading: true, error: null }));
    fetchDocumentOcr(accessToken, selectedDocumentId)
      .then((data) => {
        if (active) {
          setOcrState({ data, loading: false, error: null });
        }
      })
      .catch((error) => {
        if (active) {
          setOcrState({ data: null, loading: false, error: normalizeError(error) });
        }
      });

    return () => {
      active = false;
    };
  }, [accessToken, selectedDocumentId]);

  useEffect(() => {
    if (!accessToken || !selectedDocumentId) {
      return;
    }

    let active = true;
    setVersionState((current) => ({ ...current, loading: true, error: null }));
    fetchDocumentVersions(accessToken, selectedDocumentId)
      .then((data) => {
        if (active) {
          setVersionState({ data, loading: false, error: null });
        }
      })
      .catch((error) => {
        if (active) {
          setVersionState({
            data: null,
            loading: false,
            error: normalizeError(error),
          });
        }
      });

    return () => {
      active = false;
    };
  }, [accessToken, selectedDocumentId]);

  async function refreshOcr(documentId = selectedDocumentId) {
    if (!accessToken || !documentId) {
      return;
    }

    setOcrState((current) => ({ ...current, loading: true, error: null }));
    try {
      const data = await fetchDocumentOcr(accessToken, documentId);
      setOcrState({ data, loading: false, error: null });
    } catch (error) {
      setOcrState({ data: null, loading: false, error: normalizeError(error) });
    }
  }

  async function handleDownloadCurrent() {
    if (!accessToken || !selectedDocumentId) {
      return;
    }

    setActionError(null);
    try {
      const download = await downloadDocumentFile(accessToken, selectedDocumentId);
      triggerBrowserDownload(download.blob, download.filename);
    } catch (error) {
      setActionError(normalizeError(error));
    }
  }

  async function handleDownloadVersion(versionNumber: number) {
    if (!accessToken || !selectedDocumentId) {
      return;
    }

    setActionError(null);
    try {
      const download = await downloadDocumentVersionFile(
        accessToken,
        selectedDocumentId,
        versionNumber,
      );
      triggerBrowserDownload(download.blob, download.filename);
    } catch (error) {
      setActionError(normalizeError(error));
    }
  }

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !accessToken) {
      return;
    }

    const firstDocument = documents.data?.documents[0];
    const firstType = documentTypes.data?.documentTypes[0];
    if (!firstDocument || !firstType) {
      setActionError("Create an entity and document type before uploading.");
      return;
    }

    setUploading(true);
    setMessage(null);
    setActionError(null);
    try {
      await uploadDocument(
        accessToken,
        {
          entityId: firstDocument.entityId,
          documentTypeId: firstType.id,
          title: file.name,
        },
        file,
      );
      setMessage("Document uploaded and OCR queued.");
      setSelectedDocumentId(null);
      documents.refresh();
    } catch (error) {
      setActionError(normalizeError(error));
    } finally {
      setUploading(false);
    }
  }

  async function handleRetryOcr(ocrExtractionId: string) {
    if (!accessToken) {
      return;
    }

    setOcrBusyId(ocrExtractionId);
    setMessage(null);
    setActionError(null);
    try {
      const result = await retryOcrExtraction(accessToken, ocrExtractionId);
      setMessage(result.message);
      await refreshOcr();
    } catch (error) {
      setActionError(normalizeError(error));
    } finally {
      setOcrBusyId(null);
    }
  }

  async function handleApproveOcr(
    ocrExtractionId: string,
    fields: OcrExtractionResponse["ocr"]["fields"],
  ) {
    if (!accessToken) {
      return;
    }

    setOcrBusyId(ocrExtractionId);
    setMessage(null);
    setActionError(null);
    try {
      const result = await approveOcrExtraction(
        accessToken,
        ocrExtractionId,
        fields,
      );
      setMessage(result.message);
      await refreshOcr();
      documents.refresh();
    } catch (error) {
      setActionError(normalizeError(error));
    } finally {
      setOcrBusyId(null);
    }
  }

  async function handleOcrPreview(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !accessToken) {
      return;
    }

    setPreviewing(true);
    setMessage(null);
    setActionError(null);
    setOcrPreview(null);
    try {
      const result = await previewDocumentOcr(accessToken, file);
      setOcrPreview(result.ocr);
      setMessage(result.message);
    } catch (error) {
      setActionError(normalizeError(error));
    } finally {
      setPreviewing(false);
    }
  }

  return (
    <ModulePanel
      title="Documents"
      description="Registry, uploads, versions, and future OCR review entry point."
      loading={documents.loading || documentTypes.loading}
      error={documents.error ?? documentTypes.error}
      onRefresh={() => {
        documents.refresh();
        documentTypes.refresh();
      }}
      action={
        <>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-slate-100 hover:bg-white/10">
            {previewing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileText className="h-4 w-4" />
            )}
            OCR Preview
            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              className="hidden"
              disabled={previewing || uploading}
              onChange={handleOcrPreview}
            />
          </label>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-emerald-400 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-emerald-300">
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            Upload
            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              className="hidden"
              disabled={uploading || previewing}
              onChange={handleUpload}
            />
          </label>
        </>
      }
    >
      <Feedback message={message} error={actionError} />
      {ocrPreview ? <OcrReviewPanel ocr={ocrPreview} /> : null}
      {documents.data ? (
        <>
          <div className="mb-6 grid gap-3 lg:grid-cols-[1fr_1fr]">
            <DataList
              title="Document Registry"
              items={documents.data.documents.slice(0, 10).map((document) => ({
                title: document.title,
                detail: `${document.entityName} - ${document.documentTypeLabel} - ${document.derivedStatus}`,
                tone: document.id === selectedDocumentId ? "selected" : undefined,
              }))}
            />
            <section>
              <h3 className="mb-3 text-sm font-bold uppercase tracking-[0.18em] text-slate-400">
                OCR Jobs
              </h3>
              <div className="mb-3 flex flex-wrap gap-2">
                {documents.data.documents.slice(0, 6).map((document) => (
                  <button
                    key={document.id}
                    type="button"
                    onClick={() => setSelectedDocumentId(document.id)}
                    className={`rounded-full px-3 py-2 text-xs font-semibold ${
                      document.id === selectedDocumentId
                        ? "bg-cyan-300 text-slate-950"
                        : "border border-white/15 text-slate-200"
                    }`}
                  >
                    {document.title}
                  </button>
                ))}
              </div>
              {ocrState.loading ? <LoadingBlock label="Loading OCR jobs" /> : null}
              {ocrState.error ? <Feedback error={ocrState.error} /> : null}
              {selectedDocumentId ? (
                <div className="mb-3 rounded-2xl border border-white/10 bg-slate-900/60 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h4 className="font-bold">Vault Retrieval</h4>
                      <p className="mt-1 text-sm text-slate-400">
                        Current file and retained versions are tenant-authorized.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleDownloadCurrent}
                      className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-slate-100"
                    >
                      Download Current
                    </button>
                  </div>
                  {versionState.data?.versions.length ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {versionState.data.versions.slice(0, 4).map((version) => (
                        <button
                          key={version.id}
                          type="button"
                          onClick={() =>
                            handleDownloadVersion(version.versionNumber)
                          }
                          className="rounded-full border border-white/15 px-3 py-1 text-xs font-semibold text-slate-200"
                        >
                          v{version.versionNumber}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
              {!ocrState.loading && !ocrState.error && ocrState.data ? (
                <div className="space-y-3">
                  {ocrState.data.ocrExtractions.length > 0 ? (
                    ocrState.data.ocrExtractions.map((ocr) => (
                      <OcrExtractionCard
                        key={ocr.id}
                        ocr={ocr}
                        busy={ocrBusyId === ocr.id}
                        onRetry={() => handleRetryOcr(ocr.id)}
                        onApprove={() => handleApproveOcr(ocr.id, ocr.fields)}
                      />
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-white/15 p-6 text-sm text-slate-400">
                      No OCR jobs for this document yet.
                    </div>
                  )}
                </div>
              ) : null}
            </section>
          </div>
        </>
      ) : null}
    </ModulePanel>
  );
}

function OcrReviewPanel({ ocr }: { ocr: OcrExtractionResponse["ocr"] }) {
  const confidence = `${Math.round(ocr.overallConfidence * 100)}%`;

  return (
    <section className="mb-6 rounded-2xl border border-cyan-300/20 bg-cyan-300/5 p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-cyan-100">
            OCR Review
          </h3>
          <p className="mt-2 text-sm text-slate-300">
            {ocr.documentTypeLabel} - confidence {confidence}
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${
            ocr.requiresReview
              ? "bg-amber-300/15 text-amber-100"
              : "bg-emerald-300/15 text-emerald-100"
          }`}
        >
          {ocr.requiresReview ? "Needs review" : "Ready"}
        </span>
      </div>

      {ocr.warnings.length > 0 ? (
        <div className="mt-4 rounded-xl border border-amber-300/20 bg-amber-300/10 p-3 text-sm text-amber-100">
          {ocr.warnings.join(" ")}
        </div>
      ) : null}

      {ocr.missingRequiredFields.length > 0 ? (
        <div className="mt-4 text-sm text-slate-300">
          Missing required fields: {ocr.missingRequiredFields.join(", ")}
        </div>
      ) : null}

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {ocr.fields.map((field) => (
          <label
            key={field.key}
            className="rounded-xl border border-white/10 bg-slate-950/40 p-3"
          >
            <span className="flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
              {field.label}
              <span
                className={
                  field.status === "LOW_CONFIDENCE"
                    ? "text-amber-200"
                    : "text-emerald-200"
                }
              >
                {Math.round(field.confidence * 100)}%
              </span>
            </span>
            <input
              className="mt-2 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-cyan-300"
              defaultValue={field.value}
            />
          </label>
        ))}
      </div>

      {ocr.fields.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-white/15 p-4 text-sm text-slate-400">
          No fields were extracted from this preview yet.
        </div>
      ) : null}
    </section>
  );
}

function OcrExtractionCard({
  ocr,
  busy,
  onRetry,
  onApprove,
}: {
  ocr: OcrExtractionsResponse["ocrExtractions"][number];
  busy: boolean;
  onRetry: () => void;
  onApprove: (fields: OcrExtractionResponse["ocr"]["fields"]) => void;
}) {
  const [fields, setFields] = useState(ocr.fields);

  useEffect(() => {
    setFields(ocr.fields);
  }, [ocr.fields]);

  const canApprove =
    fields.length > 0 && ["READY", "NEEDS_REVIEW"].includes(ocr.status);
  const canRetry = ["FAILED", "NEEDS_REVIEW"].includes(ocr.status);

  function updateField(index: number, value: string) {
    setFields((current) =>
      current.map((field, fieldIndex) =>
        fieldIndex === index
          ? { ...field, value, confidence: 1, status: "READY", source: "user" }
          : field,
      ),
    );
  }

  return (
    <article className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h4 className="font-bold">
            {ocr.documentTypeLabel ?? "OCR extraction"}
          </h4>
          <p className="mt-1 text-sm text-slate-400">
            {ocr.engine ?? "pending"} - confidence{" "}
            {ocr.overallConfidence
              ? `${Math.round(Number(ocr.overallConfidence) * 100)}%`
              : "pending"}
          </p>
        </div>
        <span className="rounded-full bg-white/10 px-3 py-1 text-xs uppercase text-slate-300">
          {ocr.status}
        </span>
      </div>

      {ocr.error ? (
        <Feedback error={ocr.error} />
      ) : ocr.warnings.length > 0 ? (
        <Feedback message={ocr.warnings.join(" ")} />
      ) : null}

      {ocr.missingRequiredFields.length > 0 ? (
        <p className="mt-3 text-sm text-amber-100">
          Missing: {ocr.missingRequiredFields.join(", ")}
        </p>
      ) : null}

      <div className="mt-4 grid gap-3">
        {fields.map((field, index) => (
          <label key={`${field.key}-${index}`} className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
              {field.label} - {Math.round(field.confidence * 100)}%
            </span>
            <input
              className="mt-2 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-cyan-300"
              value={field.value}
              onChange={(event) => updateField(index, event.target.value)}
            />
          </label>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!canApprove || busy}
          onClick={() => onApprove(fields)}
          className="inline-flex items-center gap-2 rounded-full bg-emerald-400 px-4 py-2 text-sm font-bold text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          Approve
        </button>
        <button
          type="button"
          disabled={!canRetry || busy}
          onClick={onRetry}
          className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
          Retry
        </button>
      </div>
    </article>
  );
}

function UsersModule() {
  const { accessToken } = useAuth();
  const users = useAuthedResource<UsersResponse>(fetchUsers);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function handleInvite(userId: string) {
    if (!accessToken) {
      return;
    }
    setBusyUserId(userId);
    setMessage(null);
    setActionError(null);
    try {
      await sendUserInvite(accessToken, userId);
      setMessage("Invite issued.");
      users.refresh();
    } catch (error) {
      setActionError(normalizeError(error));
    } finally {
      setBusyUserId(null);
    }
  }

  return (
    <ModulePanel
      title="Users"
      description="Tenant users, roles, MFA, invites, ownership, and access status."
      loading={users.loading}
      error={users.error}
      onRefresh={users.refresh}
    >
      <Feedback message={message} error={actionError} />
      {users.data ? (
        <div className="space-y-3">
          {users.data.users.map((user) => (
            <article
              key={user.id}
              className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-slate-900/60 p-4 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <h3 className="font-bold">{user.fullName}</h3>
                <p className="text-sm text-slate-400">
                  {user.email} - {user.role} - {user.status}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void handleInvite(user.id)}
                disabled={busyUserId === user.id}
                className="rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busyUserId === user.id ? "Sending..." : "Send invite"}
              </button>
            </article>
          ))}
        </div>
      ) : null}
    </ModulePanel>
  );
}

function GovernanceModule() {
  const { accessToken } = useAuth();
  const rules = useAuthedResource<RulesResponse>(fetchRules);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function handleRefreshGovernance() {
    if (!accessToken) {
      return;
    }
    setRunning(true);
    setMessage(null);
    setActionError(null);
    try {
      const result = await refreshGovernance(accessToken);
      setMessage(
        `${result.entityCount} entities refreshed, ${result.escalatedNotifications} escalations.`,
      );
      rules.refresh();
    } catch (error) {
      setActionError(normalizeError(error));
    } finally {
      setRunning(false);
    }
  }

  return (
    <ModulePanel
      title="Governance"
      description="Mandatory document rules and governance recalculation."
      loading={rules.loading}
      error={rules.error}
      onRefresh={rules.refresh}
      action={
        <button
          type="button"
          onClick={() => void handleRefreshGovernance()}
          disabled={running}
          className="rounded-full bg-emerald-400 px-4 py-2 text-sm font-bold text-slate-950 disabled:opacity-50"
        >
          {running ? "Refreshing..." : "Refresh governance"}
        </button>
      }
    >
      <Feedback message={message} error={actionError} />
      {rules.data ? (
        <DataList
          title="Rules"
          items={rules.data.rules.slice(0, 12).map((rule) => ({
            title: rule.documentTypeLabel,
            detail: `${rule.entityType} - ${rule.documentSector} - ${rule.isMandatory ? "Mandatory" : "Optional"}`,
          }))}
        />
      ) : null}
    </ModulePanel>
  );
}

function NotificationsModule() {
  const { accessToken } = useAuth();
  const notifications = useAuthedResource<NotificationsResponse>(fetchNotifications);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function runAction(action: "ack" | "resolve" | "escalate", id?: string) {
    if (!accessToken) {
      return;
    }
    setBusy(id ?? action);
    setMessage(null);
    setActionError(null);
    try {
      if (action === "ack" && id) {
        await acknowledgeNotification(accessToken, id);
        setMessage("Notification acknowledged.");
      } else if (action === "resolve" && id) {
        await resolveNotification(accessToken, id);
        setMessage("Notification resolved.");
      } else {
        const result = await escalateOverdueNotifications(accessToken);
        setMessage(`${result.escalatedNotifications} overdue notifications escalated.`);
      }
      notifications.refresh();
    } catch (error) {
      setActionError(normalizeError(error));
    } finally {
      setBusy(null);
    }
  }

  return (
    <ModulePanel
      title="Notifications"
      description="Action center, ownership, acknowledgement, resolution, and escalation."
      loading={notifications.loading}
      error={notifications.error}
      onRefresh={notifications.refresh}
      action={
        <button
          type="button"
          onClick={() => void runAction("escalate")}
          disabled={busy === "escalate"}
          className="rounded-full bg-emerald-400 px-4 py-2 text-sm font-bold text-slate-950 disabled:opacity-50"
        >
          {busy === "escalate" ? "Escalating..." : "Escalate overdue"}
        </button>
      }
    >
      <Feedback message={message} error={actionError} />
      {notifications.data ? (
        <div className="space-y-3">
          {notifications.data.notifications.slice(0, 10).map((notification) => (
            <article
              key={notification.id}
              className="rounded-2xl border border-white/10 bg-slate-900/60 p-4"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <h3 className="font-bold">{notification.title}</h3>
                  <p className="mt-1 text-sm text-slate-400">
                    {notification.message}
                  </p>
                </div>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs uppercase text-slate-300">
                  {notification.status}
                </span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy === notification.id}
                  onClick={() => void runAction("ack", notification.id)}
                  className="rounded-full border border-white/15 px-3 py-1.5 text-xs font-bold disabled:opacity-50"
                >
                  Acknowledge
                </button>
                <button
                  type="button"
                  disabled={busy === notification.id}
                  onClick={() => void runAction("resolve", notification.id)}
                  className="rounded-full border border-white/15 px-3 py-1.5 text-xs font-bold disabled:opacity-50"
                >
                  Resolve
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </ModulePanel>
  );
}

function AuditModule() {
  const audit = useAuthedResource<AuditLogsResponse>((token) =>
    fetchAuditLogs(token, { limit: 25 }),
  );

  return (
    <ModulePanel
      title="Audit"
      description="Immutable operational trail and export-ready event visibility."
      loading={audit.loading}
      error={audit.error}
      onRefresh={audit.refresh}
    >
      {audit.data ? (
        <DataList
          title="Recent Events"
          items={audit.data.logs.map((log) => ({
            title: log.eventType,
            detail: `${log.resourceType} - ${log.actorEmail ?? "system"} - ${new Date(log.createdAt).toLocaleString()}`,
          }))}
        />
      ) : null}
    </ModulePanel>
  );
}

function WebhooksModule() {
  const { accessToken } = useAuth();
  const webhooks = useAuthedResource<WebhooksResponse>(fetchWebhooks);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function handleCreateOrTest(id?: string) {
    if (!accessToken) {
      return;
    }
    setBusy(id ?? "create");
    setMessage(null);
    setActionError(null);
    try {
      if (id) {
        await testWebhook(accessToken, id);
        setMessage("Webhook test delivered or queued.");
      } else {
        await createWebhook(accessToken, {
          name: "Operations Test Webhook",
          url: "https://example.com/v-axis-webhook",
          sharedSecret: "replace-this-secret",
          subscribedEvents: webhooks.data?.availableEvents.slice(0, 1) ?? [
            "document.created",
          ],
          enabled: false,
        });
        setMessage("Disabled test webhook created.");
      }
      webhooks.refresh();
    } catch (error) {
      setActionError(normalizeError(error));
    } finally {
      setBusy(null);
    }
  }

  return (
    <ModulePanel
      title="Webhooks"
      description="Signed outbound event delivery and endpoint health."
      loading={webhooks.loading}
      error={webhooks.error}
      onRefresh={webhooks.refresh}
      action={
        <button
          type="button"
          disabled={busy === "create"}
          onClick={() => void handleCreateOrTest()}
          className="rounded-full bg-emerald-400 px-4 py-2 text-sm font-bold text-slate-950 disabled:opacity-50"
        >
          {busy === "create" ? "Creating..." : "Create test webhook"}
        </button>
      }
    >
      <Feedback message={message} error={actionError} />
      {webhooks.data ? (
        <div className="space-y-3">
          {webhooks.data.webhooks.map((webhook) => (
            <article
              key={webhook.id}
              className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-slate-900/60 p-4 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <h3 className="font-bold">{webhook.name}</h3>
                <p className="text-sm text-slate-400">
                  {webhook.enabled ? "Enabled" : "Disabled"} -{" "}
                  {webhook.lastDeliveryStatus ?? "No delivery yet"}
                </p>
              </div>
              <button
                type="button"
                disabled={busy === webhook.id}
                onClick={() => void handleCreateOrTest(webhook.id)}
                className="rounded-full border border-white/15 px-4 py-2 text-sm font-semibold disabled:opacity-50"
              >
                {busy === webhook.id ? "Testing..." : "Test"}
              </button>
            </article>
          ))}
        </div>
      ) : null}
    </ModulePanel>
  );
}

function ConnectorsModule() {
  const { accessToken } = useAuth();
  const connectors = useAuthedResource<ConnectorsResponse>(fetchConnectors);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function handleCreateOrTest(id?: string) {
    if (!accessToken) {
      return;
    }
    setBusy(id ?? "create");
    setMessage(null);
    setActionError(null);
    try {
      if (id) {
        await testConnectorEmail(accessToken, id);
        setMessage("Connector test attempted.");
      } else {
        await createConnector(accessToken, {
          name: "Default JSON Mail Connector",
          status: "INACTIVE",
          senderName: "V-AXIS",
          senderEmail: "no-reply@v-axis.local",
        });
        setMessage("Inactive connector created.");
      }
      connectors.refresh();
    } catch (error) {
      setActionError(normalizeError(error));
    } finally {
      setBusy(null);
    }
  }

  return (
    <ModulePanel
      title="Connectors"
      description="Email connector settings for invites, resets, assignments, and escalations."
      loading={connectors.loading}
      error={connectors.error}
      onRefresh={connectors.refresh}
      action={
        <button
          type="button"
          disabled={busy === "create"}
          onClick={() => void handleCreateOrTest()}
          className="rounded-full bg-emerald-400 px-4 py-2 text-sm font-bold text-slate-950 disabled:opacity-50"
        >
          {busy === "create" ? "Creating..." : "Create connector"}
        </button>
      }
    >
      <Feedback message={message} error={actionError} />
      {connectors.data ? (
        <div className="space-y-3">
          {connectors.data.connectors.map((connector) => (
            <article
              key={connector.id}
              className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-slate-900/60 p-4 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <h3 className="font-bold">{connector.name}</h3>
                <p className="text-sm text-slate-400">
                  {connector.status} - {connector.senderEmail}
                </p>
              </div>
              <button
                type="button"
                disabled={busy === connector.id}
                onClick={() => void handleCreateOrTest(connector.id)}
                className="rounded-full border border-white/15 px-4 py-2 text-sm font-semibold disabled:opacity-50"
              >
                {busy === connector.id ? "Testing..." : "Test email"}
              </button>
            </article>
          ))}
        </div>
      ) : null}
    </ModulePanel>
  );
}

function AutomationModule() {
  const { accessToken } = useAuth();
  const automation = useAuthedResource<AutomationOverviewResponse>((token) =>
    fetchAutomationOverview(token, 12),
  );
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function runMaintenance(
    name:
      | "maintenance.governance.refresh-all-tenants"
      | "maintenance.notifications.escalate-all-tenants",
  ) {
    if (!accessToken) {
      return;
    }

    setBusyAction(name);
    setMessage(null);
    setActionError(null);
    try {
      const result = await runAutomationMaintenance(accessToken, name);
      setMessage(result.message);
      automation.refresh();
    } catch (error) {
      setActionError(normalizeError(error));
    } finally {
      setBusyAction(null);
    }
  }

  async function replayDelivery(id: string) {
    if (!accessToken) {
      return;
    }

    setBusyAction(id);
    setMessage(null);
    setActionError(null);
    try {
      const result = await replayAutomationDelivery(accessToken, id);
      setMessage(result.message);
      automation.refresh();
    } catch (error) {
      setActionError(normalizeError(error));
    } finally {
      setBusyAction(null);
    }
  }

  async function replayOcr(id: string) {
    if (!accessToken) {
      return;
    }

    setBusyAction(id);
    setMessage(null);
    setActionError(null);
    try {
      const result = await replayAutomationOcr(accessToken, id);
      setMessage(result.message);
      automation.refresh();
    } catch (error) {
      setActionError(normalizeError(error));
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <ModulePanel
      title="Automation"
      description="Worker, queue health, schedulers, recent deliveries, and failures."
      loading={automation.loading}
      error={automation.error}
      onRefresh={automation.refresh}
    >
      <Feedback message={message} error={actionError} />
      {automation.data ? (
        <>
          <MetricGrid
            metrics={[
              ["Delivery mode", automation.data.worker.deliveryMode],
              [
                "Queue available",
                automation.data.worker.queueAvailable ? "Yes" : "No",
              ],
              ["Failed deliveries", String(automation.data.failureSummary.deliveryFailed)],
              [
                "Failed jobs",
                String(
                  automation.data.failureSummary.deliveryFailed +
                    automation.data.failureSummary.maintenanceFailed +
                    automation.data.failureSummary.ocrFailed,
                ),
              ],
            ]}
          />
          <div className="mb-6 grid gap-3 md:grid-cols-3">
            {Object.entries(automation.data.queues).map(([name, counts]) => (
              <article
                key={name}
                className="rounded-2xl border border-white/10 bg-slate-900/60 p-4"
              >
                <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-slate-400">
                  {name}
                </h3>
                <p className="mt-3 text-sm text-slate-300">
                  active {counts.active} - waiting {counts.waiting} - failed{" "}
                  {counts.failed}
                </p>
              </article>
            ))}
          </div>
          <div className="mb-6 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                runMaintenance("maintenance.governance.refresh-all-tenants")
              }
              disabled={
                busyAction === "maintenance.governance.refresh-all-tenants"
              }
              className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-slate-100 disabled:opacity-50"
            >
              {busyAction === "maintenance.governance.refresh-all-tenants" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCcw className="h-4 w-4" />
              )}
              Run Governance
            </button>
            <button
              type="button"
              onClick={() =>
                runMaintenance("maintenance.notifications.escalate-all-tenants")
              }
              disabled={
                busyAction === "maintenance.notifications.escalate-all-tenants"
              }
              className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-slate-100 disabled:opacity-50"
            >
              {busyAction === "maintenance.notifications.escalate-all-tenants" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Bell className="h-4 w-4" />
              )}
              Run Escalation
            </button>
          </div>
          <DataList
            title="Recent Deliveries"
            items={automation.data.recentDeliveries.map((job) => ({
              title: job.jobName,
              detail: `${job.status} - attempts ${job.attemptsMade}/${job.maxAttempts}`,
              tone: job.availableForReplay ? "replayable" : undefined,
            }))}
          />
          <AutomationReplayList
            title="Failed Delivery Replay"
            jobs={automation.data.recentDeliveries}
            busyAction={busyAction}
            onReplay={replayDelivery}
          />
          <AutomationReplayList
            title="Recent OCR Jobs"
            jobs={automation.data.recentOcrJobs}
            busyAction={busyAction}
            onReplay={replayOcr}
          />
          <DataList
            title="Maintenance Runs"
            items={automation.data.recentMaintenanceRuns.map((job) => ({
              title: job.jobName,
              detail: `${job.status} - attempts ${job.attemptsMade}/${job.maxAttempts}`,
            }))}
          />
        </>
      ) : null}
    </ModulePanel>
  );
}

function AutomationReplayList({
  title,
  jobs,
  busyAction,
  onReplay,
}: {
  title: string;
  jobs: AutomationOverviewResponse["recentDeliveries"];
  busyAction: string | null;
  onReplay: (id: string) => void;
}) {
  const replayableJobs = jobs.filter((job) => job.availableForReplay);

  if (replayableJobs.length === 0) {
    return null;
  }

  return (
    <section className="mt-6">
      <h3 className="mb-3 text-sm font-bold uppercase tracking-[0.18em] text-slate-400">
        {title}
      </h3>
      <div className="space-y-3">
        {replayableJobs.map((job) => (
          <article
            key={job.id}
            className="rounded-2xl border border-white/10 bg-slate-900/60 p-4"
          >
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h4 className="font-bold">{job.jobName}</h4>
                <p className="mt-1 text-sm text-slate-400">
                  {job.error ?? `Attempts ${job.attemptsMade}/${job.maxAttempts}`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onReplay(job.id)}
                disabled={busyAction === job.id}
                className="inline-flex items-center gap-2 rounded-full bg-emerald-400 px-4 py-2 text-sm font-bold text-slate-950 disabled:opacity-50"
              >
                {busyAction === job.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCcw className="h-4 w-4" />
                )}
                Replay
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function ModulePanel({
  title,
  description,
  loading,
  error,
  onRefresh,
  action,
  children,
}: {
  title: string;
  description: string;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 sm:p-6">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight">{title}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            {description}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {action}
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {loading ? <LoadingBlock label={`Loading ${title.toLowerCase()}`} /> : null}
      {error ? <Feedback error={error} /> : null}
      {!loading && !error ? children : null}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-300">
        {label}
      </span>
      <input
        type={type}
        value={value}
        required={required}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-300"
      />
    </label>
  );
}

function ActionButton({
  label,
  loading,
  disabled,
}: {
  label: string;
  loading: boolean;
  disabled: boolean;
}) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      {label}
    </button>
  );
}

function LoadingBlock({ label }: { label: string }) {
  return (
    <div className="flex min-h-40 items-center justify-center rounded-2xl border border-white/10 bg-slate-900/50 text-slate-300">
      <Loader2 className="mr-3 h-5 w-5 animate-spin text-emerald-300" />
      {label}
    </div>
  );
}

function Feedback({
  message,
  error,
}: {
  message?: string | null;
  error?: string | null;
}) {
  if (!message && !error) {
    return null;
  }

  return (
    <div
      className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${
        error
          ? "border-rose-400/30 bg-rose-400/10 text-rose-100"
          : "border-emerald-300/30 bg-emerald-300/10 text-emerald-100"
      }`}
    >
      {error ?? message}
    </div>
  );
}

function ReadinessCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  tone: "good" | "warn";
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <Icon
        className={`h-5 w-5 ${tone === "good" ? "text-emerald-300" : "text-amber-300"}`}
      />
      <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold text-slate-100">{value}</p>
    </div>
  );
}

function MetricGrid({ metrics }: { metrics: Array<[string, string]> }) {
  return (
    <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map(([label, value]) => (
        <div key={label} className="rounded-2xl bg-slate-900/70 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
            {label}
          </p>
          <p className="mt-3 text-2xl font-black text-white">{value}</p>
        </div>
      ))}
    </div>
  );
}

function DataList({
  title,
  items,
}: {
  title: string;
  items: Array<{ title: string; detail: string; tone?: string }>;
}) {
  const visibleItems = useMemo(() => items.filter(Boolean), [items]);

  return (
    <div>
      <h3 className="mb-3 text-sm font-bold uppercase tracking-[0.18em] text-slate-400">
        {title}
      </h3>
      {visibleItems.length > 0 ? (
        <div className="space-y-3">
          {visibleItems.map((item, index) => (
            <article
              key={`${item.title}-${index}`}
              className="rounded-2xl border border-white/10 bg-slate-900/60 p-4"
            >
              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div>
                  <h4 className="font-bold">{item.title}</h4>
                  <p className="mt-1 text-sm text-slate-400">{item.detail}</p>
                </div>
                {item.tone ? (
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs uppercase text-slate-300">
                    {item.tone}
                  </span>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-white/15 p-6 text-sm text-slate-400">
          No records returned yet.
        </div>
      )}
    </div>
  );
}
