import { type ReactNode, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  Briefcase,
  Building2,
  CheckCircle2,
  Clock3,
  Download,
  FileText,
  Landmark,
  Moon,
  ShieldCheck,
  Sun,
  Users,
} from "lucide-react";

import {
  buildExportSummary,
  countStatus,
  createDemoState,
  scenarioDescriptions,
  subsidiaries,
  type DemoActivity,
  type DemoNotification,
  type DemoState,
  type DemoTask,
  type EntityDocument,
  type ModuleKey,
  type Priority,
  type RecordStatus,
  type ScenarioKey,
  type WorkforceRecord,
} from "./utils/demoJourney";

const moduleLabels: Record<ModuleKey, string> = {
  dashboard: "Command Center",
  "entity-vault": "Entity Vault",
  workforce: "Workforce Portal",
  "action-center": "Action Center",
  "governance-trail": "Governance Trail",
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function appendActivity(
  state: DemoState,
  title: string,
  detail: string,
  module: ModuleKey,
) {
  const activity: DemoActivity = {
    id: `act-${crypto.randomUUID()}`,
    timestamp: new Date().toISOString(),
    title,
    detail,
    module,
  };

  return {
    ...state,
    activities: [activity, ...state.activities].slice(0, 12),
  };
}

function addNotification(
  state: DemoState,
  title: string,
  message: string,
  severity: Priority,
  relatedType: DemoNotification["relatedType"],
  relatedId: string,
) {
  const notification: DemoNotification = {
    id: `note-${crypto.randomUUID()}`,
    title,
    message,
    severity,
    relatedType,
    relatedId,
    status: "new",
  };

  return {
    ...state,
    notifications: [notification, ...state.notifications].slice(0, 8),
  };
}

function getPriorityClasses(priority: Priority, isDarkMode: boolean) {
  switch (priority) {
    case "critical":
      return "bg-destructive text-white";
    case "high":
      return isDarkMode ? "bg-amber-400/20 text-amber-100" : "bg-amber-500 text-slate-950";
    case "medium":
      return "bg-primary text-white";
    default:
      return isDarkMode ? "bg-slate-700/70 text-slate-100" : "bg-slate-200 text-slate-700";
  }
}

function getStatusTone(status: RecordStatus, isDarkMode: boolean) {
  switch (status) {
    case "active":
      return isDarkMode ? "bg-emerald-400/20 text-emerald-100" : "bg-emerald-100 text-emerald-700";
    case "expiring-soon":
      return isDarkMode ? "bg-amber-400/20 text-amber-100" : "bg-amber-100 text-amber-700";
    case "renewal-in-progress":
      return isDarkMode ? "bg-sky-400/20 text-sky-100" : "bg-sky-100 text-sky-700";
    case "missing":
      return isDarkMode ? "bg-slate-700/70 text-slate-100" : "bg-slate-200 text-slate-700";
    case "overdue":
      return isDarkMode ? "bg-rose-400/20 text-rose-100" : "bg-rose-100 text-rose-700";
    default:
      return isDarkMode ? "bg-slate-700/70 text-slate-100" : "bg-slate-200 text-slate-700";
  }
}

function triggerDownload(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function Surface(props: {
  title: string;
  description: string;
  action?: ReactNode;
  children: ReactNode;
  isDarkMode: boolean;
}) {
  const shellClass = props.isDarkMode
    ? "border-slate-700/80 bg-[rgba(9,17,31,0.82)]"
    : "border-white/40 bg-[rgba(248,250,252,0.74)]";

  return (
    <section
      className={`rounded-[2rem] border p-6 shadow-[var(--shadow-soft)] backdrop-blur ${shellClass}`}
    >
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2
            className="text-[1.8rem] tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {props.title}
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            {props.description}
          </p>
        </div>
        {props.action}
      </div>
      {props.children}
    </section>
  );
}

function PanelButton(props: {
  label: string;
  onClick: () => void;
  tone?: "primary" | "secondary" | "ghost";
  isDarkMode: boolean;
}) {
  const tone =
    props.tone === "secondary"
      ? props.isDarkMode
        ? "border-slate-700 bg-slate-900/82 text-slate-100"
        : "border-slate-200 bg-white text-slate-700"
      : props.tone === "ghost"
        ? props.isDarkMode
          ? "border-transparent bg-transparent text-emerald-300"
          : "border-transparent bg-transparent text-primary"
        : "border-primary bg-primary text-white";

  return (
    <button
      type="button"
      onClick={props.onClick}
      className={`rounded-2xl border px-4 py-2.5 text-sm font-medium transition-transform hover:scale-[1.02] ${tone}`}
    >
      {props.label}
    </button>
  );
}

function App() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [scenario, setScenario] = useState<ScenarioKey>("warning");
  const [module, setModule] = useState<ModuleKey>("dashboard");
  const [selectedSubsidiary, setSelectedSubsidiary] = useState<string>(subsidiaries[1]);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string>("doc-baladiyah-retail");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("emp-retail-ops");
  const [flashMessage, setFlashMessage] = useState<string | null>(null);
  const [demoState, setDemoState] = useState<DemoState>(() => createDemoState("warning"));

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDarkMode);
  }, [isDarkMode]);

  useEffect(() => {
    const nextState = createDemoState(scenario);
    setDemoState(nextState);
    setSelectedSubsidiary(scenario === "stable" ? subsidiaries[0] : subsidiaries[1]);
    setSelectedDocumentId("doc-baladiyah-retail");
    setSelectedEmployeeId("emp-retail-ops");
    setModule("dashboard");
    setFlashMessage(`Workspace reset to ${scenario.toUpperCase()} scenario.`);
  }, [scenario]);

  const subsidiaryDocuments = useMemo(
    () =>
      demoState.documents.filter(
        (document) => document.subsidiary === selectedSubsidiary,
      ),
    [demoState.documents, selectedSubsidiary],
  );

  const subsidiaryWorkforce = useMemo(
    () =>
      demoState.workforce.filter((employee) => employee.subsidiary === selectedSubsidiary),
    [demoState.workforce, selectedSubsidiary],
  );

  const selectedDocument =
    demoState.documents.find((document) => document.id === selectedDocumentId) ??
    subsidiaryDocuments[0] ??
    demoState.documents[0];

  const selectedEmployee =
    demoState.workforce.find((employee) => employee.id === selectedEmployeeId) ??
    subsidiaryWorkforce[0] ??
    demoState.workforce[0];

  const linkedEmployeeRecords = demoState.workforce.filter((employee) =>
    selectedDocument?.linkedEmployeeIds.includes(employee.id),
  );
  const linkedEntityRecords = demoState.documents.filter((document) =>
    selectedEmployee?.linkedDocumentIds.includes(document.id),
  );

  const overviewStats = useMemo(
    () => [
      {
        label: "Entity Assets",
        value: String(subsidiaryDocuments.length).padStart(2, "0"),
        onClick: () => setModule("entity-vault"),
      },
      {
        label: "Workforce Files",
        value: String(subsidiaryWorkforce.length).padStart(2, "0"),
        onClick: () => setModule("workforce"),
      },
      {
        label: "Due Soon / Overdue",
        value: String(
          countStatus(subsidiaryDocuments, "expiring-soon") +
            countStatus(subsidiaryDocuments, "overdue") +
            countStatus(subsidiaryWorkforce, "expiring-soon") +
            countStatus(subsidiaryWorkforce, "overdue"),
        ).padStart(2, "0"),
        onClick: () => setModule("action-center"),
      },
      {
        label: "Journey Events",
        value: String(demoState.activities.length).padStart(2, "0"),
        onClick: () => setModule("governance-trail"),
      },
    ],
    [demoState.activities.length, subsidiaryDocuments, subsidiaryWorkforce],
  );

  const reminderPlaybooks = [
    {
      id: "playbook-baladiyah",
      title: "Municipality Renewal Journey",
      description:
        "Show how Baladiyah risk moves from dashboard insight to owner assignment, reminder, and completed renewal.",
      action: () => {
        setSelectedSubsidiary("Zedan Retail");
        setSelectedDocumentId("doc-baladiyah-retail");
        setModule("entity-vault");
      },
    },
    {
      id: "playbook-cr-zatca",
      title: "CR / ZATCA Operating Readiness",
      description:
        "Show how business continuity depends on current CR and tax records with accountable owners.",
      action: () => {
        setSelectedSubsidiary("Zedan Group HQ");
        setSelectedDocumentId("doc-zatca-hq");
        setModule("entity-vault");
      },
    },
    {
      id: "playbook-workforce",
      title: "Workforce Legal File Journey",
      description:
        "Show how expiring iqama and permit records connect back to the subsidiary’s operating posture.",
      action: () => {
        setSelectedSubsidiary("Zedan Retail");
        setSelectedEmployeeId("emp-retail-ops");
        setModule("workforce");
      },
    },
  ];

  function announce(message: string) {
    setFlashMessage(message);
  }

  function updateDocument(documentId: string, updater: (document: EntityDocument) => EntityDocument) {
    setDemoState((current) => ({
      ...current,
      documents: current.documents.map((document) =>
        document.id === documentId ? updater(document) : document,
      ),
    }));
  }

  function updateEmployee(employeeId: string, updater: (employee: WorkforceRecord) => WorkforceRecord) {
    setDemoState((current) => ({
      ...current,
      workforce: current.workforce.map((employee) =>
        employee.id === employeeId ? updater(employee) : employee,
      ),
    }));
  }

  function assignDocumentOwner(documentId: string) {
    const nextOwner = "Government Relations Desk";
    updateDocument(documentId, (document) => ({ ...document, owner: nextOwner }));
    setDemoState((current) =>
      appendActivity(
        current,
        "Document owner reassigned",
        `${selectedDocument?.title ?? "Record"} is now owned by ${nextOwner}.`,
        "entity-vault",
      ),
    );
    announce("Owner updated and visible across the journey.");
  }

  function assignEmployeeOwner(employeeId: string) {
    const nextOwner = "HR Renewal Desk";
    updateEmployee(employeeId, (employee) => ({ ...employee, owner: nextOwner }));
    setDemoState((current) =>
      appendActivity(
        current,
        "Workforce owner reassigned",
        `${selectedEmployee?.employeeName ?? "Employee"} is now routed to ${nextOwner}.`,
        "workforce",
      ),
    );
    announce("Workforce record reassigned to HR Renewal Desk.");
  }

  function createReminderTask(
    title: string,
    moduleKey: ModuleKey,
    relatedType: DemoTask["relatedType"],
    relatedId: string,
    owner: string,
  ) {
    setDemoState((current) => {
      const task: DemoTask = {
        id: `task-${crypto.randomUUID()}`,
        title,
        owner,
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
          .toISOString()
          .slice(0, 10),
        status: "open",
        priority: "high",
        module: moduleKey,
        relatedType,
        relatedId,
      };

      const withTask = {
        ...current,
        tasks: [task, ...current.tasks],
      };
      const withNotification = addNotification(
        withTask,
        "Reminder scheduled",
        `${title} has been placed in the action queue.`,
        "high",
        "task",
        task.id,
      );

      return appendActivity(
        withNotification,
        "Reminder queued",
        `${title} is now tracked in the Action Center.`,
        "action-center",
      );
    });

    setModule("action-center");
    announce("Reminder created and routed into the Action Center.");
  }

  function startDocumentRenewal(documentId: string) {
    updateDocument(documentId, (document) => ({
      ...document,
      status: "renewal-in-progress",
    }));
    createReminderTask(
      `Complete renewal for ${selectedDocument?.title ?? "document"}`,
      "entity-vault",
      "document",
      documentId,
      selectedDocument?.owner ?? "Government Relations",
    );
    announce("Renewal journey started for the selected entity record.");
  }

  function uploadRenewedDocument(documentId: string) {
    updateDocument(documentId, (document) => ({
      ...document,
      status: "active",
      issueDate: new Date().toISOString().slice(0, 10),
      expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10),
    }));

    setDemoState((current) => {
      const updatedTasks = current.tasks.map((task) =>
        task.relatedId === documentId ? { ...task, status: "done" as const } : task,
      );
      const withTasks = {
        ...current,
        tasks: updatedTasks,
      };

      return appendActivity(
        withTasks,
        "Renewed document uploaded",
        `${selectedDocument?.title ?? "Document"} was renewed and the operating story turned green.`,
        "governance-trail",
      );
    });

    announce("Renewed document uploaded, task closed, and audit trail updated.");
  }

  function renewEmployeeRecord(employeeId: string) {
    updateEmployee(employeeId, (employee) => ({
      ...employee,
      status: "active",
      iqamaExpiry: new Date(Date.now() + 210 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10),
      workPermitExpiry: new Date(Date.now() + 240 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10),
    }));

    setDemoState((current) => {
      const updatedTasks = current.tasks.map((task) =>
        task.relatedId === employeeId ? { ...task, status: "done" as const } : task,
      );
      const withTasks = {
        ...current,
        tasks: updatedTasks,
      };

      return appendActivity(
        withTasks,
        "Workforce file renewed",
        `${selectedEmployee?.employeeName ?? "Employee"} now shows healthy legal documents.`,
        "governance-trail",
      );
    });

    announce("Workforce legal file renewed and reflected across the platform.");
  }

  function escalateTask(taskId: string) {
    setDemoState((current) => {
      const task = current.tasks.find((item) => item.id === taskId);
      if (!task) {
        return current;
      }

      const updatedTasks = current.tasks.map((item) =>
        item.id === taskId
          ? { ...item, priority: "critical" as const, status: "in-progress" as const }
          : item,
      );
      const withTasks = {
        ...current,
        tasks: updatedTasks,
      };
      const withNotification = addNotification(
        withTasks,
        "Task escalated",
        `${task.title} was escalated for immediate management attention.`,
        "critical",
        "task",
        task.id,
      );

      return appendActivity(
        withNotification,
        "Action escalated",
        `${task.title} is now in critical response mode.`,
        "action-center",
      );
    });

    announce("Task escalated and pushed back to the top of the queue.");
  }

  function acknowledgeNotification(notificationId: string) {
    setDemoState((current) => ({
      ...current,
      notifications: current.notifications.map((notification) =>
        notification.id === notificationId
          ? { ...notification, status: "acknowledged" }
          : notification,
      ),
    }));
    announce("Notification acknowledged.");
  }

  function exportDemoReport() {
    const content = buildExportSummary(demoState, selectedSubsidiary, scenario);
    triggerDownload("v-axis-operational-summary.txt", content);
    setDemoState((current) =>
      appendActivity(
        current,
        "Management summary exported",
        `A seeded report for ${selectedSubsidiary} was generated from the current journey state.`,
        "governance-trail",
      ),
    );
    announce("Seeded executive summary exported.");
  }

  const openTasks = demoState.tasks.filter((task) => task.status !== "done");
  const unresolvedNotifications = demoState.notifications.filter(
    (notification) => notification.status === "new",
  );
  const heroShellClass = isDarkMode
    ? "border-slate-700/80 bg-[linear-gradient(135deg,rgba(8,17,31,0.92),rgba(15,23,42,0.8))]"
    : "border-white/35 bg-[linear-gradient(135deg,rgba(248,250,252,0.78),rgba(226,232,240,0.48))]";
  const recessedPanelClass = isDarkMode
    ? "border-slate-700/80 bg-slate-950/55"
    : "border-white/40 bg-background/80";
  const elevatedPanelClass = isDarkMode
    ? "border-slate-700 bg-slate-950/70"
    : "border-white/45 bg-background/85";
  const solidCardClass = isDarkMode
    ? "border-slate-700 bg-slate-900/82 text-slate-100"
    : "border-slate-200 bg-white text-slate-700";
  const mutedCardClass = isDarkMode
    ? "border-slate-700 bg-slate-800/82 text-slate-100"
    : "border-slate-200 bg-slate-50 text-slate-700";
  const utilityButtonClass = isDarkMode
    ? "border-slate-700 bg-slate-950/80"
    : "border-white/45 bg-background/80";
  const inactiveSegmentClass = isDarkMode
    ? "border-slate-700 bg-slate-900/82 text-slate-100"
    : "border-slate-200 bg-white text-slate-700";
  const inactiveSurfaceTabClass = isDarkMode
    ? "border-slate-700 bg-slate-950/65 text-slate-100"
    : "border-white/40 bg-background/80 text-slate-700";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto min-h-screen max-w-[1720px] px-5 py-6 sm:px-8 lg:px-10">
        <header
          className={`mb-8 rounded-[2rem] border p-6 shadow-[var(--shadow-soft)] backdrop-blur ${heroShellClass}`}
        >
          <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <h1
                className="text-4xl tracking-tight sm:text-5xl"
                style={{ fontFamily: "var(--font-display)" }}
              >
                V-AXIS
              </h1>
              <p className="mt-2 text-sm uppercase tracking-[0.32em] text-primary">
                Operational Continuity Journey
              </p>
              <p className="mt-4 max-w-2xl text-sm text-muted-foreground">
                Entity readiness, workforce legal files, actions, and audit
                outcomes move together in one connected operating system.
              </p>
            </div>

            <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center md:justify-end">
              <button
                type="button"
                onClick={exportDemoReport}
                className={`inline-flex items-center justify-center gap-2 rounded-[1.5rem] border px-5 py-3 text-sm font-medium shadow-[var(--shadow-elevated)] transition-transform hover:scale-[1.02] ${utilityButtonClass}`}
              >
                <Download className="h-4 w-4 text-primary" />
                Export Operational Summary
              </button>

              <button
                type="button"
                onClick={() => setIsDarkMode((value) => !value)}
                className={`inline-flex items-center justify-center rounded-[1.5rem] border p-3 shadow-[var(--shadow-elevated)] transition-transform hover:scale-[1.04] ${utilityButtonClass}`}
                aria-label={isDarkMode ? "Enable light mode" : "Enable dark mode"}
              >
                {isDarkMode ? (
                  <Sun className="h-5 w-5 text-primary" />
                ) : (
                  <Moon className="h-5 w-5 text-primary" />
                )}
              </button>
            </div>
          </div>

          <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
            <div
              className={`rounded-[1.75rem] border p-4 shadow-[var(--shadow-recessed)] ${recessedPanelClass}`}
            >
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Active Story Scenario
                </p>
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  {scenario.toUpperCase()}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {(["stable", "warning", "critical"] as ScenarioKey[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setScenario(key)}
                    className={`rounded-2xl border px-4 py-2 text-sm font-medium transition-transform hover:scale-[1.02] ${
                      scenario === key
                        ? "border-primary bg-primary text-white"
                        : inactiveSegmentClass
                    }`}
                  >
                    {key.toUpperCase()}
                  </button>
                ))}
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                {scenarioDescriptions[scenario]}
              </p>
            </div>

            <div
              className={`rounded-[1.75rem] border p-4 shadow-[var(--shadow-recessed)] ${recessedPanelClass}`}
            >
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Active Subsidiary
                </p>
                <Building2 className="h-4 w-4 text-primary" />
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                {subsidiaries.map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setSelectedSubsidiary(name)}
                    className={`rounded-2xl border px-4 py-3 text-left text-sm font-medium transition-transform hover:scale-[1.01] ${
                      selectedSubsidiary === name
                        ? "border-primary bg-primary text-white"
                        : inactiveSegmentClass
                    }`}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {(Object.keys(moduleLabels) as ModuleKey[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setModule(key)}
                className={`rounded-[1.5rem] border px-4 py-3 text-left transition-transform hover:scale-[1.01] ${
                  module === key
                    ? "border-primary bg-primary text-white"
                    : inactiveSurfaceTabClass
                }`}
              >
                <div className="text-xs uppercase tracking-[0.18em] opacity-70">
                  Platform Surface
                </div>
                <div className="mt-1 text-sm font-semibold">{moduleLabels[key]}</div>
              </button>
            ))}
          </div>

          {flashMessage ? (
            <div className="mt-5 rounded-[1.25rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {flashMessage}
            </div>
          ) : null}
        </header>

        <main className="grid gap-8">
          {module === "dashboard" ? (
            <Surface
              title="Command Center"
              description="The command center starts the story, then routes the user into the right operating surface. Every card below is alive."
              isDarkMode={isDarkMode}
              action={
                <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                  <Bell className="h-4 w-4" />
                  {unresolvedNotifications.length} active alerts
                </div>
              }
            >
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {overviewStats.map((stat) => (
                  <button
                    key={stat.label}
                    type="button"
                    onClick={stat.onClick}
                    className={`rounded-[1.75rem] border p-5 text-left shadow-[var(--shadow-elevated)] transition-transform hover:-translate-y-1 hover:scale-[1.01] ${elevatedPanelClass}`}
                  >
                    <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                      {stat.label}
                    </p>
                    <p
                      className="mt-2 text-4xl text-primary"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      {stat.value}
                    </p>
                    <p className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary">
                      Open surface
                      <ArrowRight className="h-4 w-4" />
                    </p>
                  </button>
                ))}
              </div>

              <div className="mt-8 grid gap-6 xl:grid-cols-[1.3fr_1fr]">
                <div
                  className={`rounded-[1.75rem] border p-5 shadow-[var(--shadow-elevated)] ${elevatedPanelClass}`}
                >
                  <div className="mb-4 flex items-center gap-3">
                    <Landmark className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold">Customer-led Use Cases</h3>
                  </div>
                  <div className="space-y-4">
                    {reminderPlaybooks.map((playbook) => (
                      <button
                        key={playbook.id}
                        type="button"
                        onClick={playbook.action}
                        className={`w-full rounded-[1.5rem] border p-4 text-left transition-transform hover:scale-[1.01] ${solidCardClass}`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="font-semibold">{playbook.title}</p>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {playbook.description}
                            </p>
                          </div>
                          <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-primary" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div
                  className={`rounded-[1.75rem] border p-5 shadow-[var(--shadow-elevated)] ${elevatedPanelClass}`}
                >
                  <div className="mb-4 flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                    <h3 className="text-lg font-semibold">Current Story Trigger</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    For {selectedSubsidiary}, the platform is strongest when it shows how entity
                    readiness and workforce legal files move together.
                  </p>
                  <div className="mt-4 space-y-3">
                    {subsidiaryDocuments
                      .filter((document) => document.status !== "active")
                      .slice(0, 3)
                      .map((document) => (
                        <button
                          key={document.id}
                          type="button"
                          onClick={() => {
                            setSelectedDocumentId(document.id);
                            setModule("entity-vault");
                          }}
                          className={`w-full rounded-[1.25rem] border px-4 py-3 text-left transition-transform hover:scale-[1.01] ${solidCardClass}`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="font-medium">{document.title}</p>
                              <p className="text-sm text-muted-foreground">
                                {document.authority} · expires {formatDate(document.expiryDate)}
                              </p>
                            </div>
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${getStatusTone(
                                document.status,
                                isDarkMode,
                              )}`}
                            >
                              {document.status.replace(/-/g, " ")}
                            </span>
                          </div>
                        </button>
                      ))}
                  </div>
                </div>
              </div>
            </Surface>
          ) : null}

          {module === "entity-vault" ? (
            <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
              <Surface
                title="Entity Vault"
                description="This is where CR, ZATCA, Baladiyah, GOSI, Salamah, and related operating records become a real workflow rather than a dead card."
                isDarkMode={isDarkMode}
              >
                <div className="space-y-4">
                  {subsidiaryDocuments.map((document) => (
                    <button
                      key={document.id}
                      type="button"
                      onClick={() => setSelectedDocumentId(document.id)}
                      className={`w-full rounded-[1.6rem] border p-5 text-left shadow-[var(--shadow-elevated)] transition-transform hover:scale-[1.01] ${
                        selectedDocument?.id === document.id
                          ? "border-primary bg-primary/5"
                          : elevatedPanelClass
                      }`}
                    >
                      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div className="flex items-start gap-4">
                          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                            <FileText className="h-6 w-6" />
                          </div>
                          <div>
                            <p className="font-semibold">{document.title}</p>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {document.authority} · {document.number}
                            </p>
                            <p className="mt-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                              Owner {document.owner}
                            </p>
                          </div>
                        </div>
                        <div className="text-left md:text-right">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${getStatusTone(
                              document.status,
                              isDarkMode,
                            )}`}
                          >
                            {document.status.replace(/-/g, " ")}
                          </span>
                          <p className="mt-3 text-sm text-muted-foreground">
                            Expires {formatDate(document.expiryDate)}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </Surface>

              <Surface
                title={selectedDocument?.title ?? "Document Detail"}
                description="The detail pane is the heart of the story. Actions here update the Action Center, Governance Trail, and linked workforce records."
                isDarkMode={isDarkMode}
                action={
                  <span
                    className={`rounded-full px-4 py-2 text-xs font-semibold uppercase ${getStatusTone(
                      selectedDocument?.status ?? "active",
                      isDarkMode,
                    )}`}
                  >
                    {selectedDocument?.status.replace(/-/g, " ") ?? "active"}
                  </span>
                }
              >
                {selectedDocument ? (
                  <div className="space-y-5">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <InfoCard label="Authority" isDarkMode={isDarkMode}>{selectedDocument.authority}</InfoCard>
                      <InfoCard label="Document No." isDarkMode={isDarkMode}>{selectedDocument.number}</InfoCard>
                      <InfoCard label="Issue Date" isDarkMode={isDarkMode}>{formatDate(selectedDocument.issueDate)}</InfoCard>
                      <InfoCard label="Expiry Date" isDarkMode={isDarkMode}>{formatDate(selectedDocument.expiryDate)}</InfoCard>
                    </div>

                    <div className={`rounded-[1.5rem] border p-4 ${solidCardClass}`}>
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                        What This Story Proves
                      </p>
                      <p className={`mt-2 text-sm ${isDarkMode ? "text-slate-100" : "text-slate-700"}`}>
                        {selectedDocument.journeyLabel} is not isolated. This record links to
                        specific people and actions needed to keep the subsidiary operational.
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <PanelButton
                        label="Assign Owner"
                        isDarkMode={isDarkMode}
                        onClick={() => assignDocumentOwner(selectedDocument.id)}
                      />
                      <PanelButton
                        label="Queue Reminder"
                        tone="secondary"
                        isDarkMode={isDarkMode}
                        onClick={() =>
                          createReminderTask(
                            `Send reminder for ${selectedDocument.title}`,
                            "entity-vault",
                            "document",
                            selectedDocument.id,
                            selectedDocument.owner,
                          )
                        }
                      />
                      <PanelButton
                        label="Start Renewal"
                        tone="secondary"
                        isDarkMode={isDarkMode}
                        onClick={() => startDocumentRenewal(selectedDocument.id)}
                      />
                      <PanelButton
                        label="Upload Renewal"
                        tone="ghost"
                        isDarkMode={isDarkMode}
                        onClick={() => uploadRenewedDocument(selectedDocument.id)}
                      />
                    </div>

                    <div className={`rounded-[1.5rem] border p-4 ${solidCardClass}`}>
                      <div className="mb-3 flex items-center gap-2">
                        <Users className="h-4 w-4 text-primary" />
                        <p className="font-medium">Linked Workforce Records</p>
                      </div>
                      <div className="space-y-3">
                        {linkedEmployeeRecords.map((employee) => (
                          <button
                            key={employee.id}
                            type="button"
                            onClick={() => {
                              setSelectedEmployeeId(employee.id);
                              setModule("workforce");
                            }}
                            className={`w-full rounded-[1.1rem] border px-4 py-3 text-left transition-transform hover:scale-[1.01] ${mutedCardClass}`}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="font-medium">{employee.employeeName}</p>
                                <p className="text-sm text-muted-foreground">
                                  {employee.role} · {employee.department}
                                </p>
                              </div>
                              <span
                                className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${getStatusTone(
                                  employee.status,
                                  isDarkMode,
                                )}`}
                              >
                                {employee.status.replace(/-/g, " ")}
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : null}
              </Surface>
            </div>
          ) : null}

          {module === "workforce" ? (
            <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
              <Surface
                title="Workforce Portal"
                description="Workforce legal documents are showcased as an operational journey, connected back to Baladiyah, CR, ZATCA, and government-facing entity records."
                isDarkMode={isDarkMode}
              >
                <div className="space-y-4">
                  {subsidiaryWorkforce.map((employee) => (
                    <button
                      key={employee.id}
                      type="button"
                      onClick={() => setSelectedEmployeeId(employee.id)}
                      className={`w-full rounded-[1.6rem] border p-5 text-left shadow-[var(--shadow-elevated)] transition-transform hover:scale-[1.01] ${
                        selectedEmployee?.id === employee.id
                          ? "border-primary bg-primary/5"
                          : elevatedPanelClass
                      }`}
                    >
                      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div className="flex items-start gap-4">
                          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                            <Briefcase className="h-6 w-6" />
                          </div>
                          <div>
                            <p className="font-semibold">{employee.employeeName}</p>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {employee.role} · {employee.department}
                            </p>
                            <p className="mt-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                              Owner {employee.owner}
                            </p>
                          </div>
                        </div>
                        <div className="text-left md:text-right">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${getStatusTone(
                              employee.status,
                              isDarkMode,
                            )}`}
                          >
                            {employee.status.replace(/-/g, " ")}
                          </span>
                          <p className="mt-3 text-sm text-muted-foreground">
                            Iqama {formatDate(employee.iqamaExpiry)}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </Surface>

              <Surface
                title={selectedEmployee?.employeeName ?? "Workforce Detail"}
                description="Actions here create a visible bridge between employee legal files and the entity records needed for real-world operations."
                isDarkMode={isDarkMode}
                action={
                  <span
                    className={`rounded-full px-4 py-2 text-xs font-semibold uppercase ${getStatusTone(
                      selectedEmployee?.status ?? "active",
                      isDarkMode,
                    )}`}
                  >
                    {selectedEmployee?.status.replace(/-/g, " ") ?? "active"}
                  </span>
                }
              >
                {selectedEmployee ? (
                  <div className="space-y-5">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <InfoCard label="Iqama No." isDarkMode={isDarkMode}>{selectedEmployee.iqamaNumber}</InfoCard>
                      <InfoCard label="Iqama Expiry" isDarkMode={isDarkMode}>
                        {formatDate(selectedEmployee.iqamaExpiry)}
                      </InfoCard>
                      <InfoCard label="Permit No." isDarkMode={isDarkMode}>{selectedEmployee.workPermitNumber}</InfoCard>
                      <InfoCard label="Permit Expiry" isDarkMode={isDarkMode}>
                        {formatDate(selectedEmployee.workPermitExpiry)}
                      </InfoCard>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <PanelButton
                        label="Assign HR Owner"
                        isDarkMode={isDarkMode}
                        onClick={() => assignEmployeeOwner(selectedEmployee.id)}
                      />
                      <PanelButton
                        label="Queue Reminder"
                        tone="secondary"
                        isDarkMode={isDarkMode}
                        onClick={() =>
                          createReminderTask(
                            `Prepare legal file for ${selectedEmployee.employeeName}`,
                            "workforce",
                            "employee",
                            selectedEmployee.id,
                            selectedEmployee.owner,
                          )
                        }
                      />
                      <PanelButton
                        label="Upload New Copy"
                        tone="ghost"
                        isDarkMode={isDarkMode}
                        onClick={() => renewEmployeeRecord(selectedEmployee.id)}
                      />
                    </div>

                    <div className={`rounded-[1.5rem] border p-4 ${solidCardClass}`}>
                      <div className="mb-3 flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-primary" />
                        <p className="font-medium">Linked Entity Dependencies</p>
                      </div>
                      <div className="space-y-3">
                        {linkedEntityRecords.map((document) => (
                          <button
                            key={document.id}
                            type="button"
                            onClick={() => {
                              setSelectedDocumentId(document.id);
                              setModule("entity-vault");
                            }}
                            className={`w-full rounded-[1.1rem] border px-4 py-3 text-left transition-transform hover:scale-[1.01] ${mutedCardClass}`}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="font-medium">{document.title}</p>
                                <p className="text-sm text-muted-foreground">
                                  {document.authority} · owner {document.owner}
                                </p>
                              </div>
                              <span
                                className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${getStatusTone(
                                  document.status,
                                  isDarkMode,
                                )}`}
                              >
                                {document.status.replace(/-/g, " ")}
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : null}
              </Surface>
            </div>
          ) : null}

          {module === "action-center" ? (
            <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
              <Surface
                title="Action Center"
                description="This turns reminders, assignments, and escalations into the visible operating layer of the platform."
                isDarkMode={isDarkMode}
              >
                <div className="space-y-4">
                  {openTasks.map((task) => (
                    <div
                      key={task.id}
                      className={`rounded-[1.5rem] border p-5 shadow-[var(--shadow-elevated)] ${elevatedPanelClass}`}
                    >
                      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div>
                          <p className="font-semibold">{task.title}</p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            Owner {task.owner} · due {formatDate(task.dueDate)}
                          </p>
                          <p className="mt-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                            Routed from {moduleLabels[task.module]}
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${getPriorityClasses(
                            task.priority,
                            isDarkMode,
                          )}`}
                        >
                          {task.priority}
                        </span>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <PanelButton
                          label="Escalate"
                          isDarkMode={isDarkMode}
                          onClick={() => escalateTask(task.id)}
                        />
                        <PanelButton
                          label="Open Related Record"
                          tone="secondary"
                          isDarkMode={isDarkMode}
                          onClick={() => {
                            if (task.relatedType === "document") {
                              setSelectedDocumentId(task.relatedId);
                              setModule("entity-vault");
                            } else {
                              setSelectedEmployeeId(task.relatedId);
                              setModule("workforce");
                            }
                          }}
                        />
                        <PanelButton
                          label="Mark Complete"
                          tone="ghost"
                          isDarkMode={isDarkMode}
                          onClick={() => {
                            if (task.relatedType === "document") {
                              uploadRenewedDocument(task.relatedId);
                            } else {
                              renewEmployeeRecord(task.relatedId);
                            }
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </Surface>

              <Surface
                title="Notification Queue"
                description="Each reminder or escalation feeds a visible queue, giving the platform momentum, accountability, and consequence."
                isDarkMode={isDarkMode}
              >
                <div className="space-y-4">
                  {demoState.notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`rounded-[1.4rem] border p-4 ${solidCardClass}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">{notification.title}</p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {notification.message}
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${getPriorityClasses(
                            notification.severity,
                            isDarkMode,
                          )}`}
                        >
                          {notification.severity}
                        </span>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <PanelButton
                          label={
                            notification.status === "acknowledged"
                              ? "Acknowledged"
                              : "Acknowledge"
                          }
                          tone={
                            notification.status === "acknowledged"
                              ? "secondary"
                              : "ghost"
                          }
                          isDarkMode={isDarkMode}
                          onClick={() => acknowledgeNotification(notification.id)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </Surface>
            </div>
          ) : null}

          {module === "governance-trail" ? (
            <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
              <Surface
                title="Governance Trail"
                description="This closes the loop: every action taken in the platform leaves a visible record and becomes exportable for management."
                isDarkMode={isDarkMode}
                action={
                  <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                    <ShieldCheck className="h-4 w-4" />
                    audit-ready
                  </div>
                }
              >
                <div className="space-y-4">
                  {demoState.activities.map((activity) => (
                    <div
                      key={activity.id}
                      className={`rounded-[1.4rem] border p-5 shadow-[var(--shadow-elevated)] ${elevatedPanelClass}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">{activity.title}</p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {activity.detail}
                          </p>
                          <p className="mt-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                            {moduleLabels[activity.module]}
                          </p>
                        </div>
                        <div className="text-right text-xs text-muted-foreground">
                          {formatDate(activity.timestamp)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Surface>

              <Surface
                title="Narrative Outcomes"
                description="These are the outcomes the client should immediately understand after reviewing the platform journey."
                isDarkMode={isDarkMode}
              >
                <div className="space-y-4">
                  {[
                    "Entity readiness is not isolated. Baladiyah, CR, ZATCA, GOSI, and Labor Office File sit in one shared operating picture.",
                    "Workforce legal records are linked to the subsidiary story, not treated as a separate HR spreadsheet.",
                    "Every action creates visible consequences: tasks, notifications, and audit events.",
                    "The platform can stay seeded with live-looking operational context while still feeling fully connected and production-ready.",
                  ].map((line) => (
                    <div
                      key={line}
                      className={`rounded-[1.4rem] border px-4 py-4 ${solidCardClass}`}
                    >
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                        <p className={`text-sm ${isDarkMode ? "text-slate-100" : "text-slate-700"}`}>{line}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Surface>
            </div>
          ) : null}
        </main>
      </div>
    </div>
  );
}

function InfoCard(props: { label: string; children: ReactNode; isDarkMode: boolean }) {
  return (
    <div className={`rounded-[1.1rem] p-4 ${props.isDarkMode ? "bg-slate-900/75" : "bg-slate-50"}`}>
      <div className="mb-1 text-xs uppercase tracking-[0.16em] text-muted-foreground">
        {props.label}
      </div>
      <div className={`text-sm font-medium ${props.isDarkMode ? "text-slate-100" : "text-slate-700"}`}>
        {props.children}
      </div>
    </div>
  );
}

export default App;
