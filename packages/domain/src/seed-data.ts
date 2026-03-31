import type {
  DocumentSector,
  PermissionFlag,
  UserRole,
} from "./types";

export type SeededDocumentType = {
  code: number;
  label: string;
  arabicLabel?: string;
  sector: DocumentSector;
  requiresExpiry: boolean;
  requiresCr: boolean;
  notes: string;
};

export const seededDocumentTypes: SeededDocumentType[] = [
  {
    code: 1,
    label: "Commercial Registration (CR)",
    arabicLabel: "السجل التجاري",
    sector: "GOV",
    requiresExpiry: true,
    requiresCr: false,
    notes:
      "Primary business registration document and foundation for related compliance licenses.",
  },
  {
    code: 2,
    label: "Zakat / VAT Registration",
    arabicLabel: "شهادة الزكاة والضريبة",
    sector: "GOV",
    requiresExpiry: true,
    requiresCr: true,
    notes: "ZATCA-issued registration covering Zakat and VAT compliance.",
  },
  {
    code: 3,
    label: "Baladiyah (Municipal) License",
    arabicLabel: "الرخصة البلدية",
    sector: "GOV",
    requiresExpiry: true,
    requiresCr: true,
    notes:
      "Municipal operating license required for physical business locations.",
  },
  {
    code: 4,
    label: "SAGIA / MISA Investment License",
    arabicLabel: "رخصة هيئة الاستثمار",
    sector: "GOV",
    requiresExpiry: true,
    requiresCr: true,
    notes:
      "Required for foreign investment entities operating in Saudi Arabia.",
  },
  {
    code: 5,
    label: "Agency Number",
    arabicLabel: "رقم الوكالة",
    sector: "GOV",
    requiresExpiry: true,
    requiresCr: true,
    notes: "Commercial agency registration number.",
  },
  {
    code: 6,
    label: "Engineering License",
    arabicLabel: "الرخصة الهندسية",
    sector: "GOV",
    requiresExpiry: true,
    requiresCr: true,
    notes: "Required for engineering and technical services entities.",
  },
  {
    code: 7,
    label: "Office Space Contract",
    sector: "B2B",
    requiresExpiry: true,
    requiresCr: false,
    notes:
      "Lease agreement for company premises and a dependency for other compliance artifacts.",
  },
  {
    code: 8,
    label: "Salamah (Safety) Certificate",
    arabicLabel: "شهادة السلامة",
    sector: "GOV",
    requiresExpiry: true,
    requiresCr: true,
    notes:
      "Civil defense and premises safety compliance certificate.",
  },
  {
    code: 9,
    label: "GOSI Registration",
    arabicLabel: "التأمينات الاجتماعية",
    sector: "GOV",
    requiresExpiry: false,
    requiresCr: true,
    notes:
      "General Organization for Social Insurance registration for employee compliance.",
  },
  {
    code: 10,
    label: "Labor Office File",
    arabicLabel: "ملف مكتب العمل",
    sector: "GOV",
    requiresExpiry: false,
    requiresCr: true,
    notes: "Ministry of Human Resources registration file.",
  },
  {
    code: 11,
    label: "Post Office Box (P.O. Box)",
    arabicLabel: "صندوق البريد",
    sector: "GOV",
    requiresExpiry: true,
    requiresCr: true,
    notes: "Saudi Post official address registration.",
  },
  {
    code: 12,
    label: "ARAMCO Certificate",
    sector: "B2B",
    requiresExpiry: true,
    requiresCr: false,
    notes:
      "Saudi Aramco vendor or contractor qualification certificate.",
  },
  {
    code: 13,
    label: "Wasil Certificate",
    arabicLabel: "شهادة واصل",
    sector: "GOV",
    requiresExpiry: true,
    requiresCr: true,
    notes: "Logistics or delivery-service compliance document.",
  },
  {
    code: 14,
    label: "Bank Account Documentation",
    sector: "B2B",
    requiresExpiry: false,
    requiresCr: false,
    notes:
      "Proof of business bank account used in contract and tax workflows.",
  },
  {
    code: 15,
    label: "Chamber of Commerce Certificate",
    arabicLabel: "شهادة الغرفة التجارية",
    sector: "GOV",
    requiresExpiry: true,
    requiresCr: true,
    notes: "Chamber of Commerce membership and certification.",
  },
  {
    code: 16,
    label: "Industrial License",
    arabicLabel: "الرخصة الصناعية",
    sector: "GOV",
    requiresExpiry: true,
    requiresCr: true,
    notes: "Required for manufacturing and industrial entities.",
  },
  {
    code: 17,
    label: "Website Hosting Agreement",
    sector: "B2B",
    requiresExpiry: true,
    requiresCr: false,
    notes:
      "Service contract for public website hosting and renewal tracking.",
  },
  {
    code: 18,
    label: "Email Hosting Agreement",
    sector: "B2B",
    requiresExpiry: true,
    requiresCr: false,
    notes:
      "Service contract for business email hosting and operational continuity.",
  },
  {
    code: 19,
    label: "Engineering Accreditation",
    sector: "B2B",
    requiresExpiry: true,
    requiresCr: false,
    notes:
      "Professional accreditation body registration for engineering entities.",
  },
];

export const defaultPermissionsByRole: Record<UserRole, PermissionFlag[]> = {
  MASTER_ADMIN: [
    "ENTITY_VIEW",
    "ENTITY_MANAGE",
    "DOCUMENT_UPLOAD",
    "DOCUMENT_MANAGE",
    "NOTIFICATION_MANAGE",
    "USER_MANAGE",
    "TAXONOMY_CONFIGURE",
    "VAULT_CONFIGURE",
    "REPORTS_VIEW",
    "AUDIT_VIEW",
  ],
  CLIENT_ADMIN: [
    "ENTITY_VIEW",
    "ENTITY_MANAGE",
    "DOCUMENT_UPLOAD",
    "DOCUMENT_MANAGE",
    "NOTIFICATION_MANAGE",
    "USER_MANAGE",
    "TAXONOMY_CONFIGURE",
    "VAULT_CONFIGURE",
    "REPORTS_VIEW",
    "AUDIT_VIEW",
  ],
  SUBSIDIARY_MANAGER: [
    "ENTITY_VIEW",
    "DOCUMENT_UPLOAD",
    "DOCUMENT_MANAGE",
    "NOTIFICATION_MANAGE",
    "REPORTS_VIEW",
  ],
  STAFF: ["ENTITY_VIEW", "DOCUMENT_UPLOAD"],
};
