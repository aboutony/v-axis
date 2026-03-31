const API_BASE_URL =
  import.meta.env.VITE_API_URL?.replace(/\/$/, "") ?? "http://localhost:4000";

export type PlatformBootstrapResponse = {
  platform: {
    name: string;
    tagline: string;
    categorySlots: number;
  };
  security: {
    auth: string;
    encryption: string;
    residency: string;
  };
  roles: string[];
  permissions: string[];
  defaultPermissionsByRole: Record<string, string[]>;
  seededDocumentTypes: Array<{
    code: number;
    label: string;
    arabicLabel?: string;
    sector: string;
    requiresExpiry: boolean;
    requiresCr: boolean;
    notes: string;
  }>;
  roadmap: string[];
};

export type BootstrapClientInput = {
  clientName: string;
  slug: string;
  adminFullName: string;
  adminEmail: string;
  adminPassword: string;
};

export type BootstrapClientResponse = {
  message: string;
  tenant: {
    id: string;
    clientName: string;
    slug: string;
  };
  admin: {
    id: string;
    email: string;
    fullName: string;
  };
  nextSteps: string[];
};

export type LoginInput = {
  tenantSlug: string;
  email: string;
  password: string;
};

export type AuthSession = {
  message: string;
  accessToken: string;
  refreshTokenExpiresAt: string;
  user: {
    id: string;
    tenantId: string;
    email: string;
    fullName: string;
    role: string;
    permissions: string[];
    preferredLanguage: string;
    preferredTheme: string;
    mfaRequired: boolean;
    mfaEnabled: boolean;
  };
  tenant: {
    id: string;
    clientName: string;
    slug: string;
  };
};

export type TaxonomyResponse = {
  tenant: {
    id: string;
    clientName: string;
    slug: string;
  };
  categories: Array<{
    id: string;
    tenantId: string;
    slotNumber: number;
    label: string;
    colorCode: string | null;
    description: string | null;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    entities: Array<{
      id: string;
      tenantId: string;
      categoryId: string;
      entityName: string;
      entityCode: string;
      entityType: string;
      subDesignator: string;
      country: string | null;
      registrationNumber: string | null;
      isActive: boolean;
      createdAt: string;
      updatedAt: string;
    }>;
  }>;
};

export type DocumentTypesResponse = {
  documentTypes: Array<{
    id: string;
    tenantId: string | null;
    code: number;
    label: string;
    arabicLabel: string | null;
    sector: string;
    requiresExpiry: boolean;
    requiresCr: boolean;
    isSystem: boolean;
    notes: string | null;
  }>;
};

export type DocumentsResponse = {
  documents: Array<{
    id: string;
    tenantId: string;
    entityId: string;
    dnaCode: string;
    documentTypeId: string;
    title: string;
    crNumber: string | null;
    chamberNumber: string | null;
    companyIdentifier: string | null;
    costAmount: string | null;
    durationYears: string | null;
    issueDate: string | null;
    expiryDate: string | null;
    status: string;
    notes: string | null;
    filePath: string | null;
    fileMimeType: string | null;
    fileSizeBytes: number | null;
    checksumSha256: string | null;
    isCriticalMaster: boolean;
    offlineSyncStatus: string;
    lastOfflineSync: string | null;
    offlineExpiry: string | null;
    createdBy: string;
    updatedBy: string | null;
    createdAt: string;
    updatedAt: string;
    derivedStatus: string;
    daysRemaining: number | null;
    documentTypeLabel: string;
    sector: string;
    entityName: string;
  }>;
};

export type DashboardSummaryResponse = {
  portfolioHealthScore: number;
  categoryHealthCards: Array<{
    id: string;
    slotNumber: number;
    label: string;
    colorCode: string | null;
    entityCount: number;
    worstEntityScore: number;
    activeAlerts: number;
  }>;
  criticalAlerts: Array<{
    kind: "expiry" | "gap";
    severity: string;
    documentId?: string;
    documentTypeId?: string;
    title: string;
    reason: string;
    daysRemaining?: number | null;
    entityId: string;
    entityName: string;
  }>;
  expiryTimeline: Array<{
    id: string;
    dnaCode: string;
    title: string;
    entityName: string;
    documentTypeLabel: string;
    daysRemaining: number | null;
    expiryDate: string | null;
    derivedStatus: string;
  }>;
  documentGapSummary: Array<{
    categoryId: string;
    label: string;
    gapCount: number;
  }>;
  recentActivity: Array<{
    id: string;
    eventType: string;
    resourceType: string;
    createdAt: string;
    metadata: Record<string, unknown>;
  }>;
  notificationSummary: {
    open: number;
    critical: number;
  };
  entities: Array<{
    id: string;
    entityName: string;
    entityCode: string;
    entityType: string;
    score: number;
    prevScore: number | null;
    openAlerts: number;
    gapCount: number;
    statusCounts: {
      active: number;
      expiring: number;
      expired: number;
      archived: number;
    };
  }>;
};

export type RulesResponse = {
  rules: Array<{
    id: string;
    tenantId: string;
    entityType: "SUBSIDIARY" | "JV" | "ASSOCIATE" | "BRANCH";
    documentTypeId: string;
    isMandatory: boolean;
    country: string | null;
    createdAt: string;
    documentTypeLabel: string;
    documentSector: string;
  }>;
};

export type RuleInput = {
  entityType: "SUBSIDIARY" | "JV" | "ASSOCIATE" | "BRANCH";
  documentTypeId: string;
  isMandatory: boolean;
  country?: string | null;
};

export type NotificationsResponse = {
  notifications: Array<{
    id: string;
    tenantId: string;
    documentId: string | null;
    entityId: string | null;
    sourceKey: string;
    type: string;
    severity: string;
    status: string;
    title: string;
    message: string;
    assignedTo: string | null;
    delegatedBy: string | null;
    escalationLevel: number;
    dueDate: string | null;
    acknowledgedAt: string | null;
    resolvedAt: string | null;
    escalatedAt: string | null;
    createdAt: string;
    updatedAt: string;
    entityName: string;
  }>;
};

export type UpdateCategoryInput = {
  label?: string;
  colorCode?: string;
  description?: string | null;
  isActive?: boolean;
};

export type CreateEntityInput = {
  categoryId: string;
  entityName: string;
  entityCode: string;
  entityType: "SUBSIDIARY" | "JV" | "ASSOCIATE" | "BRANCH";
  country?: string | null;
  registrationNumber?: string | null;
};

export type RegisterDocumentInput = {
  entityId: string;
  documentTypeId: string;
  title: string;
  crNumber?: string | null;
  chamberNumber?: string | null;
  companyIdentifier?: string | null;
  costAmount?: number | null;
  durationYears?: number | null;
  issueDate?: string | null;
  expiryDate?: string | null;
  notes?: string | null;
  filePath?: string | null;
  fileMimeType?: string | null;
  fileSizeBytes?: number | null;
  checksumSha256?: string | null;
  isCriticalMaster?: boolean;
};

async function parseJson<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as { message?: string };

  if (!response.ok) {
    const message =
      typeof payload.message === "string"
        ? payload.message
        : "The request could not be completed.";

    throw new Error(message);
  }

  return payload as T;
}

function buildHeaders(accessToken?: string, includeJson = false) {
  const headers = new Headers();

  if (includeJson) {
    headers.set("Content-Type", "application/json");
  }

  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  return headers;
}

export async function fetchPlatformBootstrap() {
  const response = await fetch(`${API_BASE_URL}/api/v1/platform/bootstrap`, {
    credentials: "include",
  });

  return parseJson<PlatformBootstrapResponse>(response);
}

export async function bootstrapClient(input: BootstrapClientInput) {
  const response = await fetch(`${API_BASE_URL}/api/v1/auth/bootstrap-client`, {
    method: "POST",
    headers: buildHeaders(undefined, true),
    credentials: "include",
    body: JSON.stringify(input),
  });

  return parseJson<BootstrapClientResponse>(response);
}

export async function login(input: LoginInput) {
  const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
    method: "POST",
    headers: buildHeaders(undefined, true),
    credentials: "include",
    body: JSON.stringify(input),
  });

  return parseJson<AuthSession>(response);
}

export async function fetchTaxonomy(accessToken: string) {
  const response = await fetch(`${API_BASE_URL}/api/v1/taxonomy`, {
    headers: buildHeaders(accessToken),
    credentials: "include",
  });

  return parseJson<TaxonomyResponse>(response);
}

export async function updateCategory(
  accessToken: string,
  categoryId: string,
  input: UpdateCategoryInput,
) {
  const response = await fetch(`${API_BASE_URL}/api/v1/categories/${categoryId}`, {
    method: "PATCH",
    headers: buildHeaders(accessToken, true),
    credentials: "include",
    body: JSON.stringify(input),
  });

  return parseJson<{
    message: string;
    category: TaxonomyResponse["categories"][number];
  }>(response);
}

export async function createEntity(accessToken: string, input: CreateEntityInput) {
  const response = await fetch(`${API_BASE_URL}/api/v1/entities`, {
    method: "POST",
    headers: buildHeaders(accessToken, true),
    credentials: "include",
    body: JSON.stringify(input),
  });

  return parseJson<{
    message: string;
    entity: TaxonomyResponse["categories"][number]["entities"][number];
  }>(response);
}

export async function fetchDocumentTypes(accessToken: string) {
  const response = await fetch(`${API_BASE_URL}/api/v1/document-types`, {
    headers: buildHeaders(accessToken),
    credentials: "include",
  });

  return parseJson<DocumentTypesResponse>(response);
}

export async function fetchDocuments(accessToken: string, entityId?: string) {
  const query = entityId ? `?entityId=${encodeURIComponent(entityId)}` : "";
  const response = await fetch(`${API_BASE_URL}/api/v1/documents${query}`, {
    headers: buildHeaders(accessToken),
    credentials: "include",
  });

  return parseJson<DocumentsResponse>(response);
}

export async function registerDocument(
  accessToken: string,
  input: RegisterDocumentInput,
) {
  const response = await fetch(`${API_BASE_URL}/api/v1/documents/register`, {
    method: "POST",
    headers: buildHeaders(accessToken, true),
    credentials: "include",
    body: JSON.stringify(input),
  });

  return parseJson<{
    message: string;
    document: DocumentsResponse["documents"][number];
    riskSnapshot: {
      score: number;
      gapCount: number;
      alerts: Array<{
        kind: string;
        severity: string;
        title: string;
        reason: string;
      }>;
    };
  }>(response);
}

export async function fetchDashboardSummary(accessToken: string) {
  const response = await fetch(`${API_BASE_URL}/api/v1/dashboard/summary`, {
    headers: buildHeaders(accessToken),
    credentials: "include",
  });

  return parseJson<DashboardSummaryResponse>(response);
}

export async function fetchRules(accessToken: string) {
  const response = await fetch(`${API_BASE_URL}/api/v1/rules`, {
    headers: buildHeaders(accessToken),
    credentials: "include",
  });

  return parseJson<RulesResponse>(response);
}

export async function createRule(accessToken: string, input: RuleInput) {
  const response = await fetch(`${API_BASE_URL}/api/v1/rules`, {
    method: "POST",
    headers: buildHeaders(accessToken, true),
    credentials: "include",
    body: JSON.stringify(input),
  });

  return parseJson<{
    message: string;
    rule: RulesResponse["rules"][number];
  }>(response);
}

export async function deleteRule(accessToken: string, ruleId: string) {
  const response = await fetch(`${API_BASE_URL}/api/v1/rules/${ruleId}`, {
    method: "DELETE",
    headers: buildHeaders(accessToken),
    credentials: "include",
  });

  return parseJson<{ message: string }>(response);
}

export async function refreshGovernance(accessToken: string) {
  const response = await fetch(`${API_BASE_URL}/api/v1/governance/refresh`, {
    method: "POST",
    headers: buildHeaders(accessToken),
    credentials: "include",
  });

  return parseJson<{ message: string }>(response);
}

export async function fetchNotifications(accessToken: string) {
  const response = await fetch(`${API_BASE_URL}/api/v1/notifications`, {
    headers: buildHeaders(accessToken),
    credentials: "include",
  });

  return parseJson<NotificationsResponse>(response);
}

export async function acknowledgeNotification(accessToken: string, notificationId: string) {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/notifications/${notificationId}/acknowledge`,
    {
      method: "PATCH",
      headers: buildHeaders(accessToken),
      credentials: "include",
    },
  );

  return parseJson<{
    message: string;
    notification: NotificationsResponse["notifications"][number];
  }>(response);
}

export async function resolveNotification(accessToken: string, notificationId: string) {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/notifications/${notificationId}/resolve`,
    {
      method: "PATCH",
      headers: buildHeaders(accessToken),
      credentials: "include",
    },
  );

  return parseJson<{
    message: string;
    notification: NotificationsResponse["notifications"][number];
  }>(response);
}
