import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  acknowledgeNotification,
  ApiError,
  beginMfaEnrollment,
  createUser,
  createEntity,
  createRule,
  deleteRule,
  escalateOverdueNotifications,
  fetchDashboardSummary,
  fetchDocuments,
  fetchDocumentTypes,
  fetchNotifications,
  fetchRules,
  fetchTaxonomy,
  fetchUsers,
  login,
  refreshGovernance,
  resetUserMfa,
  registerDocument,
  replaceDocumentFile,
  resolveNotification,
  toggleCriticalMaster,
  updateCategory,
  updateUser,
  uploadDocument,
  verifyTotpEnrollment,
  type AuthSession,
  type CreateUserInput,
  type CreateEntityInput,
  type MfaEnrollmentResponse,
  type RegisterDocumentInput,
  type RuleInput,
  type UpdateUserInput,
  type UsersResponse,
} from "../lib/api";

const sessionStorageKey = "vaxis.session";

function readSelectedValues(select: HTMLSelectElement) {
  return Array.from(select.selectedOptions).map((option) => option.value);
}

type WorkspacePageProps = {
  onSessionChange: (session: AuthSession | null) => void;
  session: AuthSession | null;
};

type UserDraft = {
  fullName: string;
  email: string;
  role: CreateUserInput["role"];
  status: "ACTIVE" | "LOCKED" | "DEACTIVATED";
  jobTitle: string;
  department: string;
  phone: string;
  supervisorUserId: string | null;
  entityIds: string[];
  mfaRequired: boolean;
};

function buildUserDraft(user: UsersResponse["users"][number]): UserDraft {
  return {
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    status: user.status,
    jobTitle: user.jobTitle ?? "",
    department: user.department ?? "",
    phone: user.phone ?? "",
    supervisorUserId: user.supervisorUserId,
    entityIds: user.assignedEntities.map((entity) => entity.id),
    mfaRequired: user.mfaRequired,
  };
}

export function WorkspacePage({
  onSessionChange,
  session,
}: WorkspacePageProps) {
  const queryClient = useQueryClient();
  const [loginForm, setLoginForm] = useState({
    tenantSlug: session?.tenant.slug ?? "zedan-group",
    email: session?.user.email ?? "admin@zedan.example",
    password: "ChangeThisNow!2026",
    mfaCode: "",
  });
  const [loginRequiresMfa, setLoginRequiresMfa] = useState(false);
  const [documentUploadFile, setDocumentUploadFile] = useState<File | null>(
    null,
  );
  const [documentFileInputKey, setDocumentFileInputKey] = useState(0);
  const [replacementFiles, setReplacementFiles] = useState<
    Record<string, File | null>
  >({});
  const [mfaEnrollment, setMfaEnrollment] = useState<
    MfaEnrollmentResponse["enrollment"] | null
  >(null);
  const [mfaVerificationCode, setMfaVerificationCode] = useState("");

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

  const [ruleForm, setRuleForm] = useState<RuleInput>({
    entityType: "SUBSIDIARY",
    documentTypeId: "",
    isMandatory: true,
    country: "",
  });
  const [userForm, setUserForm] = useState<CreateUserInput>({
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
  });
  const [userDrafts, setUserDrafts] = useState<Record<string, UserDraft>>({});

  const accessToken = session?.accessToken;
  const mfaSetupRequired = Boolean(
    session?.user.mfaRequired && !session.user.mfaEnabled,
  );

  const taxonomyQuery = useQuery({
    queryKey: ["workspace-taxonomy", accessToken],
    queryFn: () => fetchTaxonomy(accessToken!),
    enabled: Boolean(accessToken),
  });

  const documentTypesQuery = useQuery({
    queryKey: ["workspace-document-types", accessToken],
    queryFn: () => fetchDocumentTypes(accessToken!),
    enabled: Boolean(accessToken),
  });

  const documentsQuery = useQuery({
    queryKey: ["workspace-documents", accessToken],
    queryFn: () => fetchDocuments(accessToken!),
    enabled: Boolean(accessToken),
  });

  const dashboardQuery = useQuery({
    queryKey: ["workspace-dashboard", accessToken],
    queryFn: () => fetchDashboardSummary(accessToken!),
    enabled: Boolean(accessToken),
  });

  const rulesQuery = useQuery({
    queryKey: ["workspace-rules", accessToken],
    queryFn: () => fetchRules(accessToken!),
    enabled: Boolean(accessToken),
  });

  const notificationsQuery = useQuery({
    queryKey: ["workspace-notifications", accessToken],
    queryFn: () => fetchNotifications(accessToken!),
    enabled: Boolean(accessToken),
  });
  const usersQuery = useQuery({
    queryKey: ["workspace-users", accessToken],
    queryFn: () => fetchUsers(accessToken!),
    enabled: Boolean(accessToken),
  });

  const categories = taxonomyQuery.data?.categories ?? [];
  const allEntities = categories.flatMap((category) => category.entities);
  const workspaceUsers = usersQuery.data?.users ?? [];

  const [categoryEdits, setCategoryEdits] = useState<
    Record<
      string,
      {
        label: string;
        colorCode: string;
        description: string;
      }
    >
  >({});

  useEffect(() => {
    const nextEdits = Object.fromEntries(
      categories.map((category) => [
        category.id,
        {
          label: category.label,
          colorCode: category.colorCode ?? "#1B3A6B",
          description: category.description ?? "",
        },
      ]),
    );

    setCategoryEdits(nextEdits);

    if (!entityForm.categoryId && categories[0]) {
      setEntityForm((current) => ({
        ...current,
        categoryId: categories[0]?.id ?? "",
      }));
    }
  }, [categories, entityForm.categoryId]);

  useEffect(() => {
    if (!documentForm.entityId && allEntities[0]) {
      setDocumentForm((current) => ({
        ...current,
        entityId: allEntities[0]?.id ?? "",
      }));
    }
  }, [allEntities, documentForm.entityId]);

  useEffect(() => {
    if (
      !documentForm.documentTypeId &&
      documentTypesQuery.data?.documentTypes[0]
    ) {
      setDocumentForm((current) => ({
        ...current,
        documentTypeId: documentTypesQuery.data?.documentTypes[0]?.id ?? "",
      }));
    }
  }, [documentTypesQuery.data?.documentTypes, documentForm.documentTypeId]);

  useEffect(() => {
    if (!ruleForm.documentTypeId && documentTypesQuery.data?.documentTypes[0]) {
      setRuleForm((current) => ({
        ...current,
        documentTypeId: documentTypesQuery.data?.documentTypes[0]?.id ?? "",
      }));
    }
  }, [documentTypesQuery.data?.documentTypes, ruleForm.documentTypeId]);

  useEffect(() => {
    const nextDrafts = Object.fromEntries(
      workspaceUsers.map((user) => [user.id, buildUserDraft(user)]),
    );

    setUserDrafts(nextDrafts);
  }, [workspaceUsers]);

  function persistSession(nextSession: AuthSession | null) {
    if (nextSession) {
      localStorage.setItem(sessionStorageKey, JSON.stringify(nextSession));
    } else {
      localStorage.removeItem(sessionStorageKey);
    }

    onSessionChange(nextSession);
  }

  function updateSessionUser(nextUser: AuthSession["user"]) {
    if (!session) {
      return;
    }

    persistSession({
      ...session,
      user: nextUser,
    });
  }

  const loginMutation = useMutation({
    mutationFn: login,
    onSuccess: (nextSession) => {
      persistSession(nextSession);
      setLoginRequiresMfa(false);
      setLoginForm((current) => ({
        ...current,
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

  const refreshWorkspace = async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ["workspace-taxonomy", accessToken],
      }),
      queryClient.invalidateQueries({
        queryKey: ["workspace-document-types", accessToken],
      }),
      queryClient.invalidateQueries({
        queryKey: ["workspace-documents", accessToken],
      }),
      queryClient.invalidateQueries({
        queryKey: ["workspace-dashboard", accessToken],
      }),
      queryClient.invalidateQueries({
        queryKey: ["workspace-rules", accessToken],
      }),
      queryClient.invalidateQueries({
        queryKey: ["workspace-notifications", accessToken],
      }),
      queryClient.invalidateQueries({
        queryKey: ["workspace-users", accessToken],
      }),
    ]);
  };

  const categoryMutation = useMutation({
    mutationFn: (input: {
      categoryId: string;
      label: string;
      colorCode: string;
      description: string;
    }) =>
      updateCategory(accessToken!, input.categoryId, {
        label: input.label,
        colorCode: input.colorCode,
        description: input.description,
      }),
    onSuccess: refreshWorkspace,
  });

  const entityMutation = useMutation({
    mutationFn: (input: CreateEntityInput) => createEntity(accessToken!, input),
    onSuccess: async () => {
      await refreshWorkspace();
      setEntityForm((current) => ({
        ...current,
        entityName: "",
        entityCode: "",
        registrationNumber: "",
      }));
    },
  });

  const mfaEnrollmentMutation = useMutation({
    mutationFn: () => beginMfaEnrollment(accessToken!),
    onSuccess: (response) => {
      setMfaEnrollment(response.enrollment);
      setMfaVerificationCode("");
    },
  });

  const mfaVerificationMutation = useMutation({
    mutationFn: (code: string) => verifyTotpEnrollment(accessToken!, code),
    onSuccess: (response) => {
      updateSessionUser(response.user);
      setMfaVerificationCode("");
      setMfaEnrollment(null);
    },
  });

  const documentMutation = useMutation({
    mutationFn: (input: {
      metadata: RegisterDocumentInput;
      file: File | null;
    }) =>
      input.file
        ? uploadDocument(accessToken!, input.metadata, input.file)
        : registerDocument(accessToken!, input.metadata),
    onSuccess: async () => {
      await refreshWorkspace();
      setDocumentForm((current) => ({
        ...current,
        title: "",
        issueDate: "",
        expiryDate: "",
        crNumber: "",
        chamberNumber: "",
        companyIdentifier: "",
        notes: "",
        isCriticalMaster: false,
      }));
      setDocumentUploadFile(null);
      setDocumentFileInputKey((current) => current + 1);
    },
  });

  const replaceDocumentMutation = useMutation({
    mutationFn: (input: { documentId: string; file: File }) =>
      replaceDocumentFile(accessToken!, input.documentId, {}, input.file),
    onSuccess: async (_data, variables) => {
      await refreshWorkspace();
      setReplacementFiles((current) => ({
        ...current,
        [variables.documentId]: null,
      }));
    },
  });

  const criticalMasterMutation = useMutation({
    mutationFn: (input: { documentId: string; isCriticalMaster: boolean }) =>
      toggleCriticalMaster(
        accessToken!,
        input.documentId,
        input.isCriticalMaster,
      ),
    onSuccess: refreshWorkspace,
  });

  const ruleMutation = useMutation({
    mutationFn: (input: RuleInput) => createRule(accessToken!, input),
    onSuccess: async () => {
      await refreshWorkspace();
    },
  });

  const deleteRuleMutation = useMutation({
    mutationFn: (ruleId: string) => deleteRule(accessToken!, ruleId),
    onSuccess: refreshWorkspace,
  });

  const refreshGovernanceMutation = useMutation({
    mutationFn: () => refreshGovernance(accessToken!),
    onSuccess: refreshWorkspace,
  });

  const acknowledgeMutation = useMutation({
    mutationFn: (notificationId: string) =>
      acknowledgeNotification(accessToken!, notificationId),
    onSuccess: refreshWorkspace,
  });

  const resolveMutation = useMutation({
    mutationFn: (notificationId: string) =>
      resolveNotification(accessToken!, notificationId),
    onSuccess: refreshWorkspace,
  });
  const createUserMutation = useMutation({
    mutationFn: (input: CreateUserInput) => createUser(accessToken!, input),
    onSuccess: async () => {
      await refreshWorkspace();
      setUserForm({
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
      });
    },
  });
  const updateUserMutation = useMutation({
    mutationFn: (input: { userId: string; payload: UpdateUserInput }) =>
      updateUser(accessToken!, input.userId, input.payload),
    onSuccess: refreshWorkspace,
  });
  const resetUserMfaMutation = useMutation({
    mutationFn: (userId: string) => resetUserMfa(accessToken!, userId),
    onSuccess: refreshWorkspace,
  });
  const escalateNotificationsMutation = useMutation({
    mutationFn: () => escalateOverdueNotifications(accessToken!),
    onSuccess: refreshWorkspace,
  });

  if (!session) {
    const loginError = loginMutation.error;
    const showMfaField =
      loginRequiresMfa ||
      (loginError instanceof ApiError &&
        (loginError.code === "MFA_REQUIRED" ||
          loginError.code === "MFA_INVALID"));

    return (
      <div className="page-grid">
        <section className="card auth-card">
          <div className="card-header">
            <div>
              <p className="eyebrow">Workspace Access</p>
              <h3>Sign in to operate a tenant</h3>
            </div>
          </div>

          <form
            className="launch-form"
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

            {showMfaField ? (
              <label>
                Authenticator or backup code
                <input
                  onChange={(event) =>
                    setLoginForm((current) => ({
                      ...current,
                      mfaCode: event.target.value,
                    }))
                  }
                  placeholder="123456 or backup code"
                  value={loginForm.mfaCode}
                />
              </label>
            ) : null}

            {showMfaField ? (
              <div className="success-panel helper-panel">
                <h4>MFA challenge active</h4>
                <p>
                  This account already has MFA enabled. Enter the six-digit
                  authenticator code or one of the saved backup codes.
                </p>
              </div>
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
        </section>
      </div>
    );
  }

  return (
    <div className="page-grid workspace-grid">
      <section className="card workspace-header-card">
        <div className="workspace-header">
          <div>
            <p className="eyebrow">Tenant Workspace</p>
            <h3>{session.tenant.clientName}</h3>
            <p className="hero-body">
              Signed in as {session.user.fullName} ({session.user.role}).
            </p>
          </div>

          <button
            className="theme-toggle"
            onClick={() => {
              queryClient.clear();
              persistSession(null);
            }}
            type="button"
          >
            Sign out
          </button>
        </div>
      </section>

      {mfaSetupRequired ? (
        <section className="card workspace-header-card">
          <div className="card-header">
            <div>
              <p className="eyebrow">Identity Hardening</p>
              <h3>Complete MFA enrollment for this operator</h3>
            </div>
          </div>

          <div className="mfa-panel">
            <div className="mfa-copy">
              <p className="hero-body">
                This account is marked as MFA-required. Generate a TOTP setup,
                scan it into Google Authenticator, Microsoft Authenticator, or
                1Password, then verify the first code to lock in the tenant
                admin baseline.
              </p>

              <button
                className="primary-button"
                disabled={mfaEnrollmentMutation.isPending}
                onClick={() => mfaEnrollmentMutation.mutate()}
                type="button"
              >
                {mfaEnrollmentMutation.isPending
                  ? "Generating MFA setup..."
                  : mfaEnrollment
                    ? "Regenerate MFA setup"
                    : "Generate MFA setup"}
              </button>
            </div>

            {mfaEnrollment ? (
              <div className="mfa-setup-grid">
                <div className="mfa-qr-card">
                  <img
                    alt="Authenticator QR code for TOTP enrollment"
                    className="mfa-qr"
                    src={mfaEnrollment.qrDataUrl}
                  />
                </div>

                <div className="mfa-details">
                  <div className="success-panel helper-panel">
                    <h4>Manual entry key</h4>
                    <p className="mono-line">{mfaEnrollment.manualEntryKey}</p>
                  </div>

                  <div className="success-panel helper-panel">
                    <h4>Backup codes</h4>
                    <div className="backup-code-grid">
                      {mfaEnrollment.backupCodes.map((code) => (
                        <span className="code-chip" key={code}>
                          {code}
                        </span>
                      ))}
                    </div>
                  </div>

                  <form
                    className="launch-form"
                    onSubmit={(event) => {
                      event.preventDefault();
                      mfaVerificationMutation.mutate(mfaVerificationCode);
                    }}
                  >
                    <label>
                      Verify current authenticator code
                      <input
                        onChange={(event) =>
                          setMfaVerificationCode(event.target.value)
                        }
                        placeholder="123456"
                        value={mfaVerificationCode}
                      />
                    </label>

                    <button
                      className="secondary-button"
                      disabled={mfaVerificationMutation.isPending}
                      type="submit"
                    >
                      {mfaVerificationMutation.isPending
                        ? "Verifying..."
                        : "Enable MFA"}
                    </button>

                    {mfaVerificationMutation.error ? (
                      <p className="form-feedback error">
                        {mfaVerificationMutation.error.message}
                      </p>
                    ) : null}
                  </form>
                </div>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      <section className="card">
        <div className="card-header">
          <div>
            <p className="eyebrow">Portfolio Snapshot</p>
            <h3>Dashboard summary</h3>
          </div>
        </div>

        <div className="workspace-metrics">
          <MetricBox
            label="Portfolio health"
            value={String(dashboardQuery.data?.portfolioHealthScore ?? "--")}
          />
          <MetricBox
            label="Critical alerts"
            value={String(
              dashboardQuery.data?.notificationSummary.critical ?? 0,
            )}
          />
          <MetricBox
            label="Open tasks"
            value={String(dashboardQuery.data?.notificationSummary.open ?? 0)}
          />
          <MetricBox label="Entities" value={String(allEntities.length)} />
        </div>

        <div className="workspace-actions">
          <button
            className="secondary-button"
            disabled={refreshGovernanceMutation.isPending}
            onClick={() => refreshGovernanceMutation.mutate()}
            type="button"
          >
            {refreshGovernanceMutation.isPending
              ? "Refreshing governance..."
              : "Refresh governance state"}
          </button>
        </div>

        {refreshGovernanceMutation.data ? (
          <div className="success-panel">
            <h4>{refreshGovernanceMutation.data.message}</h4>
            <p>
              Refreshed {refreshGovernanceMutation.data.entityCount} entity risk
              profiles and escalated{" "}
              {refreshGovernanceMutation.data.escalatedNotifications} overdue
              notification(s).
            </p>
          </div>
        ) : null}

        <div className="workspace-table">
          {(dashboardQuery.data?.entities ?? []).map((entity) => (
            <div className="workspace-row" key={entity.id}>
              <strong>{entity.entityName}</strong>
              <span>{entity.entityCode}</span>
              <span>Score {entity.score}</span>
              <span>{entity.openAlerts} alerts</span>
              <span>{entity.gapCount} gaps</span>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <div className="card-header">
          <div>
            <p className="eyebrow">Taxonomy Control</p>
            <h3>Rename category slots and tune the tenant map</h3>
          </div>
        </div>

        <div className="category-editor-grid">
          {categories.map((category) => (
            <article className="category-editor-card" key={category.id}>
              <div className="category-editor-top">
                <span className="code-chip">
                  Slot {String(category.slotNumber).padStart(2, "0")}
                </span>
                <span className="meta-pill">
                  {category.entities.length} entities
                </span>
              </div>

              <label>
                Label
                <input
                  onChange={(event) =>
                    setCategoryEdits((current) => {
                      const previous = current[category.id] ?? {
                        label: category.label,
                        colorCode: category.colorCode ?? "#1B3A6B",
                        description: category.description ?? "",
                      };

                      return {
                        ...current,
                        [category.id]: {
                          ...previous,
                          label: event.target.value,
                        },
                      };
                    })
                  }
                  value={categoryEdits[category.id]?.label ?? category.label}
                />
              </label>

              <label>
                Color
                <input
                  onChange={(event) =>
                    setCategoryEdits((current) => {
                      const previous = current[category.id] ?? {
                        label: category.label,
                        colorCode: category.colorCode ?? "#1B3A6B",
                        description: category.description ?? "",
                      };

                      return {
                        ...current,
                        [category.id]: {
                          ...previous,
                          colorCode: event.target.value,
                        },
                      };
                    })
                  }
                  value={categoryEdits[category.id]?.colorCode ?? "#1B3A6B"}
                />
              </label>

              <label>
                Description
                <input
                  onChange={(event) =>
                    setCategoryEdits((current) => {
                      const previous = current[category.id] ?? {
                        label: category.label,
                        colorCode: category.colorCode ?? "#1B3A6B",
                        description: category.description ?? "",
                      };

                      return {
                        ...current,
                        [category.id]: {
                          ...previous,
                          description: event.target.value,
                        },
                      };
                    })
                  }
                  value={categoryEdits[category.id]?.description ?? ""}
                />
              </label>

              <button
                className="secondary-button"
                disabled={categoryMutation.isPending}
                onClick={() => {
                  const edit = categoryEdits[category.id];

                  if (!edit) {
                    return;
                  }

                  categoryMutation.mutate({
                    categoryId: category.id,
                    label: edit.label,
                    colorCode: edit.colorCode,
                    description: edit.description,
                  });
                }}
                type="button"
              >
                Save category
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="card">
        <div className="card-header">
          <div>
            <p className="eyebrow">Entity Builder</p>
            <h3>Add subsidiaries and business units</h3>
          </div>
        </div>

        <form
          className="launch-form"
          onSubmit={(event) => {
            event.preventDefault();
            entityMutation.mutate(entityForm);
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
                  entityCode: event.target.value.toUpperCase(),
                }))
              }
              value={entityForm.entityCode}
            />
          </label>

          <label>
            Entity type
            <select
              onChange={(event) =>
                setEntityForm((current) => ({
                  ...current,
                  entityType: event.target
                    .value as CreateEntityInput["entityType"],
                }))
              }
              value={entityForm.entityType}
            >
              <option value="SUBSIDIARY">Subsidiary</option>
              <option value="JV">JV</option>
              <option value="ASSOCIATE">Associate</option>
              <option value="BRANCH">Branch</option>
            </select>
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
            className="primary-button"
            disabled={entityMutation.isPending}
            type="submit"
          >
            {entityMutation.isPending ? "Adding entity..." : "Create entity"}
          </button>

          {entityMutation.error ? (
            <p className="form-feedback error">
              {entityMutation.error.message}
            </p>
          ) : null}
        </form>
      </section>

      <section className="card workspace-header-card">
        <div className="card-header">
          <div>
            <p className="eyebrow">Team and Ownership</p>
            <h3>Assign responsibility before alerts need to escalate</h3>
          </div>
        </div>

        <div className="team-admin-grid">
          <form
            className="launch-form"
            onSubmit={(event) => {
              event.preventDefault();
              createUserMutation.mutate(userForm);
            }}
          >
            <label>
              Full name
              <input
                onChange={(event) =>
                  setUserForm((current) => ({
                    ...current,
                    fullName: event.target.value,
                  }))
                }
                value={userForm.fullName}
              />
            </label>

            <label>
              Email
              <input
                onChange={(event) =>
                  setUserForm((current) => ({
                    ...current,
                    email: event.target.value,
                  }))
                }
                type="email"
                value={userForm.email}
              />
            </label>

            <label>
              Temporary password
              <input
                onChange={(event) =>
                  setUserForm((current) => ({
                    ...current,
                    password: event.target.value,
                  }))
                }
                type="password"
                value={userForm.password}
              />
            </label>

            <label>
              Role
              <select
                onChange={(event) =>
                  setUserForm((current) => ({
                    ...current,
                    role: event.target.value as CreateUserInput["role"],
                  }))
                }
                value={userForm.role}
              >
                <option value="CLIENT_ADMIN">Client admin</option>
                <option value="SUBSIDIARY_MANAGER">Subsidiary manager</option>
                <option value="STAFF">Staff</option>
              </select>
            </label>

            <label>
              Job title
              <input
                onChange={(event) =>
                  setUserForm((current) => ({
                    ...current,
                    jobTitle: event.target.value,
                  }))
                }
                value={userForm.jobTitle ?? ""}
              />
            </label>

            <label>
              Supervisor
              <select
                onChange={(event) =>
                  setUserForm((current) => ({
                    ...current,
                    supervisorUserId: event.target.value || null,
                  }))
                }
                value={userForm.supervisorUserId ?? ""}
              >
                <option value="">No supervisor</option>
                {workspaceUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.fullName} ({user.role})
                  </option>
                ))}
              </select>
            </label>

            <label>
              Entity assignments
              <select
                multiple
                onChange={(event) =>
                  setUserForm((current) => ({
                    ...current,
                    entityIds: readSelectedValues(event.target),
                  }))
                }
                size={Math.min(Math.max(allEntities.length, 2), 6)}
                value={userForm.entityIds ?? []}
              >
                {allEntities.map((entity) => (
                  <option key={entity.id} value={entity.id}>
                    {entity.entityName} ({entity.entityCode})
                  </option>
                ))}
              </select>
            </label>

            <label className="checkbox-row">
              <input
                checked={Boolean(userForm.mfaRequired)}
                onChange={(event) =>
                  setUserForm((current) => ({
                    ...current,
                    mfaRequired: event.target.checked,
                  }))
                }
                type="checkbox"
              />
              Force MFA enrollment
            </label>

            <button
              className="primary-button"
              disabled={createUserMutation.isPending}
              type="submit"
            >
              {createUserMutation.isPending
                ? "Creating user..."
                : "Create user"}
            </button>

            {createUserMutation.error ? (
              <p className="form-feedback error">
                {createUserMutation.error.message}
              </p>
            ) : null}
          </form>

          <div className="user-admin-list">
            {workspaceUsers.map((user) => {
              const draft = userDrafts[user.id] ?? buildUserDraft(user);

              return (
                <article className="user-admin-card" key={user.id}>
                  <div className="category-editor-top">
                    <div>
                      <strong>{user.fullName}</strong>
                      <p className="helper-copy">
                        {user.role} - {user.openNotificationCount} open tasks
                      </p>
                    </div>
                    <span className="meta-pill">
                      {user.mfaEnabled ? "MFA enabled" : "MFA pending"}
                    </span>
                  </div>

                  <div className="user-admin-fields">
                    <label>
                      Full name
                      <input
                        onChange={(event) =>
                          setUserDrafts((current) => ({
                            ...current,
                            [user.id]: {
                              ...draft,
                              fullName: event.target.value,
                            },
                          }))
                        }
                        value={draft.fullName ?? ""}
                      />
                    </label>

                    <label>
                      Email
                      <input
                        onChange={(event) =>
                          setUserDrafts((current) => ({
                            ...current,
                            [user.id]: {
                              ...draft,
                              email: event.target.value,
                            },
                          }))
                        }
                        type="email"
                        value={draft.email ?? ""}
                      />
                    </label>

                    <label>
                      Role
                      <select
                        onChange={(event) =>
                          setUserDrafts((current) => ({
                            ...current,
                            [user.id]: {
                              ...draft,
                              role: event.target.value as UserDraft["role"],
                            },
                          }))
                        }
                        value={draft.role ?? user.role}
                      >
                        <option value="CLIENT_ADMIN">Client admin</option>
                        <option value="SUBSIDIARY_MANAGER">
                          Subsidiary manager
                        </option>
                        <option value="STAFF">Staff</option>
                      </select>
                    </label>

                    <label>
                      Status
                      <select
                        onChange={(event) =>
                          setUserDrafts((current) => ({
                            ...current,
                            [user.id]: {
                              ...draft,
                              status: event.target.value as UserDraft["status"],
                            },
                          }))
                        }
                        value={draft.status ?? user.status}
                      >
                        <option value="ACTIVE">Active</option>
                        <option value="LOCKED">Locked</option>
                        <option value="DEACTIVATED">Deactivated</option>
                      </select>
                    </label>

                    <label>
                      Supervisor
                      <select
                        onChange={(event) =>
                          setUserDrafts((current) => ({
                            ...current,
                            [user.id]: {
                              ...draft,
                              supervisorUserId: event.target.value || null,
                            },
                          }))
                        }
                        value={draft.supervisorUserId ?? ""}
                      >
                        <option value="">No supervisor</option>
                        {workspaceUsers
                          .filter((candidate) => candidate.id !== user.id)
                          .map((candidate) => (
                            <option key={candidate.id} value={candidate.id}>
                              {candidate.fullName}
                            </option>
                          ))}
                      </select>
                    </label>

                    <label>
                      Entity assignments
                      <select
                        multiple
                        onChange={(event) =>
                          setUserDrafts((current) => ({
                            ...current,
                            [user.id]: {
                              ...draft,
                              entityIds: readSelectedValues(event.target),
                            },
                          }))
                        }
                        size={Math.min(Math.max(allEntities.length, 2), 5)}
                        value={draft.entityIds ?? []}
                      >
                        {allEntities.map((entity) => (
                          <option key={entity.id} value={entity.id}>
                            {entity.entityName} ({entity.entityCode})
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="checkbox-row">
                      <input
                        checked={Boolean(draft.mfaRequired)}
                        onChange={(event) =>
                          setUserDrafts((current) => ({
                            ...current,
                            [user.id]: {
                              ...draft,
                              mfaRequired: event.target.checked,
                            },
                          }))
                        }
                        type="checkbox"
                      />
                      MFA required
                    </label>
                  </div>

                  <div className="user-admin-summary">
                    <span>
                      Assignments:{" "}
                      {user.assignedEntities.length > 0
                        ? user.assignedEntities
                            .map((entity) => entity.entityCode)
                            .join(", ")
                        : "None"}
                    </span>
                    <span>
                      Supervisor: {user.supervisorName ?? "Not assigned"}
                    </span>
                    <span>Last login: {formatDateTime(user.lastLoginAt)}</span>
                  </div>

                  <div className="workspace-row-actions workspace-row-actions-wrap">
                    <button
                      className="secondary-button"
                      disabled={updateUserMutation.isPending}
                      onClick={() =>
                        updateUserMutation.mutate({
                          userId: user.id,
                          payload: draft,
                        })
                      }
                      type="button"
                    >
                      Save user
                    </button>
                    <button
                      className="secondary-button"
                      disabled={resetUserMfaMutation.isPending}
                      onClick={() => resetUserMfaMutation.mutate(user.id)}
                      type="button"
                    >
                      Reset MFA
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        {updateUserMutation.error ? (
          <p className="form-feedback error">
            {updateUserMutation.error.message}
          </p>
        ) : null}

        {resetUserMfaMutation.error ? (
          <p className="form-feedback error">
            {resetUserMfaMutation.error.message}
          </p>
        ) : null}
      </section>

      <section className="card">
        <div className="card-header">
          <div>
            <p className="eyebrow">Document Rules</p>
            <h3>Define what each entity type must maintain</h3>
          </div>
        </div>

        <form
          className="launch-form"
          onSubmit={(event) => {
            event.preventDefault();
            ruleMutation.mutate({
              ...ruleForm,
              country: ruleForm.country?.trim() ? ruleForm.country : null,
            });
          }}
        >
          <label>
            Entity type
            <select
              onChange={(event) =>
                setRuleForm((current) => ({
                  ...current,
                  entityType: event.target.value as RuleInput["entityType"],
                }))
              }
              value={ruleForm.entityType}
            >
              <option value="SUBSIDIARY">Subsidiary</option>
              <option value="JV">JV</option>
              <option value="ASSOCIATE">Associate</option>
              <option value="BRANCH">Branch</option>
            </select>
          </label>

          <label>
            Document type
            <select
              onChange={(event) =>
                setRuleForm((current) => ({
                  ...current,
                  documentTypeId: event.target.value,
                }))
              }
              value={ruleForm.documentTypeId}
            >
              {(documentTypesQuery.data?.documentTypes ?? []).map(
                (documentType) => (
                  <option key={documentType.id} value={documentType.id}>
                    #{documentType.code} {documentType.label}
                  </option>
                ),
              )}
            </select>
          </label>

          <label>
            Country override
            <input
              onChange={(event) =>
                setRuleForm((current) => ({
                  ...current,
                  country: event.target.value,
                }))
              }
              placeholder="Leave blank for all countries"
              value={ruleForm.country ?? ""}
            />
          </label>

          <label className="checkbox-row">
            <input
              checked={ruleForm.isMandatory}
              onChange={(event) =>
                setRuleForm((current) => ({
                  ...current,
                  isMandatory: event.target.checked,
                }))
              }
              type="checkbox"
            />
            Mandatory rule
          </label>

          <button
            className="primary-button"
            disabled={ruleMutation.isPending}
            type="submit"
          >
            {ruleMutation.isPending ? "Creating rule..." : "Create rule"}
          </button>

          {ruleMutation.error ? (
            <p className="form-feedback error">{ruleMutation.error.message}</p>
          ) : null}
        </form>

        <div className="workspace-table">
          {(rulesQuery.data?.rules ?? []).map((rule) => (
            <div className="workspace-row workspace-row-tight" key={rule.id}>
              <strong>{rule.documentTypeLabel}</strong>
              <span>{rule.entityType}</span>
              <span>{rule.documentSector}</span>
              <span>{rule.isMandatory ? "Mandatory" : "Optional"}</span>
              <button
                className="secondary-button"
                disabled={deleteRuleMutation.isPending}
                onClick={() => deleteRuleMutation.mutate(rule.id)}
                type="button"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <div className="card-header">
          <div>
            <p className="eyebrow">Document Intake</p>
            <h3>Register metadata now and store files directly in the vault</h3>
          </div>
        </div>

        <form
          className="launch-form"
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
              {allEntities.map((entity) => (
                <option key={entity.id} value={entity.id}>
                  {entity.entityName} ({entity.entityCode})
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
              {(documentTypesQuery.data?.documentTypes ?? []).map(
                (documentType) => (
                  <option key={documentType.id} value={documentType.id}>
                    #{documentType.code} {documentType.label}
                  </option>
                ),
              )}
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
              value={documentForm.title}
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

          <label>
            CR number
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
            Upload file
            <input
              key={documentFileInputKey}
              onChange={(event) =>
                setDocumentUploadFile(event.target.files?.[0] ?? null)
              }
              type="file"
            />
          </label>

          {documentUploadFile ? (
            <p className="helper-copy">
              Selected file: {documentUploadFile.name}
            </p>
          ) : (
            <p className="helper-copy">
              Leave the file empty to register the record first and upload
              later.
            </p>
          )}

          <label>
            Notes
            <input
              onChange={(event) =>
                setDocumentForm((current) => ({
                  ...current,
                  notes: event.target.value,
                }))
              }
              value={documentForm.notes ?? ""}
            />
          </label>

          <label className="checkbox-row">
            <input
              checked={Boolean(documentForm.isCriticalMaster)}
              onChange={(event) =>
                setDocumentForm((current) => ({
                  ...current,
                  isCriticalMaster: event.target.checked,
                }))
              }
              type="checkbox"
            />
            Mark as critical master
          </label>

          <button
            className="primary-button"
            disabled={documentMutation.isPending}
            type="submit"
          >
            {documentMutation.isPending
              ? "Processing intake..."
              : documentUploadFile
                ? "Upload document to vault"
                : "Register metadata-only document"}
          </button>

          {documentMutation.data ? (
            <div className="success-panel">
              <h4>{documentMutation.data.message}</h4>
              <p>
                {documentMutation.data.document.dnaCode} created with updated
                risk score {documentMutation.data.riskSnapshot.score}.
              </p>
            </div>
          ) : null}

          {documentMutation.error ? (
            <p className="form-feedback error">
              {documentMutation.error.message}
            </p>
          ) : null}
        </form>
      </section>

      <section className="card workspace-header-card">
        <div className="card-header">
          <div>
            <p className="eyebrow">Registered Documents</p>
            <h3>Live inventory with vault versioning controls</h3>
          </div>
        </div>

        <div className="workspace-table">
          {(documentsQuery.data?.documents ?? []).map((document) => (
            <div
              className="workspace-row workspace-row-document"
              key={document.id}
            >
              <div>
                <strong>{document.dnaCode}</strong>
                <p className="helper-copy">
                  {document.documentTypeLabel} -{" "}
                  {document.isCriticalMaster
                    ? "Critical master"
                    : "Standard record"}
                </p>
              </div>
              <span>{document.title}</span>
              <span>{document.entityName}</span>
              <span>{document.derivedStatus}</span>
              <span>
                {document.daysRemaining === null
                  ? "No expiry"
                  : `${document.daysRemaining} days`}
              </span>
              <span>
                {document.filePath
                  ? `Vault v${document.latestVersionNumber}`
                  : "Metadata only"}
              </span>
              <div className="workspace-row-actions workspace-row-actions-wrap">
                <label className="inline-file-field">
                  <span>
                    {replacementFiles[document.id]?.name ??
                      "Choose replacement"}
                  </span>
                  <input
                    onChange={(event) =>
                      setReplacementFiles((current) => ({
                        ...current,
                        [document.id]: event.target.files?.[0] ?? null,
                      }))
                    }
                    type="file"
                  />
                </label>
                <button
                  className="secondary-button"
                  disabled={
                    replaceDocumentMutation.isPending ||
                    !replacementFiles[document.id]
                  }
                  onClick={() => {
                    const nextFile = replacementFiles[document.id];

                    if (!nextFile) {
                      return;
                    }

                    replaceDocumentMutation.mutate({
                      documentId: document.id,
                      file: nextFile,
                    });
                  }}
                  type="button"
                >
                  Upload version
                </button>
                <button
                  className="secondary-button"
                  disabled={criticalMasterMutation.isPending}
                  onClick={() =>
                    criticalMasterMutation.mutate({
                      documentId: document.id,
                      isCriticalMaster: !document.isCriticalMaster,
                    })
                  }
                  type="button"
                >
                  {document.isCriticalMaster
                    ? "Unset critical"
                    : "Mark critical"}
                </button>
              </div>
            </div>
          ))}
        </div>

        {replaceDocumentMutation.error ? (
          <p className="form-feedback error">
            {replaceDocumentMutation.error.message}
          </p>
        ) : null}

        {criticalMasterMutation.error ? (
          <p className="form-feedback error">
            {criticalMasterMutation.error.message}
          </p>
        ) : null}
      </section>

      <section className="card">
        <div className="card-header">
          <div>
            <p className="eyebrow">Notification Queue</p>
            <h3>Durable governance tasks</h3>
          </div>
        </div>

        <div className="workspace-actions">
          <button
            className="secondary-button"
            disabled={escalateNotificationsMutation.isPending}
            onClick={() => escalateNotificationsMutation.mutate()}
            type="button"
          >
            {escalateNotificationsMutation.isPending
              ? "Escalating..."
              : "Escalate overdue notifications"}
          </button>
        </div>

        <div className="workspace-table">
          {(notificationsQuery.data?.notifications ?? []).map(
            (notification) => (
              <div
                className="workspace-row workspace-row-notification"
                key={notification.id}
              >
                <div>
                  <strong>{notification.title}</strong>
                  <p className="helper-copy">{notification.message}</p>
                </div>
                <span>{notification.entityName}</span>
                <span>
                  {notification.assignedToName
                    ? `${notification.assignedToName} (${notification.assignedToEmail})`
                    : "Unassigned"}
                </span>
                <span>{notification.severity}</span>
                <span>{notification.status}</span>
                <span>
                  Due {formatDate(notification.dueDate)} / L
                  {notification.escalationLevel}
                </span>
                <div className="workspace-row-actions">
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
              </div>
            ),
          )}
        </div>

        {escalateNotificationsMutation.data ? (
          <div className="success-panel">
            <h4>{escalateNotificationsMutation.data.message}</h4>
            <p>
              {escalateNotificationsMutation.data.escalatedNotifications}{" "}
              notification(s) were escalated in the latest pass.
            </p>
          </div>
        ) : null}

        {escalateNotificationsMutation.error ? (
          <p className="form-feedback error">
            {escalateNotificationsMutation.error.message}
          </p>
        ) : null}
      </section>
    </div>
  );
}

function formatDate(value: string | null) {
  if (!value) {
    return "none";
  }

  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "No login yet";
  }

  return new Date(value).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function MetricBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function loadStoredSession() {
  const raw = localStorage.getItem(sessionStorageKey);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    localStorage.removeItem(sessionStorageKey);
    return null;
  }
}
