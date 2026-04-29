import { type ReactNode, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  BellRing,
  Briefcase,
  Building2,
  CheckCircle2,
  Clock3,
  Download,
  FileText,
  Landmark,
  Mail,
  MessageCircleMore,
  Moon,
  ShieldCheck,
  Smartphone,
  Sun,
  Users,
} from "lucide-react";

import {
  countStatus,
  createDemoState,
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

type Locale = "en" | "ar";

const moduleLabelsByLocale: Record<Locale, Record<ModuleKey, string>> = {
  en: moduleLabels,
  ar: {
    dashboard: "مركز القيادة",
    "entity-vault": "خزنة الكيانات",
    workforce: "بوابة القوى العاملة",
    "action-center": "مركز الإجراءات",
    "governance-trail": "سجل الحوكمة",
  },
};

const scenarioLabels: Record<Locale, Record<ScenarioKey, string>> = {
  en: {
    stable: "Stable",
    warning: "Warning",
    critical: "Critical",
  },
  ar: {
    stable: "مستقر",
    warning: "تحذير",
    critical: "حرج",
  },
};

const scenarioDescriptionsByLocale: Record<Locale, Record<ScenarioKey, string>> = {
  en: {
    stable:
      "Operationally stable. Everything is clickable, but most records are healthy and the journey focuses on visibility.",
    warning:
      "Balanced operational tension. Baladiyah, ZATCA, and workforce documents need coordinated action.",
    critical:
      "Escalation mode. Multiple items are overdue and the platform shows ownership, reminders, and recovery.",
  },
  ar: {
    stable:
      "الوضع التشغيلي مستقر. كل شيء تفاعلي، ومعظم السجلات سليمة، والتركيز هنا على الوضوح والمتابعة.",
    warning:
      "هناك توتر تشغيلي متوازن. مستندات البلدية والزكاة والضرائب والقوى العاملة تحتاج إلى إجراء منسق.",
    critical:
      "وضع تصعيد. توجد عناصر متعددة متأخرة، وتُظهر المنصة الملكية والتنبيهات ومسار المعالجة بوضوح.",
  },
};

const copy = {
  en: {
    exportSummary: "Export Operational Summary",
    darkMode: "Dark mode",
    lightMode: "Light mode",
    heroEyebrow: "Operational Continuity Journey",
    heroDescription:
      "Entity readiness, workforce legal files, actions, and audit outcomes move together in one connected operating system.",
    activeStoryScenario: "Active Story Scenario",
    activeSubsidiary: "Active Subsidiary",
    platformSurface: "Platform Surface",
    commandCenterDescription:
      "The command center starts the story, then routes the user into the right operating surface. Every card below is alive.",
    activeAlerts: "active alerts",
    openSurface: "Open surface",
    customerUseCases: "Customer-led Use Cases",
    currentStoryTrigger: "Current Story Trigger",
    triggerDescription:
      "For {subsidiary}, the platform is strongest when it shows how entity readiness and workforce legal files move together.",
    entityVaultDescription:
      "This is where CR, ZATCA, Baladiyah, GOSI, Salamah, and related operating records become a real workflow rather than a dead card.",
    documentDetailDescription:
      "The detail pane is the heart of the story. Actions here update the Action Center, Governance Trail, and linked workforce records.",
    authority: "Authority",
    documentNo: "Document No.",
    issueDate: "Issue Date",
    expiryDate: "Expiry Date",
    whatThisProves: "What This Story Proves",
    linkedWorkforceRecords: "Linked Workforce Records",
    assignOwner: "Assign Owner",
    queueReminder: "Queue Reminder",
    startRenewal: "Start Renewal",
    uploadRenewal: "Upload Renewal",
    workforcePortalDescription:
      "Workforce legal documents are showcased as an operational journey, connected back to Baladiyah, CR, ZATCA, and government-facing entity records.",
    workforceDetailDescription:
      "Actions here create a visible bridge between employee legal files and the entity records needed for real-world operations.",
    iqamaNo: "Iqama No.",
    iqamaExpiry: "Iqama Expiry",
    permitNo: "Permit No.",
    permitExpiry: "Permit Expiry",
    assignHrOwner: "Assign HR Owner",
    uploadNewCopy: "Upload New Copy",
    linkedEntityDependencies: "Linked Entity Dependencies",
    actionCenterDescription:
      "This turns reminders, assignments, and escalations into the visible operating layer of the platform.",
    notificationQueueDescription:
      "Each reminder or escalation feeds a visible queue, giving the platform momentum, accountability, and consequence.",
    governanceTrailDescription:
      "This closes the loop: every action taken in the platform leaves a visible record and becomes exportable for management.",
    auditReady: "audit-ready",
    narrativeOutcomes: "Narrative Outcomes",
    narrativeDescription:
      "These are the outcomes the client should immediately understand after reviewing the platform journey.",
    acknowledge: "Acknowledge",
    acknowledged: "Acknowledged",
    escalate: "Escalate",
    openRelatedRecord: "Open Related Record",
    markComplete: "Mark Complete",
    ownerLabel: "Owner {owner}",
    ownerLowerLabel: "owner {owner}",
    expiresLabel: "Expires {date}",
    iqamaDateLabel: "Iqama {date}",
    dueLabel: "Owner {owner} · due {date}",
    routedFrom: "Routed from {module}",
    municipalityRenewalJourney: "Municipality Renewal Journey",
    municipalityRenewalDescription:
      "Show how Baladiyah risk moves from dashboard insight to owner assignment, reminder, and completed renewal.",
    crReadiness: "CR / ZATCA Operating Readiness",
    crReadinessDescription:
      "Show how business continuity depends on current CR and tax records with accountable owners.",
    workforceJourney: "Workforce Legal File Journey",
    workforceJourneyDescription:
      "Show how expiring iqama and permit records connect back to the subsidiary's operating posture.",
    workspaceReset: "Workspace reset to {scenario} scenario.",
    exportFilename: "v-axis-operational-summary.txt",
    languageShort: "EN",
    languageOther: "AR",
  },
  ar: {
    exportSummary: "تصدير الملخص التشغيلي",
    darkMode: "الوضع الداكن",
    lightMode: "الوضع الفاتح",
    heroEyebrow: "رحلة استمرارية التشغيل",
    heroDescription:
      "جاهزية الكيان، وملفات القوى العاملة القانونية، والإجراءات، ومخرجات التدقيق تتحرك معًا داخل نظام تشغيلي واحد مترابط.",
    activeStoryScenario: "سيناريو القصة الحالي",
    activeSubsidiary: "الشركة التابعة الحالية",
    platformSurface: "واجهة المنصة",
    commandCenterDescription:
      "يبدأ مركز القيادة القصة ثم يوجّه المستخدم إلى الواجهة التشغيلية المناسبة. كل بطاقة أدناه تفاعلية.",
    activeAlerts: "تنبيهات نشطة",
    openSurface: "فتح الواجهة",
    customerUseCases: "حالات استخدام موجهة للعميل",
    currentStoryTrigger: "محرك القصة الحالي",
    triggerDescription:
      "بالنسبة إلى {subsidiary}، تكون المنصة في أفضل حالاتها عندما تُظهر كيف تتحرك جاهزية الكيان وملفات القوى العاملة القانونية معًا.",
    entityVaultDescription:
      "هنا تتحول السجلات التشغيلية مثل السجل التجاري والزكاة والبلدية والتأمينات وسلامة إلى سير عمل فعلي بدلًا من بطاقات جامدة.",
    documentDetailDescription:
      "لوحة التفاصيل هي قلب القصة. الإجراءات هنا تُحدّث مركز الإجراءات، وسجل الحوكمة، وسجلات القوى العاملة المرتبطة.",
    authority: "الجهة",
    documentNo: "رقم المستند",
    issueDate: "تاريخ الإصدار",
    expiryDate: "تاريخ الانتهاء",
    whatThisProves: "ما الذي تثبته هذه القصة",
    linkedWorkforceRecords: "سجلات القوى العاملة المرتبطة",
    assignOwner: "تعيين المسؤول",
    queueReminder: "إضافة تذكير",
    startRenewal: "بدء التجديد",
    uploadRenewal: "رفع التجديد",
    workforcePortalDescription:
      "تُعرض المستندات القانونية للقوى العاملة كرحلة تشغيلية متصلة بسجلات البلدية والسجل التجاري والزكاة والضرائب والجهات الحكومية.",
    workforceDetailDescription:
      "الإجراءات هنا تنشئ رابطًا واضحًا بين ملفات الموظف القانونية وسجلات الكيان المطلوبة للتشغيل الفعلي.",
    iqamaNo: "رقم الإقامة",
    iqamaExpiry: "انتهاء الإقامة",
    permitNo: "رقم تصريح العمل",
    permitExpiry: "انتهاء تصريح العمل",
    assignHrOwner: "تعيين مسؤول الموارد البشرية",
    uploadNewCopy: "رفع نسخة جديدة",
    linkedEntityDependencies: "الارتباطات الكيانية",
    actionCenterDescription:
      "يحوّل هذا القسم التذكيرات والتكليفات والتصعيدات إلى طبقة تشغيلية مرئية داخل المنصة.",
    notificationQueueDescription:
      "كل تذكير أو تصعيد يغذي قائمة مرئية تمنح المنصة زخمًا ومساءلةً ونتائج واضحة.",
    governanceTrailDescription:
      "هنا تُغلق الحلقة: كل إجراء داخل المنصة يترك سجلًا مرئيًا ويمكن تصديره للإدارة.",
    auditReady: "جاهز للتدقيق",
    narrativeOutcomes: "المخرجات الرئيسية",
    narrativeDescription:
      "هذه هي المخرجات التي يجب أن يفهمها العميل مباشرة بعد استعراض رحلة المنصة.",
    acknowledge: "إقرار",
    acknowledged: "تم الإقرار",
    escalate: "تصعيد",
    openRelatedRecord: "فتح السجل المرتبط",
    markComplete: "وضع كمكتمل",
    ownerLabel: "المسؤول {owner}",
    ownerLowerLabel: "المسؤول {owner}",
    expiresLabel: "ينتهي {date}",
    iqamaDateLabel: "الإقامة {date}",
    dueLabel: "المسؤول {owner} · الاستحقاق {date}",
    routedFrom: "قادمة من {module}",
    municipalityRenewalJourney: "رحلة تجديد البلدية",
    municipalityRenewalDescription:
      "اعرض كيف تنتقل مخاطرة البلدية من مؤشر لوحة التحكم إلى تعيين المسؤول والتذكير ثم إكمال التجديد.",
    crReadiness: "جاهزية السجل التجاري والزكاة",
    crReadinessDescription:
      "اعرض كيف تعتمد استمرارية العمل على حداثة السجل التجاري والسجلات الضريبية مع وجود مسؤول واضح.",
    workforceJourney: "رحلة الملف القانوني للقوى العاملة",
    workforceJourneyDescription:
      "اعرض كيف ترتبط الإقامات والتصاريح التي تقترب من الانتهاء بالوضع التشغيلي للشركة التابعة.",
    workspaceReset: "تمت إعادة ضبط مساحة العمل إلى سيناريو {scenario}.",
    exportFilename: "v-axis-operational-summary-ar.txt",
    languageShort: "AR",
    languageOther: "EN",
  },
} as const;

const localizedValues = {
  subsidiary: {
    "Zedan Group HQ": "المقر الرئيسي لمجموعة زيدان",
    "Zedan Retail": "زيدان للتجزئة",
    "Zedan Energy Services": "زيدان لخدمات الطاقة",
  },
  title: {
    "Commercial Registration (CR)": "السجل التجاري",
    "ZATCA Certificate": "شهادة الزكاة والضريبة والجمارك",
    "Baladiyah License": "رخصة البلدية",
    "Salamah Certificate": "شهادة سلامة",
    "GOSI Registration": "تسجيل التأمينات الاجتماعية",
    "Labor Office File": "ملف مكتب العمل",
    "Wasil Registration": "تسجيل واصل",
  },
  authority: {
    "Ministry of Commerce": "وزارة التجارة",
    ZATCA: "هيئة الزكاة والضريبة والجمارك",
    Municipality: "البلدية",
    "Civil Defense": "الدفاع المدني",
    GOSI: "التأمينات الاجتماعية",
    "Ministry of Human Resources": "وزارة الموارد البشرية",
    "Saudi Post": "البريد السعودي",
  },
  owner: {
    "Corporate Affairs": "الشؤون المؤسسية",
    "Finance Controller": "مسؤول الرقابة المالية",
    "Retail Operations": "عمليات التجزئة",
    "HSE Officer": "مسؤول الصحة والسلامة والبيئة",
    "HR Operations": "عمليات الموارد البشرية",
    "Government Relations": "العلاقات الحكومية",
    "Admin Services": "الخدمات الإدارية",
    "HR Retail": "موارد بشرية التجزئة",
    "HR Energy": "موارد بشرية الطاقة",
    "Government Relations Desk": "مكتب العلاقات الحكومية",
    "HR Renewal Desk": "مكتب تجديد الموارد البشرية",
  },
  journey: {
    "Entity Readiness": "جاهزية الكيان",
    "Tax Readiness": "الجاهزية الضريبية",
    "Municipality Renewal": "تجديد البلدية",
    "Site Readiness": "جاهزية الموقع",
    "Workforce Coverage": "تغطية القوى العاملة",
    "Government Access": "النفاذ الحكومي",
    "Address Continuity": "استمرارية العنوان",
  },
  name: {
    "Rashed Al-Qahtani": "راشد القحطاني",
    "Maha Al-Suwaidi": "مها السويدي",
    "Sultan Al-Harbi": "سلطان الحربي",
    "Fahad Al-Otaibi": "فهد العتيبي",
    "Noura Al-Dossary": "نورة الدوسري",
    "Ahmed Al-Rashid": "أحمد الراشد",
    "Khalid Al-Mutairi": "خالد المطيري",
  },
  role: {
    "Government Relations Lead": "قائد العلاقات الحكومية",
    "Administration Manager": "مدير الإدارة",
    "Finance Controller": "مسؤول الرقابة المالية",
    "Retail Operations Manager": "مدير عمليات التجزئة",
    "Store Administration Supervisor": "مشرف إدارة المتجر",
    "Operations Director": "مدير العمليات",
    "Field Supervisor": "مشرف ميداني",
  },
  department: {
    "Corporate Affairs": "الشؤون المؤسسية",
    "Admin Services": "الخدمات الإدارية",
    Finance: "المالية",
    Operations: "العمليات",
    "Store Operations": "عمليات المتجر",
    "Energy Operations": "عمليات الطاقة",
    "Field Operations": "العمليات الميدانية",
  },
} as const;

function formatDate(value: string, locale: Locale) {
  return new Date(value).toLocaleDateString(locale === "ar" ? "ar-SA" : "en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function replaceTemplate(
  template: string,
  values: Record<string, string>,
) {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replace(`{${key}}`, value),
    template,
  );
}

function localizeMappedValue(
  locale: Locale,
  category: keyof typeof localizedValues,
  value: string,
) {
  if (locale === "en") {
    return value;
  }

  return localizedValues[category][value as keyof (typeof localizedValues)[typeof category]] ?? value;
}

function localizeStatus(status: RecordStatus, locale: Locale) {
  const labels: Record<Locale, Record<RecordStatus, string>> = {
    en: {
      active: "active",
      "expiring-soon": "expiring soon",
      "renewal-in-progress": "renewal in progress",
      missing: "missing",
      overdue: "overdue",
    },
    ar: {
      active: "ساري",
      "expiring-soon": "ينتهي قريبًا",
      "renewal-in-progress": "التجديد قيد التنفيذ",
      missing: "مفقود",
      overdue: "متأخر",
    },
  };

  return labels[locale][status];
}

function localizePriority(priority: Priority, locale: Locale) {
  const labels: Record<Locale, Record<Priority, string>> = {
    en: {
      low: "low",
      medium: "medium",
      high: "high",
      critical: "critical",
    },
    ar: {
      low: "منخفض",
      medium: "متوسط",
      high: "مرتفع",
      critical: "حرج",
    },
  };

  return labels[locale][priority];
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
  status: DemoNotification["status"] = "new",
  latestUpdate = "Alert delivered by WhatsApp, email, SMS, and in-app bell.",
) {
  const notification: DemoNotification = {
    id: `note-${crypto.randomUUID()}`,
    title,
    message,
    severity,
    relatedType,
    relatedId,
    status,
    latestUpdate,
    channels: {
      whatsapp: "sent",
      email: "sent",
      sms: "sent",
      inApp: "sent",
    },
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

function getScenarioOptionClasses(
  scenario: ScenarioKey,
  isSelected: boolean,
  isDarkMode: boolean,
) {
  const selectedClasses: Record<ScenarioKey, string> = {
    stable: "border-emerald-600 bg-emerald-600 text-white",
    warning: "border-orange-500 bg-orange-500 text-slate-950",
    critical: "border-red-600 bg-red-600 text-white",
  };
  const darkClasses: Record<ScenarioKey, string> = {
    stable: "border-emerald-400/45 bg-emerald-400/12 text-emerald-100",
    warning: "border-orange-300/55 bg-orange-400/16 text-orange-100",
    critical: "border-red-300/55 bg-red-400/16 text-red-100",
  };
  const lightClasses: Record<ScenarioKey, string> = {
    stable: "border-emerald-200 bg-emerald-50 text-emerald-800",
    warning: "border-orange-200 bg-orange-50 text-orange-800",
    critical: "border-red-200 bg-red-50 text-red-800",
  };

  if (isSelected) {
    return selectedClasses[scenario];
  }

  return isDarkMode ? darkClasses[scenario] : lightClasses[scenario];
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

function getNotificationStatusTone(
  status: DemoNotification["status"],
  isDarkMode: boolean,
) {
  switch (status) {
    case "escalated":
      return isDarkMode ? "bg-rose-400/20 text-rose-100" : "bg-rose-100 text-rose-700";
    case "resolved":
      return isDarkMode ? "bg-emerald-400/20 text-emerald-100" : "bg-emerald-100 text-emerald-700";
    case "acknowledged":
      return isDarkMode ? "bg-sky-400/20 text-sky-100" : "bg-sky-100 text-sky-700";
    default:
      return isDarkMode ? "bg-amber-400/20 text-amber-100" : "bg-amber-100 text-amber-700";
  }
}

function DemoExperience() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [locale, setLocale] = useState<Locale>("en");
  const [scenario, setScenario] = useState<ScenarioKey>("warning");
  const [module, setModule] = useState<ModuleKey>("dashboard");
  const [selectedSubsidiary, setSelectedSubsidiary] = useState<string>(subsidiaries[1]);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string>("doc-baladiyah-retail");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("emp-retail-ops");
  const [flashMessage, setFlashMessage] = useState<string | null>(null);
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);
  const [demoState, setDemoState] = useState<DemoState>(() => createDemoState("warning"));
  const isArabic = locale === "ar";
  const t = copy[locale];
  const localizedModuleLabels = moduleLabelsByLocale[locale];
  const lSubsidiary = (value: string) => localizeMappedValue(locale, "subsidiary", value);
  const lTitle = (value: string) => localizeMappedValue(locale, "title", value);
  const lAuthority = (value: string) => localizeMappedValue(locale, "authority", value);
  const lOwner = (value: string) => localizeMappedValue(locale, "owner", value);
  const lJourney = (value: string) => localizeMappedValue(locale, "journey", value);
  const lName = (value: string) => localizeMappedValue(locale, "name", value);
  const lRole = (value: string) => localizeMappedValue(locale, "role", value);
  const lDepartment = (value: string) => localizeMappedValue(locale, "department", value);
  const localizeScenario = (value: ScenarioKey) => scenarioLabels[locale][value];

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDarkMode);
  }, [isDarkMode]);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
  }, [locale]);

  useEffect(() => {
    const nextState = createDemoState(scenario);
    setDemoState(nextState);
    setSelectedSubsidiary(scenario === "stable" ? subsidiaries[0] : subsidiaries[1]);
    setSelectedDocumentId("doc-baladiyah-retail");
    setSelectedEmployeeId("emp-retail-ops");
    setModule("dashboard");
    setFlashMessage(
      replaceTemplate(t.workspaceReset, {
        scenario: localizeScenario(scenario),
      }),
    );
  }, [locale, scenario]);

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
        label: locale === "ar" ? "أصول الكيان" : "Entity Assets",
        value: String(subsidiaryDocuments.length).padStart(2, "0"),
        onClick: () => setModule("entity-vault"),
      },
      {
        label: locale === "ar" ? "ملفات القوى العاملة" : "Workforce Files",
        value: String(subsidiaryWorkforce.length).padStart(2, "0"),
        onClick: () => setModule("workforce"),
      },
      {
        label: locale === "ar" ? "يستحق قريبًا / متأخر" : "Due Soon / Overdue",
        value: String(
          countStatus(subsidiaryDocuments, "expiring-soon") +
            countStatus(subsidiaryDocuments, "overdue") +
            countStatus(subsidiaryWorkforce, "expiring-soon") +
            countStatus(subsidiaryWorkforce, "overdue"),
        ).padStart(2, "0"),
        onClick: () => setModule("action-center"),
      },
      {
        label: locale === "ar" ? "أحداث الرحلة" : "Journey Events",
        value: String(demoState.activities.length).padStart(2, "0"),
        onClick: () => setModule("governance-trail"),
      },
    ],
    [demoState.activities.length, locale, subsidiaryDocuments, subsidiaryWorkforce],
  );

  const reminderPlaybooks = [
    {
      id: "playbook-baladiyah",
      title: t.municipalityRenewalJourney,
      description: t.municipalityRenewalDescription,
      action: () => {
        setSelectedSubsidiary("Zedan Retail");
        setSelectedDocumentId("doc-baladiyah-retail");
        setModule("entity-vault");
      },
    },
    {
      id: "playbook-cr-zatca",
      title: t.crReadiness,
      description: t.crReadinessDescription,
      action: () => {
        setSelectedSubsidiary("Zedan Group HQ");
        setSelectedDocumentId("doc-zatca-hq");
        setModule("entity-vault");
      },
    },
    {
      id: "playbook-workforce",
      title: t.workforceJourney,
      description: t.workforceJourneyDescription,
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
    announce(
      locale === "ar"
        ? "تم تحديث المسؤول وأصبح ظاهرًا عبر الرحلة بالكامل."
        : "Owner updated and visible across the journey.",
    );
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
    announce(
      locale === "ar"
        ? "تمت إعادة توجيه سجل القوى العاملة إلى مكتب تجديد الموارد البشرية."
        : "Workforce record reassigned to HR Renewal Desk.",
    );
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
    announce(
      locale === "ar"
        ? "تم إنشاء التذكير وتوجيهه إلى مركز الإجراءات."
        : "Reminder created and routed into the Action Center.",
    );
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
    announce(
      locale === "ar"
        ? "تم بدء رحلة التجديد للسجل الكياني المحدد."
        : "Renewal journey started for the selected entity record.",
    );
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

    pushStatusNotification(
      "Document resolved",
      `${selectedDocument?.title ?? "Document"} has been renewed and all stakeholders received the latest resolved status.`,
      "medium",
      "resolved",
      "document",
      documentId,
      "Resolved status sent by WhatsApp, email, SMS, and in-app bell.",
    );

    announce(
      locale === "ar"
        ? "تم رفع المستند المجدد وإغلاق المهمة وتحديث سجل التدقيق."
        : "Renewed document uploaded, task closed, and audit trail updated.",
    );
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

    pushStatusNotification(
      "Workforce file resolved",
      `${selectedEmployee?.employeeName ?? "Employee"} is compliant again and all channels were updated with the resolved status.`,
      "medium",
      "resolved",
      "employee",
      employeeId,
      "Resolved status sent by WhatsApp, email, SMS, and in-app bell.",
    );

    announce(
      locale === "ar"
        ? "تم تجديد الملف القانوني للقوى العاملة وانعكس ذلك عبر المنصة."
        : "Workforce legal file renewed and reflected across the platform.",
    );
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
        "escalated",
        "Escalation sent by WhatsApp, email, SMS, and in-app bell.",
      );

      return appendActivity(
        withNotification,
        "Action escalated",
        `${task.title} is now in critical response mode.`,
        "action-center",
      );
    });

    announce(
      locale === "ar"
        ? "تم تصعيد المهمة وإعادتها إلى أعلى قائمة المتابعة."
        : "Task escalated and pushed back to the top of the queue.",
    );
  }

  function acknowledgeNotification(notificationId: string) {
    setDemoState((current) => ({
      ...current,
      notifications: current.notifications.map((notification) =>
        notification.id === notificationId
          ? {
              ...notification,
              status: "acknowledged",
              latestUpdate:
                "Alert acknowledged. WhatsApp, email, SMS, and in-app feeds now reflect the latest status.",
            }
          : notification,
      ),
    }));
    announce(locale === "ar" ? "تم الإقرار بالتنبيه." : "Notification acknowledged.");
  }

  function pushStatusNotification(
    title: string,
    message: string,
    severity: Priority,
    status: DemoNotification["status"],
    relatedType: DemoNotification["relatedType"],
    relatedId: string,
    latestUpdate: string,
  ) {
    setDemoState((current) =>
      addNotification(
        current,
        title,
        message,
        severity,
        relatedType,
        relatedId,
        status,
        latestUpdate,
      ),
    );
  }

  function exportDemoReport() {
    const docs = demoState.documents.filter((document) => document.subsidiary === selectedSubsidiary);
    const staff = demoState.workforce.filter((person) => person.subsidiary === selectedSubsidiary);
    const tasks = demoState.tasks.filter((task) => {
      const document = docs.find((doc) => doc.id === task.relatedId);
      const employee = staff.find((person) => person.id === task.relatedId);
      return Boolean(document || employee);
    });

    const content = [
      locale === "ar" ? "الملخص التشغيلي لمنصة V-AXIS" : "V-AXIS Operational Summary",
      locale === "ar" ? `السيناريو: ${localizeScenario(scenario)}` : `Scenario: ${scenario}`,
      locale === "ar"
        ? `الشركة التابعة: ${lSubsidiary(selectedSubsidiary)}`
        : `Subsidiary: ${selectedSubsidiary}`,
      "",
      locale === "ar" ? "مستندات الكيان:" : "Entity documents:",
      ...docs.map((doc) =>
        locale === "ar"
          ? `- ${lTitle(doc.title)} | ${localizeStatus(doc.status, locale)} | ${replaceTemplate(t.ownerLowerLabel, {
              owner: lOwner(doc.owner),
            })} | ${t.expiryDate} ${doc.expiryDate}`
          : `- ${doc.title} | ${doc.status} | owner ${doc.owner} | expiry ${doc.expiryDate}`,
      ),
      "",
      locale === "ar" ? "سجلات القوى العاملة:" : "Workforce records:",
      ...staff.map((person) =>
        locale === "ar"
          ? `- ${lName(person.employeeName)} | ${localizeStatus(person.status, locale)} | ${t.iqamaExpiry} ${person.iqamaExpiry} | ${t.permitExpiry} ${person.workPermitExpiry}`
          : `- ${person.employeeName} | ${person.status} | iqama ${person.iqamaExpiry} | permit ${person.workPermitExpiry}`,
      ),
      "",
      locale === "ar" ? "المهام المفتوحة:" : "Open tasks:",
      ...tasks.map((task) =>
        locale === "ar"
          ? `- ${localizeTaskTitle(task.title)} | ${localizeStatus(task.status === "done" ? "active" : task.status === "open" ? "missing" : "renewal-in-progress", locale)} | ${replaceTemplate(t.ownerLowerLabel, {
              owner: lOwner(task.owner),
            })} | ${locale === "ar" ? "الاستحقاق" : "due"} ${task.dueDate}`
          : `- ${task.title} | ${task.status} | owner ${task.owner} | due ${task.dueDate}`,
      ),
    ].join("\n");
    triggerDownload(t.exportFilename, content);
    setDemoState((current) =>
      appendActivity(
        current,
        "Management summary exported",
        `A seeded report for ${selectedSubsidiary} was generated from the current journey state.`,
        "governance-trail",
      ),
    );
    announce(
      locale === "ar"
        ? "تم تصدير الملخص التنفيذي الجاهز."
        : "Seeded executive summary exported.",
    );
  }

  const openTasks = demoState.tasks.filter((task) => task.status !== "done");
  const unresolvedNotifications = demoState.notifications.filter(
    (notification) => notification.status === "new" || notification.status === "escalated",
  );
  const notificationBadgeCount = unresolvedNotifications.length;
  const localizeTaskTitle = (value: string) => {
    if (locale === "en") {
      return value;
    }
    if (value === "Renew Baladiyah License for Zedan Retail") {
      return "تجديد رخصة البلدية لزيدان للتجزئة";
    }
    if (value === "Prepare workforce renewal pack for Retail Operations Manager") {
      return "إعداد ملف تجديد القوى العاملة لمدير عمليات التجزئة";
    }
    if (value === "Review ZATCA renewal documents for Group HQ") {
      return "مراجعة مستندات تجديد الزكاة والضريبة والجمارك للمقر الرئيسي";
    }
    if (value.startsWith("Complete renewal for ")) {
      return `إكمال تجديد ${lTitle(value.replace("Complete renewal for ", ""))}`;
    }
    if (value.startsWith("Send reminder for ")) {
      return `إرسال تذكير بخصوص ${lTitle(value.replace("Send reminder for ", ""))}`;
    }
    if (value.startsWith("Prepare legal file for ")) {
      return `إعداد الملف القانوني للموظف ${lName(value.replace("Prepare legal file for ", ""))}`;
    }
    return value;
  };
  const localizeNotificationTitle = (value: string) => {
    if (locale === "en") {
      return value;
    }
    const map: Record<string, string> = {
      "Baladiyah license nearing expiry": "رخصة البلدية تقترب من الانتهاء",
      "Workforce legal documents require attention": "مستندات القوى العاملة القانونية تحتاج إلى متابعة",
      "Reminder scheduled": "تمت جدولة التذكير",
      "Task escalated": "تم تصعيد المهمة",
    };
    return map[value] ?? value;
  };
  const localizeNotificationMessage = (value: string) => {
    if (locale === "en") {
      return value;
    }
    if (value === "Retail municipality renewal should be initiated to avoid operating disruption.") {
      return "يجب بدء تجديد البلدية الخاصة بالتجزئة لتجنب أي تعطل تشغيلي.";
    }
    if (value === "Retail Operations Manager has linked iqama / permit documents entering renewal window.") {
      return "مدير عمليات التجزئة لديه مستندات إقامة وتصريح مرتبطة دخلت نافذة التجديد.";
    }
    if (value.endsWith(" has been placed in the action queue.")) {
      return `${localizeTaskTitle(value.replace(" has been placed in the action queue.", ""))} تمت إضافته إلى قائمة الإجراءات.`;
    }
    if (value.endsWith(" was escalated for immediate management attention.")) {
      return `${localizeTaskTitle(value.replace(" was escalated for immediate management attention.", ""))} تم تصعيده لاهتمام الإدارة الفوري.`;
    }
    return value;
  };
  const localizeNotificationLatestUpdate = (value: string) => {
    if (locale === "en") {
      return value;
    }
    const map: Record<string, string> = {
      "Alert delivered by WhatsApp, email, SMS, and in-app bell.":
        "تم تسليم التنبيه عبر واتساب والبريد الإلكتروني والرسائل النصية وجرس المنصة.",
      "Stakeholders were alerted across all delivery channels.":
        "تم تنبيه أصحاب العلاقة عبر جميع قنوات التسليم.",
    };

    return map[value] ?? value;
  };
  const localizeActivityTitle = (value: string) => {
    if (locale === "en") {
      return value;
    }
    const map: Record<string, string> = {
      "Scenario initialized": "تم تهيئة السيناريو",
      "Baladiyah renewal task prepared": "تم إعداد مهمة تجديد البلدية",
      "Executive report draft available": "مسودة التقرير التنفيذي متاحة",
      "Document owner reassigned": "تمت إعادة تعيين مسؤول المستند",
      "Workforce owner reassigned": "تمت إعادة تعيين مسؤول ملف الموظف",
      "Reminder queued": "تم إدراج التذكير",
      "Renewed document uploaded": "تم رفع المستند المجدد",
      "Workforce file renewed": "تم تجديد ملف القوى العاملة",
      "Action escalated": "تم تصعيد الإجراء",
      "Management summary exported": "تم تصدير الملخص الإداري",
    };
    return map[value] ?? value;
  };
  const localizeActivityDetail = (value: string) => {
    if (locale === "en") {
      return value;
    }
    if (value.startsWith("Workspace loaded in ")) {
      const scenarioKey = value.includes("STABLE")
        ? "stable"
        : value.includes("CRITICAL")
          ? "critical"
          : "warning";
      return `تم تحميل مساحة العمل في وضع ${localizeScenario(scenarioKey)}.`;
    }
    if (value === "A coordinated entity and workforce recovery path is ready to showcase.") {
      return "تم تجهيز مسار منسق لتعافي الكيان والقوى العاملة لعرضه بوضوح.";
    }
    if (value === "A seeded management summary can be exported at any point in the journey.") {
      return "يمكن تصدير ملخص إداري جاهز في أي نقطة من الرحلة.";
    }
    if (value.endsWith(" is now owned by Government Relations Desk.")) {
      return `${lTitle(value.replace(" is now owned by Government Relations Desk.", ""))} أصبح الآن تحت مسؤولية مكتب العلاقات الحكومية.`;
    }
    if (value.endsWith(" is now routed to HR Renewal Desk.")) {
      return `${lName(value.replace(" is now routed to HR Renewal Desk.", ""))} تم توجيهه الآن إلى مكتب تجديد الموارد البشرية.`;
    }
    if (value.endsWith(" is now tracked in the Action Center.")) {
      return `${localizeTaskTitle(value.replace(" is now tracked in the Action Center.", ""))} أصبح الآن متابعًا داخل مركز الإجراءات.`;
    }
    if (value.endsWith(" was renewed and the operating story turned green.")) {
      return `${lTitle(value.replace(" was renewed and the operating story turned green.", ""))} تم تجديده وتحولت الحالة التشغيلية إلى وضع سليم.`;
    }
    if (value.endsWith(" now shows healthy legal documents.")) {
      return `${lName(value.replace(" now shows healthy legal documents.", ""))} يظهر الآن مستندات قانونية سليمة.`;
    }
    if (value.endsWith(" is now in critical response mode.")) {
      return `${localizeTaskTitle(value.replace(" is now in critical response mode.", ""))} أصبح الآن في وضع استجابة حرجة.`;
    }
    if (value.startsWith("A seeded report for ")) {
      return `تم إنشاء تقرير مُجهّز مسبقًا لـ ${lSubsidiary(value.replace("A seeded report for ", "").replace(" was generated from the current journey state.", ""))} من حالة الرحلة الحالية.`;
    }
    return value;
  };
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
    <div className="min-h-screen bg-background text-foreground" dir={isArabic ? "rtl" : "ltr"}>
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
                {t.heroEyebrow}
              </p>
              <p className="mt-4 max-w-2xl text-sm text-muted-foreground">
                {t.heroDescription}
              </p>
            </div>

            <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center md:justify-end">
              <button
                type="button"
                onClick={() => setIsNotificationCenterOpen((value) => !value)}
                className={`relative inline-flex items-center justify-center rounded-[1.5rem] border p-3 shadow-[var(--shadow-elevated)] transition-transform hover:scale-[1.04] ${utilityButtonClass}`}
                aria-label={isArabic ? "مركز التنبيهات" : "Notification center"}
              >
                {notificationBadgeCount > 0 ? (
                  <BellRing className="h-5 w-5 text-primary" />
                ) : (
                  <Bell className="h-5 w-5 text-primary" />
                )}
                {notificationBadgeCount > 0 ? (
                  <span className="absolute -right-1 -top-1 inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-rose-600 px-1.5 text-xs font-semibold text-white">
                    {notificationBadgeCount}
                  </span>
                ) : null}
              </button>
              <button
                type="button"
                onClick={() => setLocale((current) => (current === "en" ? "ar" : "en"))}
                className={`inline-flex items-center justify-center gap-2 rounded-[1.5rem] border px-5 py-3 text-sm font-medium shadow-[var(--shadow-elevated)] transition-transform hover:scale-[1.02] ${utilityButtonClass}`}
              >
                {t.languageShort}
                <span className="text-muted-foreground">/</span>
                {t.languageOther}
              </button>
              <button
                type="button"
                onClick={exportDemoReport}
                className={`inline-flex items-center justify-center gap-2 rounded-[1.5rem] border px-5 py-3 text-sm font-medium shadow-[var(--shadow-elevated)] transition-transform hover:scale-[1.02] ${utilityButtonClass}`}
              >
                <Download className="h-4 w-4 text-primary" />
                {t.exportSummary}
              </button>

              <button
                type="button"
                onClick={() => setIsDarkMode((value) => !value)}
                className={`inline-flex items-center justify-center rounded-[1.5rem] border p-3 shadow-[var(--shadow-elevated)] transition-transform hover:scale-[1.04] ${utilityButtonClass}`}
                aria-label={isDarkMode ? t.lightMode : t.darkMode}
              >
                {isDarkMode ? (
                  <Sun className="h-5 w-5 text-primary" />
                ) : (
                  <Moon className="h-5 w-5 text-primary" />
                )}
              </button>
            </div>
          </div>

          {isNotificationCenterOpen ? (
            <div className={`mt-5 rounded-[1.75rem] border p-5 shadow-[var(--shadow-elevated)] ${solidCardClass}`}>
              <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    {isArabic ? "مركز التنبيهات متعدد القنوات" : "Multi-channel Notification Center"}
                  </p>
                  <h3 className="mt-1 text-lg font-semibold">
                    {isArabic ? "واتساب، بريد إلكتروني، رسالة نصية، وجرس المنصة" : "WhatsApp, Email, SMS, and In-App Bell"}
                  </h3>
                </div>
                <div className="rounded-full bg-primary/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                  {notificationBadgeCount} {isArabic ? "بحاجة إلى متابعة" : "need attention"}
                </div>
              </div>

              <div className="space-y-3">
                {demoState.notifications.slice(0, 6).map((notification) => (
                  <div
                    key={notification.id}
                    className={`rounded-[1.25rem] border p-4 ${isDarkMode ? "border-slate-700 bg-slate-950/65" : "border-slate-200 bg-slate-50"}`}
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold">
                            {localizeNotificationTitle(notification.title)}
                          </p>
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${getNotificationStatusTone(
                              notification.status,
                              isDarkMode,
                            )}`}
                          >
                            {notification.status === "resolved"
                              ? isArabic ? "تم الحل" : "resolved"
                              : notification.status === "escalated"
                                ? isArabic ? "تم التصعيد" : "escalated"
                                : notification.status === "acknowledged"
                                  ? isArabic ? "تم الإقرار" : "acknowledged"
                                  : isArabic ? "جديد" : "new"}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {localizeNotificationMessage(notification.message)}
                        </p>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {isArabic ? "آخر تحديث:" : "Latest status:"}{" "}
                          {localizeNotificationLatestUpdate(notification.latestUpdate)}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2 text-xs font-medium">
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-3 py-1 text-emerald-500">
                          <MessageCircleMore className="h-3.5 w-3.5" />
                          WhatsApp
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/10 px-3 py-1 text-sky-500">
                          <Mail className="h-3.5 w-3.5" />
                          Email
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-3 py-1 text-amber-500">
                          <Smartphone className="h-3.5 w-3.5" />
                          SMS
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-primary">
                          <Bell className="h-3.5 w-3.5" />
                          {isArabic ? "جرس المنصة" : "In-app"}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
            <div
              className={`rounded-[1.75rem] border p-4 shadow-[var(--shadow-recessed)] ${recessedPanelClass}`}
            >
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  {t.activeStoryScenario}
                </p>
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  {localizeScenario(scenario)}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {(["stable", "warning", "critical"] as ScenarioKey[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setScenario(key)}
                    className={`rounded-2xl border px-4 py-2 text-sm font-medium transition-transform hover:scale-[1.02] ${
                      getScenarioOptionClasses(key, scenario === key, isDarkMode)
                    }`}
                  >
                    {scenarioLabels[locale][key]}
                  </button>
                ))}
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                {scenarioDescriptionsByLocale[locale][scenario]}
              </p>
            </div>

            <div
              className={`rounded-[1.75rem] border p-4 shadow-[var(--shadow-recessed)] ${recessedPanelClass}`}
            >
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  {t.activeSubsidiary}
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
                    {lSubsidiary(name)}
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
                  {t.platformSurface}
                </div>
                <div className="mt-1 text-sm font-semibold">{localizedModuleLabels[key]}</div>
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
              title={localizedModuleLabels.dashboard}
              description={t.commandCenterDescription}
              isDarkMode={isDarkMode}
              action={
                <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                  <Bell className="h-4 w-4" />
                  {unresolvedNotifications.length} {t.activeAlerts}
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
                      {t.openSurface}
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
                    <h3 className="text-lg font-semibold">{t.customerUseCases}</h3>
                  </div>
                  <div className="space-y-4">
                    {reminderPlaybooks.map((playbook) => (
                      <button
                        key={playbook.id}
                        type="button"
                        onClick={playbook.action}
                        className={`w-full rounded-[1.5rem] border p-4 transition-transform hover:scale-[1.01] ${
                          isArabic ? "text-right" : "text-left"
                        } ${solidCardClass}`}
                        dir={isArabic ? "rtl" : "ltr"}
                      >
                        <div
                          className={`flex items-start justify-between gap-4 ${
                            isArabic ? "flex-row-reverse" : ""
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold">{playbook.title}</p>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {playbook.description}
                            </p>
                          </div>
                          <ArrowRight
                            className={`mt-1 h-4 w-4 shrink-0 text-primary ${
                              isArabic ? "rotate-180" : ""
                            }`}
                          />
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
                    <h3 className="text-lg font-semibold">{t.currentStoryTrigger}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {replaceTemplate(t.triggerDescription, {
                      subsidiary: lSubsidiary(selectedSubsidiary),
                    })}
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
                              <p className="font-medium">{lTitle(document.title)}</p>
                              <p className="text-sm text-muted-foreground">
                                {lAuthority(document.authority)} · {replaceTemplate(t.expiresLabel, {
                                  date: formatDate(document.expiryDate, locale),
                                })}
                              </p>
                            </div>
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${getStatusTone(
                                document.status,
                                isDarkMode,
                              )}`}
                            >
                              {localizeStatus(document.status, locale)}
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
                title={localizedModuleLabels["entity-vault"]}
                description={t.entityVaultDescription}
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
                            <p className="font-semibold">{lTitle(document.title)}</p>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {lAuthority(document.authority)} · {document.number}
                            </p>
                            <p className="mt-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                              {replaceTemplate(t.ownerLabel, { owner: lOwner(document.owner) })}
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
                              {localizeStatus(document.status, locale)}
                          </span>
                          <p className="mt-3 text-sm text-muted-foreground">
                            {replaceTemplate(t.expiresLabel, {
                              date: formatDate(document.expiryDate, locale),
                            })}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </Surface>

              <Surface
                title={selectedDocument ? lTitle(selectedDocument.title) : (isArabic ? "تفاصيل المستند" : "Document Detail")}
                description={t.documentDetailDescription}
                isDarkMode={isDarkMode}
                action={
                  <span
                    className={`rounded-full px-4 py-2 text-xs font-semibold uppercase ${getStatusTone(
                      selectedDocument?.status ?? "active",
                      isDarkMode,
                    )}`}
                  >
                    {selectedDocument ? localizeStatus(selectedDocument.status, locale) : localizeStatus("active", locale)}
                  </span>
                }
              >
                {selectedDocument ? (
                  <div className="space-y-5">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <InfoCard label={t.authority} isDarkMode={isDarkMode}>{lAuthority(selectedDocument.authority)}</InfoCard>
                      <InfoCard label={t.documentNo} isDarkMode={isDarkMode}>{selectedDocument.number}</InfoCard>
                      <InfoCard label={t.issueDate} isDarkMode={isDarkMode}>{formatDate(selectedDocument.issueDate, locale)}</InfoCard>
                      <InfoCard label={t.expiryDate} isDarkMode={isDarkMode}>{formatDate(selectedDocument.expiryDate, locale)}</InfoCard>
                    </div>

                    <div className={`rounded-[1.5rem] border p-4 ${solidCardClass}`}>
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                        {t.whatThisProves}
                      </p>
                      <p className={`mt-2 text-sm ${isDarkMode ? "text-slate-100" : "text-slate-700"}`}>
                        {locale === "ar"
                          ? `${lJourney(selectedDocument.journeyLabel)} ليست معزولة. هذا السجل يرتبط بأشخاص وإجراءات محددة لازمة لاستمرار تشغيل الشركة التابعة.`
                          : `${selectedDocument.journeyLabel} is not isolated. This record links to specific people and actions needed to keep the subsidiary operational.`}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <PanelButton
                        label={t.assignOwner}
                        isDarkMode={isDarkMode}
                        onClick={() => assignDocumentOwner(selectedDocument.id)}
                      />
                      <PanelButton
                        label={t.queueReminder}
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
                        label={t.startRenewal}
                        tone="secondary"
                        isDarkMode={isDarkMode}
                        onClick={() => startDocumentRenewal(selectedDocument.id)}
                      />
                      <PanelButton
                        label={t.uploadRenewal}
                        tone="ghost"
                        isDarkMode={isDarkMode}
                        onClick={() => uploadRenewedDocument(selectedDocument.id)}
                      />
                    </div>

                    <div className={`rounded-[1.5rem] border p-4 ${solidCardClass}`}>
                      <div className="mb-3 flex items-center gap-2">
                        <Users className="h-4 w-4 text-primary" />
                        <p className="font-medium">{t.linkedWorkforceRecords}</p>
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
                                <p className="font-medium">{lName(employee.employeeName)}</p>
                                <p className="text-sm text-muted-foreground">
                                  {lRole(employee.role)} · {lDepartment(employee.department)}
                                </p>
                              </div>
                              <span
                                className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${getStatusTone(
                                  employee.status,
                                  isDarkMode,
                                )}`}
                              >
                                {localizeStatus(employee.status, locale)}
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
                title={localizedModuleLabels.workforce}
                description={t.workforcePortalDescription}
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
                            <p className="font-semibold">{lName(employee.employeeName)}</p>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {lRole(employee.role)} · {lDepartment(employee.department)}
                            </p>
                            <p className="mt-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                              {replaceTemplate(t.ownerLabel, { owner: lOwner(employee.owner) })}
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
                            {localizeStatus(employee.status, locale)}
                          </span>
                          <p className="mt-3 text-sm text-muted-foreground">
                            {replaceTemplate(t.iqamaDateLabel, {
                              date: formatDate(employee.iqamaExpiry, locale),
                            })}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </Surface>

              <Surface
                title={selectedEmployee ? lName(selectedEmployee.employeeName) : (isArabic ? "تفاصيل الموظف" : "Workforce Detail")}
                description={t.workforceDetailDescription}
                isDarkMode={isDarkMode}
                action={
                  <span
                    className={`rounded-full px-4 py-2 text-xs font-semibold uppercase ${getStatusTone(
                      selectedEmployee?.status ?? "active",
                      isDarkMode,
                    )}`}
                  >
                    {selectedEmployee ? localizeStatus(selectedEmployee.status, locale) : localizeStatus("active", locale)}
                  </span>
                }
              >
                {selectedEmployee ? (
                  <div className="space-y-5">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <InfoCard label={t.iqamaNo} isDarkMode={isDarkMode}>{selectedEmployee.iqamaNumber}</InfoCard>
                      <InfoCard label={t.iqamaExpiry} isDarkMode={isDarkMode}>
                        {formatDate(selectedEmployee.iqamaExpiry, locale)}
                      </InfoCard>
                      <InfoCard label={t.permitNo} isDarkMode={isDarkMode}>{selectedEmployee.workPermitNumber}</InfoCard>
                      <InfoCard label={t.permitExpiry} isDarkMode={isDarkMode}>
                        {formatDate(selectedEmployee.workPermitExpiry, locale)}
                      </InfoCard>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <PanelButton
                        label={t.assignHrOwner}
                        isDarkMode={isDarkMode}
                        onClick={() => assignEmployeeOwner(selectedEmployee.id)}
                      />
                      <PanelButton
                        label={t.queueReminder}
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
                        label={t.uploadNewCopy}
                        tone="ghost"
                        isDarkMode={isDarkMode}
                        onClick={() => renewEmployeeRecord(selectedEmployee.id)}
                      />
                    </div>

                    <div className={`rounded-[1.5rem] border p-4 ${solidCardClass}`}>
                      <div className="mb-3 flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-primary" />
                        <p className="font-medium">{t.linkedEntityDependencies}</p>
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
                                <p className="font-medium">{lTitle(document.title)}</p>
                                <p className="text-sm text-muted-foreground">
                                  {lAuthority(document.authority)} · {replaceTemplate(t.ownerLowerLabel, {
                                    owner: lOwner(document.owner),
                                  })}
                                </p>
                              </div>
                              <span
                                className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${getStatusTone(
                                  document.status,
                                  isDarkMode,
                                )}`}
                              >
                                {localizeStatus(document.status, locale)}
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
                title={localizedModuleLabels["action-center"]}
                description={t.actionCenterDescription}
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
                          <p className="font-semibold">{localizeTaskTitle(task.title)}</p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {replaceTemplate(t.dueLabel, {
                              owner: lOwner(task.owner),
                              date: formatDate(task.dueDate, locale),
                            })}
                          </p>
                          <p className="mt-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                            {replaceTemplate(t.routedFrom, {
                              module: localizedModuleLabels[task.module],
                            })}
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${getPriorityClasses(
                            task.priority,
                            isDarkMode,
                          )}`}
                        >
                          {localizePriority(task.priority, locale)}
                        </span>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <PanelButton
                          label={t.escalate}
                          isDarkMode={isDarkMode}
                          onClick={() => escalateTask(task.id)}
                        />
                        <PanelButton
                          label={t.openRelatedRecord}
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
                          label={t.markComplete}
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
                title={isArabic ? "قائمة التنبيهات" : "Notification Queue"}
                description={t.notificationQueueDescription}
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
                          <p className="font-medium">{localizeNotificationTitle(notification.title)}</p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {localizeNotificationMessage(notification.message)}
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${getPriorityClasses(
                            notification.severity,
                            isDarkMode,
                          )}`}
                        >
                          {localizePriority(notification.severity, locale)}
                        </span>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <PanelButton
                          label={
                            notification.status === "acknowledged"
                              ? t.acknowledged
                              : t.acknowledge
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
                title={localizedModuleLabels["governance-trail"]}
                description={t.governanceTrailDescription}
                isDarkMode={isDarkMode}
                action={
                  <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                    <ShieldCheck className="h-4 w-4" />
                    {t.auditReady}
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
                          <p className="font-semibold">{localizeActivityTitle(activity.title)}</p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {localizeActivityDetail(activity.detail)}
                          </p>
                          <p className="mt-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                            {localizedModuleLabels[activity.module]}
                          </p>
                        </div>
                        <div className="text-right text-xs text-muted-foreground">
                          {formatDate(activity.timestamp, locale)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Surface>

              <Surface
                title={t.narrativeOutcomes}
                description={t.narrativeDescription}
                isDarkMode={isDarkMode}
              >
                <div className="space-y-4">
                  {(locale === "ar"
                    ? [
                        "جاهزية الكيان ليست معزولة. البلدية والسجل التجاري والزكاة والتأمينات وملف مكتب العمل تظهر داخل صورة تشغيلية واحدة.",
                        "السجلات القانونية للقوى العاملة مرتبطة بقصة الشركة التابعة وليست ملف موارد بشرية منفصلًا.",
                        "كل إجراء يخلق نتيجة مرئية: مهام وتنبيهات وأحداث حوكمة.",
                        "يمكن أن تبقى المنصة مزودة بسياق تشغيلي واقعي مع الحفاظ على شعور كامل بالترابط والجاهزية.",
                      ]
                    : [
                        "Entity readiness is not isolated. Baladiyah, CR, ZATCA, GOSI, and Labor Office File sit in one shared operating picture.",
                        "Workforce legal records are linked to the subsidiary story, not treated as a separate HR spreadsheet.",
                        "Every action creates visible consequences: tasks, notifications, and audit events.",
                        "The platform can stay seeded with live-looking operational context while still feeling fully connected and production-ready.",
                      ]).map((line) => (
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

export default DemoExperience;
