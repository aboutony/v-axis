const API_BASE_URL =
  import.meta.env.VITE_API_URL?.replace(/\/$/, "") ?? "http://localhost:4000";

type ApiPayload = {
  error?: string;
  message?: string;
  [key: string]: unknown;
};

export class ApiError extends Error {
  code: string | undefined;
  payload: ApiPayload;

  constructor(message: string, code?: string, payload: ApiPayload = {}) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.payload = payload;
  }
}

export type PlatformBootstrapResponse = {
  platform: {
    name: string;
    tagline: string;
    categorySlots: number;
  };
  platformState: {
    tenantCount: number;
    hasTenants: boolean;
    databaseReady: boolean;
    startupIssue: string | null;
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
  mfaCode?: string;
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
    timezone: string;
  };
  tenant: {
    id: string;
    clientName: string;
    slug: string;
  };
};

export type AuthActionStatusResponse = {
  purpose: "INVITE" | "PASSWORD_RESET";
  expiresAt: string;
  tenant: {
    id: string;
    clientName: string;
    slug: string;
  };
  user: {
    id: string;
    email: string;
    fullName: string;
  };
};

export type AuthActionCompletionResponse = {
  message: string;
  tenant: {
    id: string;
    clientName: string;
    slug: string;
  };
  user: {
    id: string;
    email: string;
    fullName: string;
  };
};

export type MfaEnrollmentResponse = {
  message: string;
  enrollment: {
    method: "TOTP";
    qrDataUrl: string;
    manualEntryKey: string;
    backupCodes: string[];
  };
};

export type MfaVerificationResponse = {
  message: string;
  user: AuthSession["user"];
  backupCodesRemaining: number;
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
    latestVersionNumber: number;
  }>;
};

export type DocumentVersionsResponse = {
  versions: Array<{
    id: string;
    tenantId: string;
    documentId: string;
    versionNumber: number;
    filePath: string;
    fileMimeType: string | null;
    fileSizeBytes: number | null;
    checksumSha256: string | null;
    uploadedBy: string;
    createdAt: string;
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
    assignedToName: string | null;
    assignedToEmail: string | null;
    delegatedByName: string | null;
  }>;
};

export type UsersResponse = {
  users: Array<{
    id: string;
    email: string;
    fullName: string;
    role: "CLIENT_ADMIN" | "SUBSIDIARY_MANAGER" | "STAFF";
    status: "ACTIVE" | "LOCKED" | "DEACTIVATED";
    jobTitle: string | null;
    department: string | null;
    phone: string | null;
    mfaRequired: boolean;
    mfaEnabled: boolean;
    supervisorUserId: string | null;
    supervisorName: string | null;
    lastLoginAt: string | null;
    permissions: string[];
    openNotificationCount: number;
    pendingInviteExpiresAt: string | null;
    pendingPasswordResetExpiresAt: string | null;
    assignedEntities: Array<{
      id: string;
      entityName: string;
      entityCode: string;
    }>;
    createdAt: string;
    updatedAt: string;
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
  isCriticalMaster?: boolean;
};

export type CreateUserInput = {
  fullName: string;
  email: string;
  password?: string | null;
  role: "CLIENT_ADMIN" | "SUBSIDIARY_MANAGER" | "STAFF";
  jobTitle?: string | null;
  department?: string | null;
  phone?: string | null;
  supervisorUserId?: string | null;
  entityIds?: string[];
  mfaRequired?: boolean;
  issueInvite?: boolean;
};

export type UpdateUserInput = {
  fullName?: string;
  email?: string;
  password?: string | null;
  role?: "CLIENT_ADMIN" | "SUBSIDIARY_MANAGER" | "STAFF";
  status?: "ACTIVE" | "LOCKED" | "DEACTIVATED";
  jobTitle?: string | null;
  department?: string | null;
  phone?: string | null;
  supervisorUserId?: string | null;
  entityIds?: string[];
  mfaRequired?: boolean;
};

export type ReplaceDocumentVersionInput = {
  title?: string | null;
  issueDate?: string | null;
  expiryDate?: string | null;
  notes?: string | null;
};

export type AuditLogsResponse = {
  availableEventTypes: string[];
  logs: Array<{
    id: string;
    tenantId: string | null;
    userId: string | null;
    eventType: string;
    resourceType: string;
    resourceId: string | null;
    ipAddress: string | null;
    userAgent: string | null;
    metadata: Record<string, unknown>;
    createdAt: string;
    actorName: string | null;
    actorEmail: string | null;
  }>;
};

export type AutomationOverviewResponse = {
  worker: {
    deliveryMode: "QUEUE" | "INLINE";
    deliveryConcurrency: number;
    governanceRefreshIntervalMs: number;
    escalationIntervalMs: number;
    queueAvailable: boolean;
    queueMessage: string | null;
  };
  queues: {
    delivery: {
      waiting: number;
      active: number;
      delayed: number;
      completed: number;
      failed: number;
      paused: number;
    };
    maintenance: {
      waiting: number;
      active: number;
      delayed: number;
      completed: number;
      failed: number;
      paused: number;
    };
  };
  schedulers: Array<{
    key: string;
    name: string;
    everyMs: number | null;
    nextRunAt: string | null;
    iterationCount: number;
  }>;
  failureSummary: {
    deliveryFailed: number;
    maintenanceFailed: number;
  };
  recentDeliveries: Array<{
    id: string;
    jobName: string;
    queueJobId: string;
    status: "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED";
    triggeredBy: string;
    resourceType: string | null;
    resourceId: string | null;
    payloadPreview: Record<string, unknown>;
    resultSummary: Record<string, unknown>;
    error: string | null;
    attemptsMade: number;
    maxAttempts: number;
    replayOfId: string | null;
    availableForReplay: boolean;
    startedAt: string | null;
    finishedAt: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
  recentMaintenanceRuns: Array<{
    id: string;
    jobName: string;
    queueJobId: string;
    status: "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED";
    triggeredBy: string;
    payloadPreview: Record<string, unknown>;
    resultSummary: Record<string, unknown>;
    error: string | null;
    attemptsMade: number;
    maxAttempts: number;
    startedAt: string | null;
    finishedAt: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
};

export type WebhooksResponse = {
  availableEvents: string[];
  webhooks: Array<{
    id: string;
    name: string;
    url: string;
    subscribedEvents: string[];
    enabled: boolean;
    secretConfigured: boolean;
    lastDeliveryAttemptAt: string | null;
    lastDeliveryStatus: string | null;
    lastResponseStatusCode: number | null;
    lastDeliveryError: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
};

export type ConnectorsResponse = {
  connectors: Array<{
    id: string;
    connectorType: string;
    name: string;
    status: "ACTIVE" | "INACTIVE" | "ERROR";
    senderName: string;
    senderEmail: string;
    replyToEmail: string | null;
    subjectPrefix: string;
    dispatchInviteLinks: boolean;
    dispatchPasswordResets: boolean;
    dispatchTaskAssignments: boolean;
    dispatchEscalations: boolean;
    lastSync: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
};

export type CreateWebhookInput = {
  name: string;
  url: string;
  sharedSecret: string;
  subscribedEvents: string[];
  enabled?: boolean;
};

export type UpdateWebhookInput = {
  name?: string;
  url?: string;
  sharedSecret?: string | null;
  subscribedEvents?: string[];
  enabled?: boolean;
};

export type CreateConnectorInput = {
  name: string;
  status: "ACTIVE" | "INACTIVE";
  senderName: string;
  senderEmail: string;
  replyToEmail?: string | null;
  subjectPrefix?: string;
  dispatchInviteLinks?: boolean;
  dispatchPasswordResets?: boolean;
  dispatchTaskAssignments?: boolean;
  dispatchEscalations?: boolean;
};

export type UpdateConnectorInput = {
  name?: string;
  status?: "ACTIVE" | "INACTIVE";
  senderName?: string;
  senderEmail?: string;
  replyToEmail?: string | null;
  subjectPrefix?: string;
  dispatchInviteLinks?: boolean;
  dispatchPasswordResets?: boolean;
  dispatchTaskAssignments?: boolean;
  dispatchEscalations?: boolean;
};

type DocumentMutationResponse = {
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
};

async function parseJson<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json")
    ? ((await response.json()) as ApiPayload)
    : {};

  if (!response.ok) {
    const message =
      typeof payload.message === "string"
        ? payload.message
        : "The request could not be completed.";

    throw new ApiError(
      message,
      typeof payload.error === "string" ? payload.error : undefined,
      payload,
    );
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

function appendDocumentFields(
  formData: FormData,
  input: RegisterDocumentInput | ReplaceDocumentVersionInput,
) {
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined || value === null || value === "") {
      continue;
    }

    formData.append(
      key,
      typeof value === "boolean" || typeof value === "number"
        ? String(value)
        : value,
    );
  }
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
    body: JSON.stringify({
      ...input,
      mfaCode: input.mfaCode?.trim() ? input.mfaCode.trim() : undefined,
    }),
  });

  return parseJson<AuthSession>(response);
}

export async function fetchAuthActionStatus(token: string) {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/auth/access/${encodeURIComponent(token)}`,
    {
      credentials: "include",
    },
  );

  return parseJson<AuthActionStatusResponse>(response);
}

export async function acceptInvite(input: {
  token: string;
  fullName?: string;
  password: string;
}) {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/auth/invitations/accept`,
    {
      method: "POST",
      headers: buildHeaders(undefined, true),
      credentials: "include",
      body: JSON.stringify(input),
    },
  );

  return parseJson<AuthActionCompletionResponse>(response);
}

export async function confirmPasswordReset(input: {
  token: string;
  password: string;
}) {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/auth/password-reset/confirm`,
    {
      method: "POST",
      headers: buildHeaders(undefined, true),
      credentials: "include",
      body: JSON.stringify(input),
    },
  );

  return parseJson<AuthActionCompletionResponse>(response);
}

export async function beginMfaEnrollment(accessToken: string) {
  const response = await fetch(`${API_BASE_URL}/api/v1/auth/mfa/totp/enroll`, {
    method: "POST",
    headers: buildHeaders(accessToken),
    credentials: "include",
  });

  return parseJson<MfaEnrollmentResponse>(response);
}

export async function verifyTotpEnrollment(accessToken: string, code: string) {
  const response = await fetch(`${API_BASE_URL}/api/v1/auth/mfa/totp/verify`, {
    method: "POST",
    headers: buildHeaders(accessToken, true),
    credentials: "include",
    body: JSON.stringify({ code }),
  });

  return parseJson<MfaVerificationResponse>(response);
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
  const response = await fetch(
    `${API_BASE_URL}/api/v1/categories/${categoryId}`,
    {
      method: "PATCH",
      headers: buildHeaders(accessToken, true),
      credentials: "include",
      body: JSON.stringify(input),
    },
  );

  return parseJson<{
    message: string;
    notification: NotificationsResponse["notifications"][number];
  }>(response);
}

export async function refreshSession() {
  const response = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
    method: "POST",
    credentials: "include",
  });

  return parseJson<AuthSession>(response);
}

export async function logout() {
  const response = await fetch(`${API_BASE_URL}/api/v1/auth/logout`, {
    method: "POST",
    credentials: "include",
  });

  return parseJson<{ message: string }>(response);
}

export async function createEntity(
  accessToken: string,
  input: CreateEntityInput,
) {
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

export async function fetchDocumentVersions(
  accessToken: string,
  documentId: string,
) {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/documents/${documentId}/versions`,
    {
      headers: buildHeaders(accessToken),
      credentials: "include",
    },
  );

  return parseJson<DocumentVersionsResponse>(response);
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

  return parseJson<DocumentMutationResponse>(response);
}

export async function uploadDocument(
  accessToken: string,
  input: RegisterDocumentInput,
  file: File,
) {
  const formData = new FormData();
  appendDocumentFields(formData, input);
  formData.append("file", file);

  const response = await fetch(`${API_BASE_URL}/api/v1/documents/upload`, {
    method: "POST",
    headers: buildHeaders(accessToken),
    credentials: "include",
    body: formData,
  });

  return parseJson<DocumentMutationResponse>(response);
}

export async function replaceDocumentFile(
  accessToken: string,
  documentId: string,
  input: ReplaceDocumentVersionInput,
  file: File,
) {
  const formData = new FormData();
  appendDocumentFields(formData, input);
  formData.append("file", file);

  const response = await fetch(
    `${API_BASE_URL}/api/v1/documents/${documentId}/versions`,
    {
      method: "POST",
      headers: buildHeaders(accessToken),
      credentials: "include",
      body: formData,
    },
  );

  return parseJson<
    DocumentMutationResponse & {
      versionNumber: number;
    }
  >(response);
}

export async function toggleCriticalMaster(
  accessToken: string,
  documentId: string,
  isCriticalMaster: boolean,
) {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/documents/${documentId}/critical-master`,
    {
      method: "PATCH",
      headers: buildHeaders(accessToken, true),
      credentials: "include",
      body: JSON.stringify({ isCriticalMaster }),
    },
  );

  return parseJson<{
    message: string;
    document: DocumentsResponse["documents"][number];
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

  return parseJson<{
    message: string;
    entityCount: number;
    escalatedNotifications: number;
  }>(response);
}

export async function fetchNotifications(accessToken: string) {
  const response = await fetch(`${API_BASE_URL}/api/v1/notifications`, {
    headers: buildHeaders(accessToken),
    credentials: "include",
  });

  return parseJson<NotificationsResponse>(response);
}

export async function escalateOverdueNotifications(accessToken: string) {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/notifications/escalate-overdue`,
    {
      method: "POST",
      headers: buildHeaders(accessToken),
      credentials: "include",
    },
  );

  return parseJson<{
    message: string;
    escalatedNotifications: number;
  }>(response);
}

export async function fetchUsers(accessToken: string) {
  const response = await fetch(`${API_BASE_URL}/api/v1/users`, {
    headers: buildHeaders(accessToken),
    credentials: "include",
  });

  return parseJson<UsersResponse>(response);
}

export async function createUser(accessToken: string, input: CreateUserInput) {
  const response = await fetch(`${API_BASE_URL}/api/v1/users`, {
    method: "POST",
    headers: buildHeaders(accessToken, true),
    credentials: "include",
    body: JSON.stringify(input),
  });

  return parseJson<{
    message: string;
    invite: {
      link: string;
      expiresAt: string;
    } | null;
    users: UsersResponse["users"];
  }>(response);
}

export async function updateUser(
  accessToken: string,
  userId: string,
  input: UpdateUserInput,
) {
  const response = await fetch(`${API_BASE_URL}/api/v1/users/${userId}`, {
    method: "PATCH",
    headers: buildHeaders(accessToken, true),
    credentials: "include",
    body: JSON.stringify(input),
  });

  return parseJson<{
    message: string;
    users: UsersResponse["users"];
  }>(response);
}

export async function resetUserMfa(accessToken: string, userId: string) {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/users/${userId}/reset-mfa`,
    {
      method: "POST",
      headers: buildHeaders(accessToken),
      credentials: "include",
    },
  );

  return parseJson<{
    message: string;
    users: UsersResponse["users"];
  }>(response);
}

export async function sendUserInvite(accessToken: string, userId: string) {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/users/${userId}/send-invite`,
    {
      method: "POST",
      headers: buildHeaders(accessToken),
      credentials: "include",
    },
  );

  return parseJson<{
    message: string;
    invite: {
      link: string;
      expiresAt: string;
    };
    users: UsersResponse["users"];
  }>(response);
}

export async function generateUserPasswordResetLink(
  accessToken: string,
  userId: string,
) {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/users/${userId}/password-reset-link`,
    {
      method: "POST",
      headers: buildHeaders(accessToken),
      credentials: "include",
    },
  );

  return parseJson<{
    message: string;
    passwordReset: {
      link: string;
      expiresAt: string;
    };
    users: UsersResponse["users"];
  }>(response);
}

export async function fetchAuditLogs(
  accessToken: string,
  input: {
    limit?: number;
    eventType?: string;
    resourceType?: string;
    userId?: string;
  } = {},
) {
  const params = new URLSearchParams();

  if (input.limit) {
    params.set("limit", String(input.limit));
  }

  if (input.eventType) {
    params.set("eventType", input.eventType);
  }

  if (input.resourceType) {
    params.set("resourceType", input.resourceType);
  }

  if (input.userId) {
    params.set("userId", input.userId);
  }

  const query = params.toString();
  const response = await fetch(
    `${API_BASE_URL}/api/v1/audit${query ? `?${query}` : ""}`,
    {
      headers: buildHeaders(accessToken),
      credentials: "include",
    },
  );

  return parseJson<AuditLogsResponse>(response);
}

export async function downloadAuditExport(
  accessToken: string,
  input: {
    format: "csv" | "json";
    limit?: number;
    eventType?: string;
    resourceType?: string;
    userId?: string;
  },
) {
  const params = new URLSearchParams();
  params.set("format", input.format);

  if (input.limit) {
    params.set("limit", String(input.limit));
  }

  if (input.eventType) {
    params.set("eventType", input.eventType);
  }

  if (input.resourceType) {
    params.set("resourceType", input.resourceType);
  }

  if (input.userId) {
    params.set("userId", input.userId);
  }

  const response = await fetch(
    `${API_BASE_URL}/api/v1/audit/export?${params.toString()}`,
    {
      headers: buildHeaders(accessToken),
      credentials: "include",
    },
  );

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as ApiPayload;
    throw new ApiError(
      typeof payload.message === "string"
        ? payload.message
        : "The export could not be generated.",
      typeof payload.error === "string" ? payload.error : undefined,
      payload,
    );
  }

  const disposition = response.headers.get("content-disposition") ?? "";
  const match = disposition.match(/filename=\"([^\"]+)\"/i);

  return {
    blob: await response.blob(),
    filename:
      match?.[1] ??
      `vaxis-audit-export.${input.format === "csv" ? "csv" : "json"}`,
  };
}

export async function fetchAutomationOverview(accessToken: string, limit = 10) {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/automation?limit=${encodeURIComponent(String(limit))}`,
    {
      headers: buildHeaders(accessToken),
      credentials: "include",
    },
  );

  return parseJson<AutomationOverviewResponse>(response);
}

export async function replayAutomationDelivery(
  accessToken: string,
  automationJobId: string,
) {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/automation/deliveries/${automationJobId}/replay`,
    {
      method: "POST",
      headers: buildHeaders(accessToken),
      credentials: "include",
    },
  );

  return parseJson<{
    message: string;
    replayJobId: string;
  }>(response);
}

export async function fetchWebhooks(accessToken: string) {
  const response = await fetch(`${API_BASE_URL}/api/v1/webhooks`, {
    headers: buildHeaders(accessToken),
    credentials: "include",
  });

  return parseJson<WebhooksResponse>(response);
}

export async function createWebhook(
  accessToken: string,
  input: CreateWebhookInput,
) {
  const response = await fetch(`${API_BASE_URL}/api/v1/webhooks`, {
    method: "POST",
    headers: buildHeaders(accessToken, true),
    credentials: "include",
    body: JSON.stringify(input),
  });

  return parseJson<{
    message: string;
    availableEvents: WebhooksResponse["availableEvents"];
    webhooks: WebhooksResponse["webhooks"];
  }>(response);
}

export async function updateWebhook(
  accessToken: string,
  webhookId: string,
  input: UpdateWebhookInput,
) {
  const response = await fetch(`${API_BASE_URL}/api/v1/webhooks/${webhookId}`, {
    method: "PATCH",
    headers: buildHeaders(accessToken, true),
    credentials: "include",
    body: JSON.stringify(input),
  });

  return parseJson<{
    message: string;
    availableEvents: WebhooksResponse["availableEvents"];
    webhooks: WebhooksResponse["webhooks"];
  }>(response);
}

export async function testWebhook(
  accessToken: string,
  webhookId: string,
  eventType?: string,
) {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/webhooks/${webhookId}/test`,
    {
      method: "POST",
      headers: buildHeaders(accessToken, true),
      credentials: "include",
      body: JSON.stringify(
        eventType
          ? {
              eventType,
            }
          : {},
      ),
    },
  );

  return parseJson<{
    message: string;
    deliveryId: string;
    statusCode: number;
    availableEvents: WebhooksResponse["availableEvents"];
    webhooks: WebhooksResponse["webhooks"];
  }>(response);
}

export async function fetchConnectors(accessToken: string) {
  const response = await fetch(`${API_BASE_URL}/api/v1/connectors`, {
    headers: buildHeaders(accessToken),
    credentials: "include",
  });

  return parseJson<ConnectorsResponse>(response);
}

export async function createConnector(
  accessToken: string,
  input: CreateConnectorInput,
) {
  const response = await fetch(`${API_BASE_URL}/api/v1/connectors`, {
    method: "POST",
    headers: buildHeaders(accessToken, true),
    credentials: "include",
    body: JSON.stringify(input),
  });

  return parseJson<{
    message: string;
    connectors: ConnectorsResponse["connectors"];
  }>(response);
}

export async function updateConnector(
  accessToken: string,
  connectorId: string,
  input: UpdateConnectorInput,
) {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/connectors/${connectorId}`,
    {
      method: "PATCH",
      headers: buildHeaders(accessToken, true),
      credentials: "include",
      body: JSON.stringify(input),
    },
  );

  return parseJson<{
    message: string;
    connectors: ConnectorsResponse["connectors"];
  }>(response);
}

export async function testConnectorEmail(
  accessToken: string,
  connectorId: string,
  recipientEmail?: string,
) {
  const body: {
    recipientEmail?: string;
  } = {};

  if (recipientEmail) {
    body.recipientEmail = recipientEmail;
  }

  const response = await fetch(
    `${API_BASE_URL}/api/v1/connectors/${connectorId}/test-email`,
    {
      method: "POST",
      headers: buildHeaders(accessToken, true),
      credentials: "include",
      body: JSON.stringify(body),
    },
  );

  return parseJson<{
    message: string;
    attempted: number;
    delivered: number;
    connectors: ConnectorsResponse["connectors"];
  }>(response);
}

export async function acknowledgeNotification(
  accessToken: string,
  notificationId: string,
) {
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

export async function resolveNotification(
  accessToken: string,
  notificationId: string,
) {
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
