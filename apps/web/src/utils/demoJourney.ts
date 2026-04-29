export type ModuleKey =
  | "dashboard"
  | "entity-vault"
  | "workforce"
  | "action-center"
  | "governance-trail";

export type ScenarioKey = "stable" | "warning" | "critical";

export type RecordStatus =
  | "active"
  | "expiring-soon"
  | "renewal-in-progress"
  | "missing"
  | "overdue";

export type Priority = "low" | "medium" | "high" | "critical";

export type EntityDocument = {
  id: string;
  subsidiary: string;
  title: string;
  documentType: string;
  authority: string;
  number: string;
  referenceNumber: string;
  issueDate: string;
  expiryDate: string;
  status: RecordStatus;
  owner: string;
  requiredForRenewal: Array<{
    title: string;
    referenceNumber: string;
    status: "Active" | "Pending" | "Expired";
  }>;
  approvalFlow: Array<{
    stakeholder: string;
    status: "Granted" | "Pending" | "Escalated";
    timestamp: string;
  }>;
  linkedEmployeeIds: string[];
  journeyLabel: string;
};

export type WorkforceRecord = {
  id: string;
  subsidiary: string;
  employeeName: string;
  role: string;
  department: string;
  owner: string;
  iqamaNumber: string;
  iqamaExpiry: string;
  workPermitNumber: string;
  workPermitExpiry: string;
  status: RecordStatus;
  linkedDocumentIds: string[];
};

export type DemoTask = {
  id: string;
  title: string;
  owner: string;
  dueDate: string;
  status: "open" | "in-progress" | "done";
  priority: Priority;
  module: ModuleKey;
  relatedType: "document" | "employee";
  relatedId: string;
};

export type DemoNotification = {
  id: string;
  title: string;
  message: string;
  severity: Priority;
  relatedType: "document" | "employee" | "task";
  relatedId: string;
  status: "new" | "acknowledged" | "escalated" | "resolved";
  latestUpdate: string;
  channels: {
    whatsapp: "sent";
    email: "sent";
    sms: "sent";
    inApp: "sent";
  };
};

export type DemoActivity = {
  id: string;
  timestamp: string;
  title: string;
  detail: string;
  module: ModuleKey;
};

export type DemoState = {
  documents: EntityDocument[];
  workforce: WorkforceRecord[];
  tasks: DemoTask[];
  notifications: DemoNotification[];
  activities: DemoActivity[];
};

export const subsidiaries = [
  "Zedan Group HQ",
  "Zedan Retail",
  "Zedan Energy Services",
] as const;

export const scenarioDescriptions: Record<ScenarioKey, string> = {
  stable:
    "Operationally stable. Everything is clickable, but most records are healthy and the journey focuses on visibility.",
  warning:
    "Balanced operational tension. Baladiyah, ZATCA, and workforce documents need coordinated action.",
  critical:
    "Escalation mode. Multiple items are overdue and the platform shows ownership, reminders, and recovery.",
};

function addDays(baseIso: string, days: number) {
  const date = new Date(baseIso);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

const baseDate = "2026-04-22";

export function createDemoState(scenario: ScenarioKey): DemoState {
  const documents: EntityDocument[] = [
    {
      id: "doc-cr-hq",
      subsidiary: "Zedan Group HQ",
      title: "Commercial Registration (CR)",
      documentType: "CR and chamber",
      authority: "Ministry of Commerce",
      number: "CR-1010458891",
      referenceNumber: "ZG-HQ-GOV-001",
      issueDate: addDays(baseDate, -320),
      expiryDate: addDays(baseDate, scenario === "critical" ? -14 : 120),
      status: scenario === "critical" ? "overdue" : "active",
      owner: "Corporate Affairs",
      requiredForRenewal: [
        { title: "Chamber of Commerce", referenceNumber: "ZG-HQ-GOV-002", status: "Active" },
        { title: "Zakat/ VAT", referenceNumber: "ZG-HQ-GOV-003", status: "Active" },
        { title: "Wasil Registration", referenceNumber: "ZG-HQ-GOV-004", status: "Active" },
      ],
      approvalFlow: [
        { stakeholder: "Corporate Affairs", status: "Granted", timestamp: addDays(baseDate, -2) },
        { stakeholder: "Finance Controller", status: scenario === "critical" ? "Pending" : "Granted", timestamp: addDays(baseDate, -1) },
        { stakeholder: "Client Admin", status: scenario === "critical" ? "Pending" : "Granted", timestamp: baseDate },
      ],
      linkedEmployeeIds: ["emp-hq-legal", "emp-hq-admin"],
      journeyLabel: "Entity Readiness",
    },
    {
      id: "doc-zatca-hq",
      subsidiary: "Zedan Group HQ",
      title: "ZATCA Certificate",
      documentType: "Zakat/ Vat",
      authority: "ZATCA",
      number: "ZT-771002991",
      referenceNumber: "ZG-HQ-GOV-003",
      issueDate: addDays(baseDate, -280),
      expiryDate: addDays(baseDate, scenario === "stable" ? 140 : 38),
      status: scenario === "stable" ? "active" : "expiring-soon",
      owner: "Finance Controller",
      requiredForRenewal: [
        { title: "Commercial Registration (CR)", referenceNumber: "ZG-HQ-GOV-001", status: "Active" },
        { title: "Bank account", referenceNumber: "ZG-HQ-B2B-002", status: "Active" },
      ],
      approvalFlow: [
        { stakeholder: "Finance Controller", status: "Granted", timestamp: addDays(baseDate, -1) },
        { stakeholder: "Client Admin", status: "Pending", timestamp: baseDate },
      ],
      linkedEmployeeIds: ["emp-hq-finance"],
      journeyLabel: "Tax Readiness",
    },
    {
      id: "doc-baladiyah-retail",
      subsidiary: "Zedan Retail",
      title: "Baladiyah License",
      documentType: "Baladyah License",
      authority: "Municipality",
      number: "BAL-RET-22019",
      referenceNumber: "ZR-GOV-003",
      issueDate: addDays(baseDate, -350),
      expiryDate: addDays(
        baseDate,
        scenario === "stable" ? 110 : scenario === "warning" ? 18 : -9,
      ),
      status:
        scenario === "stable"
          ? "active"
          : scenario === "warning"
            ? "expiring-soon"
            : "overdue",
      owner: "Retail Operations",
      requiredForRenewal: [
        { title: "Commercial Registration (CR)", referenceNumber: "ZR-GOV-001", status: "Active" },
        { title: "Office space contract", referenceNumber: "ZR-B2B-009", status: "Active" },
        { title: "Salamah Certificate", referenceNumber: "ZR-GOV-004", status: scenario === "critical" ? "Pending" : "Active" },
      ],
      approvalFlow: [
        { stakeholder: "Retail Operations", status: "Granted", timestamp: addDays(baseDate, -1) },
        { stakeholder: "Government Relations", status: scenario === "critical" ? "Escalated" : "Pending", timestamp: baseDate },
        { stakeholder: "Client Admin", status: "Pending", timestamp: addDays(baseDate, 1) },
      ],
      linkedEmployeeIds: ["emp-retail-ops", "emp-retail-store"],
      journeyLabel: "Municipality Renewal",
    },
    {
      id: "doc-salamah-retail",
      subsidiary: "Zedan Retail",
      title: "Salamah Certificate",
      documentType: "salamah",
      authority: "Civil Defense",
      number: "SAL-RET-11084",
      referenceNumber: "ZR-GOV-004",
      issueDate: addDays(baseDate, -260),
      expiryDate: addDays(baseDate, scenario === "critical" ? 6 : 64),
      status: scenario === "critical" ? "expiring-soon" : "active",
      owner: "HSE Officer",
      requiredForRenewal: [
        { title: "Baladiyah License", referenceNumber: "ZR-GOV-003", status: "Active" },
        { title: "Office space contract", referenceNumber: "ZR-B2B-009", status: "Active" },
      ],
      approvalFlow: [
        { stakeholder: "HSE Officer", status: "Granted", timestamp: addDays(baseDate, -1) },
        { stakeholder: "Retail Operations", status: "Pending", timestamp: baseDate },
      ],
      linkedEmployeeIds: ["emp-retail-store"],
      journeyLabel: "Site Readiness",
    },
    {
      id: "doc-gosi-energy",
      subsidiary: "Zedan Energy Services",
      title: "GOSI Registration",
      documentType: "GOSI",
      authority: "GOSI",
      number: "GOSI-ES-7781",
      referenceNumber: "ZE-GOV-005",
      issueDate: addDays(baseDate, -230),
      expiryDate: addDays(baseDate, 92),
      status: "active",
      owner: "HR Operations",
      requiredForRenewal: [
        { title: "Labor office file", referenceNumber: "ZE-GOV-006", status: "Active" },
        { title: "CR and chamber", referenceNumber: "ZE-GOV-001", status: "Active" },
      ],
      approvalFlow: [
        { stakeholder: "HR Operations", status: "Granted", timestamp: addDays(baseDate, -3) },
        { stakeholder: "Government Relations", status: "Granted", timestamp: addDays(baseDate, -2) },
      ],
      linkedEmployeeIds: ["emp-energy-ops", "emp-energy-field"],
      journeyLabel: "Workforce Coverage",
    },
    {
      id: "doc-labor-energy",
      subsidiary: "Zedan Energy Services",
      title: "Labor Office File",
      documentType: "Labor office file",
      authority: "Ministry of Human Resources",
      number: "LAB-ES-4108",
      referenceNumber: "ZE-GOV-006",
      issueDate: addDays(baseDate, -210),
      expiryDate: addDays(baseDate, scenario === "critical" ? -3 : 56),
      status: scenario === "critical" ? "overdue" : "active",
      owner: "Government Relations",
      requiredForRenewal: [
        { title: "GOSI Registration", referenceNumber: "ZE-GOV-005", status: "Active" },
        { title: "Zakat/ VAT", referenceNumber: "ZE-GOV-003", status: "Active" },
      ],
      approvalFlow: [
        { stakeholder: "Government Relations", status: scenario === "critical" ? "Escalated" : "Granted", timestamp: addDays(baseDate, -1) },
        { stakeholder: "Client Admin", status: scenario === "critical" ? "Pending" : "Granted", timestamp: baseDate },
      ],
      linkedEmployeeIds: ["emp-energy-ops"],
      journeyLabel: "Government Access",
    },
    {
      id: "doc-wasil-hq",
      subsidiary: "Zedan Group HQ",
      title: "Wasil Registration",
      documentType: "Post office",
      authority: "Saudi Post",
      number: "WAS-33018",
      referenceNumber: "ZG-HQ-GOV-004",
      issueDate: addDays(baseDate, -180),
      expiryDate: addDays(baseDate, 88),
      status: "active",
      owner: "Admin Services",
      requiredForRenewal: [
        { title: "Commercial Registration (CR)", referenceNumber: "ZG-HQ-GOV-001", status: "Active" },
        { title: "Office space contract", referenceNumber: "ZG-HQ-B2B-009", status: "Active" },
      ],
      approvalFlow: [
        { stakeholder: "Admin Services", status: "Granted", timestamp: addDays(baseDate, -4) },
        { stakeholder: "Corporate Affairs", status: "Granted", timestamp: addDays(baseDate, -3) },
      ],
      linkedEmployeeIds: ["emp-hq-admin"],
      journeyLabel: "Address Continuity",
    },
  ];

  const workforce: WorkforceRecord[] = [
    {
      id: "emp-hq-legal",
      subsidiary: "Zedan Group HQ",
      employeeName: "Rashed Al-Qahtani",
      role: "Government Relations Lead",
      department: "Corporate Affairs",
      owner: "HR Operations",
      iqamaNumber: "IQ-20018822",
      iqamaExpiry: addDays(baseDate, scenario === "critical" ? -5 : 78),
      workPermitNumber: "WP-20018822",
      workPermitExpiry: addDays(baseDate, scenario === "warning" ? 24 : 121),
      status:
        scenario === "critical"
          ? "overdue"
          : scenario === "warning"
            ? "expiring-soon"
            : "active",
      linkedDocumentIds: ["doc-cr-hq", "doc-zatca-hq"],
    },
    {
      id: "emp-hq-admin",
      subsidiary: "Zedan Group HQ",
      employeeName: "Maha Al-Suwaidi",
      role: "Administration Manager",
      department: "Admin Services",
      owner: "HR Operations",
      iqamaNumber: "IQ-20017777",
      iqamaExpiry: addDays(baseDate, 140),
      workPermitNumber: "WP-20017777",
      workPermitExpiry: addDays(baseDate, 147),
      status: "active",
      linkedDocumentIds: ["doc-cr-hq", "doc-wasil-hq"],
    },
    {
      id: "emp-hq-finance",
      subsidiary: "Zedan Group HQ",
      employeeName: "Sultan Al-Harbi",
      role: "Finance Controller",
      department: "Finance",
      owner: "HR Operations",
      iqamaNumber: "IQ-20012220",
      iqamaExpiry: addDays(baseDate, 125),
      workPermitNumber: "WP-20012220",
      workPermitExpiry: addDays(baseDate, 89),
      status: "active",
      linkedDocumentIds: ["doc-zatca-hq"],
    },
    {
      id: "emp-retail-ops",
      subsidiary: "Zedan Retail",
      employeeName: "Fahad Al-Otaibi",
      role: "Retail Operations Manager",
      department: "Operations",
      owner: "HR Retail",
      iqamaNumber: "IQ-30011239",
      iqamaExpiry: addDays(baseDate, scenario === "warning" ? 16 : 102),
      workPermitNumber: "WP-30011239",
      workPermitExpiry: addDays(baseDate, scenario === "critical" ? -2 : 34),
      status:
        scenario === "critical"
          ? "overdue"
          : scenario === "warning"
            ? "expiring-soon"
            : "active",
      linkedDocumentIds: ["doc-baladiyah-retail"],
    },
    {
      id: "emp-retail-store",
      subsidiary: "Zedan Retail",
      employeeName: "Noura Al-Dossary",
      role: "Store Administration Supervisor",
      department: "Store Operations",
      owner: "HR Retail",
      iqamaNumber: "IQ-30014480",
      iqamaExpiry: addDays(baseDate, 55),
      workPermitNumber: "WP-30014480",
      workPermitExpiry: addDays(baseDate, scenario === "warning" ? 20 : 66),
      status: scenario === "warning" ? "expiring-soon" : "active",
      linkedDocumentIds: ["doc-baladiyah-retail", "doc-salamah-retail"],
    },
    {
      id: "emp-energy-ops",
      subsidiary: "Zedan Energy Services",
      employeeName: "Ahmed Al-Rashid",
      role: "Operations Director",
      department: "Energy Operations",
      owner: "HR Energy",
      iqamaNumber: "IQ-40019822",
      iqamaExpiry: addDays(baseDate, 74),
      workPermitNumber: "WP-40019822",
      workPermitExpiry: addDays(baseDate, 71),
      status: "active",
      linkedDocumentIds: ["doc-gosi-energy", "doc-labor-energy"],
    },
    {
      id: "emp-energy-field",
      subsidiary: "Zedan Energy Services",
      employeeName: "Khalid Al-Mutairi",
      role: "Field Supervisor",
      department: "Field Operations",
      owner: "HR Energy",
      iqamaNumber: "IQ-40014491",
      iqamaExpiry: addDays(baseDate, scenario === "critical" ? 8 : 62),
      workPermitNumber: "WP-40014491",
      workPermitExpiry: addDays(baseDate, scenario === "critical" ? 12 : 85),
      status: scenario === "critical" ? "expiring-soon" : "active",
      linkedDocumentIds: ["doc-gosi-energy"],
    },
  ];

  const tasks: DemoTask[] = [
    {
      id: "task-baladiyah",
      title: "Renew Baladiyah License for Zedan Retail",
      owner: "Retail Operations",
      dueDate: addDays(baseDate, scenario === "critical" ? 1 : 7),
      status: scenario === "stable" ? "done" : "open",
      priority: scenario === "critical" ? "critical" : "high",
      module: "entity-vault",
      relatedType: "document",
      relatedId: "doc-baladiyah-retail",
    },
    {
      id: "task-workforce",
      title: "Prepare workforce renewal pack for Retail Operations Manager",
      owner: "HR Retail",
      dueDate: addDays(baseDate, 3),
      status: scenario === "stable" ? "done" : "in-progress",
      priority: "high",
      module: "workforce",
      relatedType: "employee",
      relatedId: "emp-retail-ops",
    },
    {
      id: "task-zatca",
      title: "Review ZATCA renewal documents for Group HQ",
      owner: "Finance Controller",
      dueDate: addDays(baseDate, 9),
      status: scenario === "stable" ? "done" : "open",
      priority: "medium",
      module: "entity-vault",
      relatedType: "document",
      relatedId: "doc-zatca-hq",
    },
  ];

  const notifications: DemoNotification[] = [
    {
      id: "note-baladiyah",
      title: "Baladiyah license nearing expiry",
      message:
        "Retail municipality renewal should be initiated to avoid operating disruption.",
      severity: scenario === "critical" ? "critical" : "high",
      relatedType: "document",
      relatedId: "doc-baladiyah-retail",
      status: "new",
      latestUpdate: "Alert delivered by WhatsApp, email, SMS, and in-app bell.",
      channels: {
        whatsapp: "sent",
        email: "sent",
        sms: "sent",
        inApp: "sent",
      },
    },
    {
      id: "note-workforce",
      title: "Workforce legal documents require attention",
      message:
        "Retail Operations Manager has linked iqama / permit documents entering renewal window.",
      severity: "high",
      relatedType: "employee",
      relatedId: "emp-retail-ops",
      status: "new",
      latestUpdate: "Stakeholders were alerted across all delivery channels.",
      channels: {
        whatsapp: "sent",
        email: "sent",
        sms: "sent",
        inApp: "sent",
      },
    },
  ];

  const activities: DemoActivity[] = [
    {
      id: "act-1",
      timestamp: `${baseDate}T08:15:00.000Z`,
      title: "Scenario initialized",
      detail: `Workspace loaded in ${scenario.toUpperCase()} mode.`,
      module: "dashboard",
    },
    {
      id: "act-2",
      timestamp: `${baseDate}T08:45:00.000Z`,
      title: "Baladiyah renewal task prepared",
      detail: "A coordinated entity and workforce recovery path is ready to showcase.",
      module: "action-center",
    },
    {
      id: "act-3",
      timestamp: `${baseDate}T09:10:00.000Z`,
      title: "Executive report draft available",
      detail: "A seeded management summary can be exported at any point in the journey.",
      module: "governance-trail",
    },
  ];

  return {
    documents,
    workforce,
    tasks,
    notifications,
    activities,
  };
}

export function countStatus<T extends { status: RecordStatus }>(
  items: T[],
  status: RecordStatus,
) {
  return items.filter((item) => item.status === status).length;
}

export function getDaysUntilExpiry(expiryDate: string, now = new Date(baseDate)) {
  const expiry = new Date(expiryDate);
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(expiry.getFullYear(), expiry.getMonth(), expiry.getDate());

  return Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

export function buildExportSummary(
  state: DemoState,
  subsidiary: string,
  scenario: ScenarioKey,
) {
  const docs = state.documents.filter((document) => document.subsidiary === subsidiary);
  const staff = state.workforce.filter((person) => person.subsidiary === subsidiary);
  const tasks = state.tasks.filter((task) => {
    const document = docs.find((doc) => doc.id === task.relatedId);
    const employee = staff.find((person) => person.id === task.relatedId);
    return Boolean(document || employee);
  });

  return [
    `V-AXIS Operational Summary`,
    `Scenario: ${scenario}`,
    `Subsidiary: ${subsidiary}`,
    "",
    "Entity documents:",
    ...docs.map(
      (doc) =>
        `- ${doc.title} | ${doc.status} | owner ${doc.owner} | expiry ${doc.expiryDate}`,
    ),
    "",
    "Workforce records:",
    ...staff.map(
      (person) =>
        `- ${person.employeeName} | ${person.status} | iqama ${person.iqamaExpiry} | permit ${person.workPermitExpiry}`,
    ),
    "",
    "Open tasks:",
    ...tasks.map(
      (task) => `- ${task.title} | ${task.status} | owner ${task.owner} | due ${task.dueDate}`,
    ),
  ].join("\n");
}
