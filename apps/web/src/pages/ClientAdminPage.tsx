import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  acknowledgeNotification,
  ApiError,
  createEntity,
  createUser,
  fetchDashboardSummary,
  fetchDocumentTypes,
  fetchDocuments,
  fetchNotifications,
  fetchTaxonomy,
  fetchUsers,
  login,
  registerDocument,
  resolveNotification,
  uploadDocument,
  type AuthSession,
  type CreateEntityInput,
  type CreateUserInput,
  type RegisterDocumentInput,
} from "../lib/api";

type ClientAdminPageProps = {
  session: AuthSession | null;
  onSessionChange: (session: AuthSession | null) => void;
};

type ComposerView = "document" | "entity" | "team";

export function ClientAdminPage({
  session,
  onSessionChange,
}: ClientAdminPageProps) {
  const queryClient = useQueryClient();
  const accessToken = session?.accessToken;
  const [composerView, setComposerView] = useState<ComposerView>("document");
  const [loginForm, setLoginForm] = useState({
    tenantSlug: session?.tenant.slug ?? "",
    email: session?.user.email ?? "",
    password: "",
    mfaCode: "",
  });
  const [loginRequiresMfa, setLoginRequiresMfa] = useState(false);
  const [documentUploadFile, setDocumentUploadFile] = useState<File | null>(
    null,
  );
  const [documentInputKey, setDocumentInputKey] = useState(0);
  const [entityForm, setEntityForm] = useState<CreateEntityInput>({
    categoryId: "",
    entityName: "",
    entityCode: "",
    entityType: "SUBSIDIARY",
    country: "Saudi Arabia",
    registrationNumber: "",
  });
  const [documentForm, setDocumentForm] = useState<RegisterDocumentInput>({
    entityId: "",
    documentTypeId: "",
    title: "",
    issueDate: "",
    expiryDate: "",
    crNumber: "",
    notes: "",
    isCriticalMaster: false,
  });
  const [teamForm, setTeamForm] = useState<CreateUserInput>({
    fullName: "",
    email: "",
    password: "",
    role: "STAFF",
    jobTitle: "",
    department: "",
    phone: "",
    supervisorUserId: null,
    entityIds: [],
    mfaRequired: true,
    issueInvite: true,
  });
  const [latestInvite, setLatestInvite] = useState<{
    email: string;
    link: string;
    expiresAt: string;
  } | null>(null);

  const dashboardQuery = useQuery({
    queryKey: ["client-portal-dashboard", accessToken],
    queryFn: () => fetchDashboardSummary(accessToken!),
    enabled: Boolean(accessToken),
  });

  const taxonomyQuery = useQuery({
    queryKey: ["client-portal-taxonomy", accessToken],
    queryFn: () => fetchTaxonomy(accessToken!),
    enabled: Boolean(accessToken),
  });

  const notificationsQuery = useQuery({
    queryKey: ["client-portal-notifications", accessToken],
    queryFn: () => fetchNotifications(accessToken!),
    enabled: Boolean(accessToken),
  });

  const documentsQuery = useQuery({
    queryKey: ["client-portal-documents", accessToken],
    queryFn: () => fetchDocuments(accessToken!),
    enabled: Boolean(accessToken),
  });

  const documentTypesQuery = useQuery({
    queryKey: ["client-portal-document-types", accessToken],
    queryFn: () => fetchDocumentTypes(accessToken!),
    enabled: Boolean(accessToken),
  });

  const usersQuery = useQuery({
    queryKey: ["client-portal-users", accessToken],
    queryFn: () => fetchUsers(accessToken!),
    enabled: Boolean(accessToken),
  });

  const categories = taxonomyQuery.data?.categories ?? [];
  const entities = categories.flatMap((category) => category.entities);
  const documentTypes = documentTypesQuery.data?.documentTypes ?? [];
  const notifications = notificationsQuery.data?.notifications ?? [];
  const documents = documentsQuery.data?.documents ?? [];
  const users = usersQuery.data?.users ?? [];
  const expiringSoon = (dashboardQuery.data?.expiryTimeline ?? []).filter(
    (item) => item.daysRemaining !== null && item.daysRemaining <= 60,
  );

  useEffect(() => {
    if (!entityForm.categoryId && categories[0]) {
      setEntityForm((current) => ({
        ...current,
        categoryId: categories[0]?.id ?? "",
      }));
    }
  }, [categories, entityForm.categoryId]);

  useEffect(() => {
    if (!documentForm.entityId && entities[0]) {
      setDocumentForm((current) => ({
        ...current,
        entityId: entities[0]?.id ?? "",
      }));
    }
  }, [documentForm.entityId, entities]);

  useEffect(() => {
    if (!documentForm.documentTypeId && documentTypes[0]) {
      setDocumentForm((current) => ({
        ...current,
        documentTypeId: documentTypes[0]?.id ?? "",
      }));
    }
  }, [documentForm.documentTypeId, documentTypes]);

  async function refreshPortal() {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ["client-portal-dashboard", accessToken],
      }),
      queryClient.invalidateQueries({
        queryKey: ["client-portal-taxonomy", accessToken],
      }),
      queryClient.invalidateQueries({
        queryKey: ["client-portal-notifications", accessToken],
      }),
      queryClient.invalidateQueries({
        queryKey: ["client-portal-documents", accessToken],
      }),
      queryClient.invalidateQueries({
        queryKey: ["client-portal-users", accessToken],
      }),
    ]);
  }

  const loginMutation = useMutation({
    mutationFn: login,
    onSuccess: (nextSession) => {
      onSessionChange(nextSession);
      setLoginRequiresMfa(false);
      setLoginForm((current) => ({
        ...current,
        password: "",
        mfaCode: "",
      }));
    },
    onError: (error) => {
      if (
        error instanceof ApiError &&
        (error.code === "MFA_REQUIRED" || error.code === "MFA_INVALID")
      ) {
        setLoginRequiresMfa(true);
      }
    },
  });

  const createEntityMutation = useMutation({
    mutationFn: (input: CreateEntityInput) => createEntity(accessToken!, input),
    onSuccess: async () => {
      await refreshPortal();
      setEntityForm((current) => ({
        ...current,
        entityName: "",
        entityCode: "",
        registrationNumber: "",
      }));
    },
  });

  const documentMutation = useMutation({
    mutationFn: (input: { metadata: RegisterDocumentInput; file: File | null }) =>
      input.file
        ? uploadDocument(accessToken!, input.metadata, input.file)
        : registerDocument(accessToken!, input.metadata),
    onSuccess: async () => {
      await refreshPortal();
      setDocumentForm((current) => ({
        ...current,
        title: "",
        issueDate: "",
        expiryDate: "",
        crNumber: "",
        notes: "",
        isCriticalMaster: false,
      }));
      setDocumentUploadFile(null);
      setDocumentInputKey((current) => current + 1);
    },
  });

  const inviteUserMutation = useMutation({
    mutationFn: (input: CreateUserInput) => createUser(accessToken!, input),
    onSuccess: async (response, variables) => {
      await refreshPortal();
      setTeamForm({
        fullName: "",
        email: "",
        password: "",
        role: "STAFF",
        jobTitle: "",
        department: "",
        phone: "",
        supervisorUserId: null,
        entityIds: [],
        mfaRequired: true,
        issueInvite: true,
      });
      setLatestInvite(
        response.invite
          ? {
              email: variables.email,
              link: response.invite.link,
              expiresAt: response.invite.expiresAt,
            }
          : null,
      );
    },
  });

  const acknowledgeMutation = useMutation({
    mutationFn: (notificationId: string) =>
      acknowledgeNotification(accessToken!, notificationId),
    onSuccess: refreshPortal,
  });

  const resolveMutation = useMutation({
    mutationFn: (notificationId: string) =>
      resolveNotification(accessToken!, notificationId),
    onSuccess: refreshPortal,
  });

  if (!session) {
    return (
      <div className="client-page">
        <section className="client-hero">
          <div className="client-hero-copy">
            <p className="eyebrow">Client Admin Workspace</p>
            <h1>One workspace for your regulated records and compliance actions.</h1>
            <p className="client-hero-body">
              Sign in to manage entities, upload documents, assign accountability,
              and stay ahead of renewals and missing records.
            </p>
            <div className="client-hero-pills">
              <span className="client-pill">Expiry watch</span>
              <span className="client-pill">Entity governance</span>
              <span className="client-pill">Action ownership</span>
            </div>
          </div>

          <div className="client-card client-login-card">
            <div className="client-card-header">
              <div>
                <p className="eyebrow">Secure Sign-In</p>
                <h2>Open your workspace</h2>
              </div>
            </div>

            <form
              className="client-form-grid"
              onSubmit={(event) => {
                event.preventDefault();
                loginMutation.mutate(loginForm);
              }}
            >
              <label>
                Tenant slug
                <input
                  onChange={(event) =>
                    setLoginForm((current) => ({
                      ...current,
                      tenantSlug: event.target.value,
                    }))
                  }
                  placeholder="your-company"
                  value={loginForm.tenantSlug}
                />
              </label>
              <label>
                Email
                <input
                  onChange={(event) =>
                    setLoginForm((current) => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
                  placeholder="admin@company.com"
                  type="email"
                  value={loginForm.email}
                />
              </label>
              <label>
                Password
                <input
                  onChange={(event) =>
                    setLoginForm((current) => ({
                      ...current,
                      password: event.target.value,
                    }))
                  }
                  type="password"
                  value={loginForm.password}
                />
              </label>
              {loginRequiresMfa ? (
                <label>
                  Verification code
                  <input
                    onChange={(event) =>
                      setLoginForm((current) => ({
                        ...current,
                        mfaCode: event.target.value,
                      }))
                    }
                    placeholder="6-digit code"
                    value={loginForm.mfaCode}
                  />
                </label>
              ) : null}
              <button
                className="primary-button"
                disabled={loginMutation.isPending}
                type="submit"
              >
                {loginMutation.isPending ? "Signing in..." : "Enter workspace"}
              </button>
              {loginMutation.error ? (
                <p className="form-feedback error">
                  {loginMutation.error.message}
                </p>
              ) : null}
            </form>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="client-page">
      <section className="client-hero client-hero-compact">
        <div className="client-hero-copy">
          <p className="eyebrow">Workspace Overview</p>
          <h1>{session.tenant.clientName}</h1>
          <p className="client-hero-body">
            See what is expiring, what is missing, and what needs action across
            your portfolio.
          </p>
          <div className="client-hero-pills">
            <span className="client-pill">{session.user.fullName}</span>
            <span className="client-pill">{entities.length} entities</span>
            <span className="client-pill">{documents.length} documents</span>
          </div>
        </div>
        <div className="client-hero-actions">
          <button
            className={`secondary-button ${composerView === "document" ? "secondary-button-active" : ""}`}
            onClick={() => setComposerView("document")}
            type="button"
          >
            Add document
          </button>
          <button
            className={`secondary-button ${composerView === "entity" ? "secondary-button-active" : ""}`}
            onClick={() => setComposerView("entity")}
            type="button"
          >
            Add entity
          </button>
          <button
            className={`secondary-button ${composerView === "team" ? "secondary-button-active" : ""}`}
            onClick={() => setComposerView("team")}
            type="button"
          >
            Invite team
          </button>
          <button
            className="secondary-button"
            onClick={() => onSessionChange(null)}
            type="button"
          >
            Sign out
          </button>
        </div>
      </section>

      <section className="client-stat-grid">
        <PortalStat label="Portfolio health" value={String(dashboardQuery.data?.portfolioHealthScore ?? 0)} tone="brand" />
        <PortalStat label="Open actions" value={String(notifications.filter((item) => item.status === "OPEN").length)} tone="alert" />
        <PortalStat label="Expiring in 60 days" value={String(expiringSoon.length)} tone="warn" />
        <PortalStat label="Team members" value={String(users.length)} tone="neutral" />
      </section>

      <section className="client-grid client-grid-primary">
        <section className="client-card client-card-spacious">
          <div className="client-card-header">
            <div>
              <p className="eyebrow">Quick Actions</p>
              <h2>
                {composerView === "document"
                  ? "Register a new document"
                  : composerView === "entity"
                    ? "Add a legal entity"
                    : "Invite a teammate"}
              </h2>
            </div>
          </div>

          {composerView === "document" ? (
            <form
              className="client-form-grid client-form-grid-two"
              onSubmit={(event) => {
                event.preventDefault();
                documentMutation.mutate({
                  metadata: documentForm,
                  file: documentUploadFile,
                });
              }}
            >
              <label>
                Entity
                <select
                  onChange={(event) =>
                    setDocumentForm((current) => ({
                      ...current,
                      entityId: event.target.value,
                    }))
                  }
                  value={documentForm.entityId}
                >
                  {entities.map((entity) => (
                    <option key={entity.id} value={entity.id}>
                      {entity.entityName}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Document type
                <select
                  onChange={(event) =>
                    setDocumentForm((current) => ({
                      ...current,
                      documentTypeId: event.target.value,
                    }))
                  }
                  value={documentForm.documentTypeId}
                >
                  {documentTypes.map((documentType) => (
                    <option key={documentType.id} value={documentType.id}>
                      {documentType.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Title
                <input
                  onChange={(event) =>
                    setDocumentForm((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                  placeholder="Commercial Registration"
                  value={documentForm.title}
                />
              </label>
              <label>
                Reference number
                <input
                  onChange={(event) =>
                    setDocumentForm((current) => ({
                      ...current,
                      crNumber: event.target.value,
                    }))
                  }
                  value={documentForm.crNumber ?? ""}
                />
              </label>
              <label>
                Issue date
                <input
                  onChange={(event) =>
                    setDocumentForm((current) => ({
                      ...current,
                      issueDate: event.target.value,
                    }))
                  }
                  type="date"
                  value={documentForm.issueDate ?? ""}
                />
              </label>
              <label>
                Expiry date
                <input
                  onChange={(event) =>
                    setDocumentForm((current) => ({
                      ...current,
                      expiryDate: event.target.value,
                    }))
                  }
                  type="date"
                  value={documentForm.expiryDate ?? ""}
                />
              </label>
              <label className="client-form-span">
                Notes
                <textarea
                  onChange={(event) =>
                    setDocumentForm((current) => ({
                      ...current,
                      notes: event.target.value,
                    }))
                  }
                  rows={3}
                  value={documentForm.notes ?? ""}
                />
              </label>
              <label className="client-form-span">
                File
                <input
                  key={documentInputKey}
                  onChange={(event) =>
                    setDocumentUploadFile(event.target.files?.[0] ?? null)
                  }
                  type="file"
                />
              </label>
              <button
                className="primary-button client-form-span"
                disabled={documentMutation.isPending}
                type="submit"
              >
                {documentMutation.isPending ? "Saving..." : "Save document"}
              </button>
              {documentMutation.error ? (
                <p className="form-feedback error client-form-span">
                  {documentMutation.error.message}
                </p>
              ) : null}
            </form>
          ) : null}

          {composerView === "entity" ? (
            <form
              className="client-form-grid client-form-grid-two"
              onSubmit={(event) => {
                event.preventDefault();
                createEntityMutation.mutate(entityForm);
              }}
            >
              <label>
                Category
                <select
                  onChange={(event) =>
                    setEntityForm((current) => ({
                      ...current,
                      categoryId: event.target.value,
                    }))
                  }
                  value={entityForm.categoryId}
                >
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Type
                <select
                  onChange={(event) =>
                    setEntityForm((current) => ({
                      ...current,
                      entityType: event.target.value as CreateEntityInput["entityType"],
                    }))
                  }
                  value={entityForm.entityType}
                >
                  <option value="SUBSIDIARY">Subsidiary</option>
                  <option value="JV">Joint venture</option>
                  <option value="ASSOCIATE">Associate</option>
                  <option value="BRANCH">Branch</option>
                </select>
              </label>
              <label>
                Entity name
                <input
                  onChange={(event) =>
                    setEntityForm((current) => ({
                      ...current,
                      entityName: event.target.value,
                    }))
                  }
                  value={entityForm.entityName}
                />
              </label>
              <label>
                Entity code
                <input
                  onChange={(event) =>
                    setEntityForm((current) => ({
                      ...current,
                      entityCode: event.target.value,
                    }))
                  }
                  value={entityForm.entityCode}
                />
              </label>
              <label>
                Country
                <input
                  onChange={(event) =>
                    setEntityForm((current) => ({
                      ...current,
                      country: event.target.value,
                    }))
                  }
                  value={entityForm.country ?? ""}
                />
              </label>
              <label>
                Registration number
                <input
                  onChange={(event) =>
                    setEntityForm((current) => ({
                      ...current,
                      registrationNumber: event.target.value,
                    }))
                  }
                  value={entityForm.registrationNumber ?? ""}
                />
              </label>
              <button
                className="primary-button client-form-span"
                disabled={createEntityMutation.isPending}
                type="submit"
              >
                {createEntityMutation.isPending ? "Adding..." : "Add entity"}
              </button>
              {createEntityMutation.error ? (
                <p className="form-feedback error client-form-span">
                  {createEntityMutation.error.message}
                </p>
              ) : null}
            </form>
          ) : null}

          {composerView === "team" ? (
            <form
              className="client-form-grid client-form-grid-two"
              onSubmit={(event) => {
                event.preventDefault();
                inviteUserMutation.mutate(teamForm);
              }}
            >
              <label>
                Full name
                <input
                  onChange={(event) =>
                    setTeamForm((current) => ({
                      ...current,
                      fullName: event.target.value,
                    }))
                  }
                  value={teamForm.fullName}
                />
              </label>
              <label>
                Email
                <input
                  onChange={(event) =>
                    setTeamForm((current) => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
                  type="email"
                  value={teamForm.email}
                />
              </label>
              <label>
                Role
                <select
                  onChange={(event) =>
                    setTeamForm((current) => ({
                      ...current,
                      role: event.target.value as CreateUserInput["role"],
                    }))
                  }
                  value={teamForm.role}
                >
                  <option value="CLIENT_ADMIN">Client admin</option>
                  <option value="SUBSIDIARY_MANAGER">Subsidiary manager</option>
                  <option value="STAFF">Staff</option>
                </select>
              </label>
              <label>
                Department
                <input
                  onChange={(event) =>
                    setTeamForm((current) => ({
                      ...current,
                      department: event.target.value,
                    }))
                  }
                  value={teamForm.department ?? ""}
                />
              </label>
              <label className="client-form-span">
                Assign entities
                <select
                  multiple
                  onChange={(event) =>
                    setTeamForm((current) => ({
                      ...current,
                      entityIds: Array.from(event.target.selectedOptions).map(
                        (option) => option.value,
                      ),
                    }))
                  }
                  value={teamForm.entityIds ?? []}
                >
                  {entities.map((entity) => (
                    <option key={entity.id} value={entity.id}>
                      {entity.entityName}
                    </option>
                  ))}
                </select>
              </label>
              <button
                className="primary-button client-form-span"
                disabled={inviteUserMutation.isPending}
                type="submit"
              >
                {inviteUserMutation.isPending ? "Inviting..." : "Invite teammate"}
              </button>
              {inviteUserMutation.error ? (
                <p className="form-feedback error client-form-span">
                  {inviteUserMutation.error.message}
                </p>
              ) : null}
              {latestInvite ? (
                <div className="success-panel client-form-span">
                  <h4>Invite created</h4>
                  <p>
                    {latestInvite.email} can activate access before{" "}
                    {formatDateTime(latestInvite.expiresAt)}.
                  </p>
                  <p className="mono-line">{latestInvite.link}</p>
                </div>
              ) : null}
            </form>
          ) : null}
        </section>

        <section className="client-card">
          <div className="client-card-header">
            <div>
              <p className="eyebrow">Action Queue</p>
              <h2>What needs attention now</h2>
            </div>
          </div>
          <div className="client-list">
            {notifications.slice(0, 6).map((notification) => (
              <article className="client-list-row" key={notification.id}>
                <div>
                  <strong>{notification.title}</strong>
                  <p>{notification.message}</p>
                  <span className="client-list-meta">
                    {notification.entityName} · Due {formatDate(notification.dueDate)}
                  </span>
                </div>
                <div className="client-row-actions">
                  <span className={`client-state client-state-${notification.severity.toLowerCase()}`}>
                    {notification.severity}
                  </span>
                  <button
                    className="secondary-button"
                    disabled={acknowledgeMutation.isPending}
                    onClick={() => acknowledgeMutation.mutate(notification.id)}
                    type="button"
                  >
                    Acknowledge
                  </button>
                  <button
                    className="secondary-button"
                    disabled={resolveMutation.isPending}
                    onClick={() => resolveMutation.mutate(notification.id)}
                    type="button"
                  >
                    Resolve
                  </button>
                </div>
              </article>
            ))}
            {notifications.length === 0 ? (
              <div className="client-empty-state">
                No active alerts right now.
              </div>
            ) : null}
          </div>
        </section>
      </section>

      <section className="client-grid client-grid-secondary">
        <section className="client-card">
          <div className="client-card-header">
            <div>
              <p className="eyebrow">Upcoming Expiries</p>
              <h2>Documents approaching their deadline</h2>
            </div>
          </div>
          <div className="client-list client-list-tight">
            {expiringSoon.slice(0, 6).map((item) => (
              <article className="client-list-row client-list-row-compact" key={item.id}>
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.entityName}</p>
                </div>
                <div className="client-list-side">
                  <span>{item.documentTypeLabel}</span>
                  <strong>
                    {item.daysRemaining === null
                      ? "No deadline"
                      : `${item.daysRemaining} days`}
                  </strong>
                </div>
              </article>
            ))}
            {expiringSoon.length === 0 ? (
              <div className="client-empty-state">
                No document is expiring in the next 60 days.
              </div>
            ) : null}
          </div>
        </section>

        <section className="client-card">
          <div className="client-card-header">
            <div>
              <p className="eyebrow">Entity Map</p>
              <h2>Where your governance risk is concentrated</h2>
            </div>
          </div>
          <div className="client-entity-grid">
            {(dashboardQuery.data?.entities ?? []).slice(0, 8).map((entity) => (
              <article className="client-entity-card" key={entity.id}>
                <div className="client-entity-top">
                  <strong>{entity.entityName}</strong>
                  <span className="client-score">{entity.score}</span>
                </div>
                <p>{entity.entityType}</p>
                <div className="client-entity-meta">
                  <span>{entity.openAlerts} open alerts</span>
                  <span>{entity.gapCount} document gaps</span>
                </div>
              </article>
            ))}
            {(dashboardQuery.data?.entities ?? []).length === 0 ? (
              <div className="client-empty-state">
                Add your first entity to start structuring the portfolio.
              </div>
            ) : null}
          </div>
        </section>

        <section className="client-card">
          <div className="client-card-header">
            <div>
              <p className="eyebrow">Latest Records</p>
              <h2>Recent documents on file</h2>
            </div>
          </div>
          <div className="client-list client-list-tight">
            {documents.slice(0, 6).map((document) => (
              <article className="client-list-row client-list-row-compact" key={document.id}>
                <div>
                  <strong>{document.title}</strong>
                  <p>
                    {document.entityName} · {document.documentTypeLabel}
                  </p>
                </div>
                <div className="client-list-side">
                  <span className={`client-state client-state-${document.derivedStatus.toLowerCase()}`}>
                    {document.derivedStatus}
                  </span>
                  <span>{formatDate(document.expiryDate)}</span>
                </div>
              </article>
            ))}
            {documents.length === 0 ? (
              <div className="client-empty-state">
                No documents have been registered yet.
              </div>
            ) : null}
          </div>
        </section>

        <section className="client-card">
          <div className="client-card-header">
            <div>
              <p className="eyebrow">Team Access</p>
              <h2>People currently working in this workspace</h2>
            </div>
          </div>
          <div className="client-list client-list-tight">
            {users.slice(0, 6).map((user) => (
              <article className="client-list-row client-list-row-compact" key={user.id}>
                <div>
                  <strong>{user.fullName}</strong>
                  <p>
                    {user.role} · {user.email}
                  </p>
                </div>
                <div className="client-list-side">
                  <span>{user.openNotificationCount} open tasks</span>
                  <span className={`client-state client-state-${user.status.toLowerCase()}`}>
                    {user.status}
                  </span>
                </div>
              </article>
            ))}
            {users.length === 0 ? (
              <div className="client-empty-state">
                No teammates have been invited yet.
              </div>
            ) : null}
          </div>
        </section>
      </section>
    </div>
  );
}

function PortalStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "brand" | "alert" | "warn" | "neutral";
}) {
  return (
    <article className={`client-stat client-stat-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function formatDate(value: string | null) {
  if (!value) {
    return "No date";
  }

  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "No expiry";
  }

  return new Date(value).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
