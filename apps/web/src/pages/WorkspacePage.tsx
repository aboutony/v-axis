import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  acknowledgeNotification,
  createRule,
  createEntity,
  deleteRule,
  fetchDashboardSummary,
  fetchDocuments,
  fetchDocumentTypes,
  fetchNotifications,
  fetchRules,
  fetchTaxonomy,
  login,
  refreshGovernance,
  registerDocument,
  resolveNotification,
  updateCategory,
  type AuthSession,
  type CreateEntityInput,
  type RegisterDocumentInput,
  type RuleInput,
} from "../lib/api";

const sessionStorageKey = "vaxis.session";

type WorkspacePageProps = {
  onSessionChange: (session: AuthSession | null) => void;
  session: AuthSession | null;
};

export function WorkspacePage({ onSessionChange, session }: WorkspacePageProps) {
  const queryClient = useQueryClient();
  const [loginForm, setLoginForm] = useState({
    tenantSlug: session?.tenant.slug ?? "zedan-group",
    email: session?.user.email ?? "admin@zedan.example",
    password: "ChangeThisNow!2026",
  });

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

  const accessToken = session?.accessToken;

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

  const categories = taxonomyQuery.data?.categories ?? [];
  const allEntities = categories.flatMap((category) => category.entities);

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
    if (!documentForm.documentTypeId && documentTypesQuery.data?.documentTypes[0]) {
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

  const loginMutation = useMutation({
    mutationFn: login,
    onSuccess: (nextSession) => {
      localStorage.setItem(sessionStorageKey, JSON.stringify(nextSession));
      onSessionChange(nextSession);
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

  const documentMutation = useMutation({
    mutationFn: (input: RegisterDocumentInput) =>
      registerDocument(accessToken!, input),
    onSuccess: async () => {
      await refreshWorkspace();
      setDocumentForm((current) => ({
        ...current,
        title: "",
        issueDate: "",
        expiryDate: "",
        crNumber: "",
        notes: "",
      }));
    },
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

  if (!session) {
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

            <button
              className="primary-button"
              disabled={loginMutation.isPending}
              type="submit"
            >
              {loginMutation.isPending ? "Signing in..." : "Enter workspace"}
            </button>

            {loginMutation.error ? (
              <p className="form-feedback error">{loginMutation.error.message}</p>
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
              localStorage.removeItem(sessionStorageKey);
              onSessionChange(null);
            }}
            type="button"
          >
            Sign out
          </button>
        </div>
      </section>

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
            value={String(dashboardQuery.data?.notificationSummary.critical ?? 0)}
          />
          <MetricBox
            label="Open tasks"
            value={String(dashboardQuery.data?.notificationSummary.open ?? 0)}
          />
          <MetricBox
            label="Entities"
            value={String(allEntities.length)}
          />
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
                <span className="meta-pill">{category.entities.length} entities</span>
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
                  entityType: event.target.value as CreateEntityInput["entityType"],
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
            <p className="form-feedback error">{entityMutation.error.message}</p>
          ) : null}
        </form>
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
              {(documentTypesQuery.data?.documentTypes ?? []).map((documentType) => (
                <option key={documentType.id} value={documentType.id}>
                  #{documentType.code} {documentType.label}
                </option>
              ))}
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

          <button className="primary-button" disabled={ruleMutation.isPending} type="submit">
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
            <h3>Register compliance records with DNA-code generation</h3>
          </div>
        </div>

        <form
          className="launch-form"
          onSubmit={(event) => {
            event.preventDefault();
            documentMutation.mutate(documentForm);
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
              {(documentTypesQuery.data?.documentTypes ?? []).map((documentType) => (
                <option key={documentType.id} value={documentType.id}>
                  #{documentType.code} {documentType.label}
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
            File path
            <input
              onChange={(event) =>
                setDocumentForm((current) => ({
                  ...current,
                  filePath: event.target.value,
                }))
              }
              placeholder="vault/tenant/entity/file.pdf"
              value={documentForm.filePath ?? ""}
            />
          </label>

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

          <button
            className="primary-button"
            disabled={documentMutation.isPending}
            type="submit"
          >
            {documentMutation.isPending ? "Registering..." : "Register document"}
          </button>

          {documentMutation.data ? (
            <div className="success-panel">
              <h4>{documentMutation.data.message}</h4>
              <p>
                {documentMutation.data.document.dnaCode} created with updated risk
                score {documentMutation.data.riskSnapshot.score}.
              </p>
            </div>
          ) : null}

          {documentMutation.error ? (
            <p className="form-feedback error">{documentMutation.error.message}</p>
          ) : null}
        </form>
      </section>

      <section className="card">
        <div className="card-header">
          <div>
            <p className="eyebrow">Registered Documents</p>
            <h3>Live record inventory</h3>
          </div>
        </div>

        <div className="workspace-table">
          {(documentsQuery.data?.documents ?? []).map((document) => (
            <div className="workspace-row" key={document.id}>
              <strong>{document.dnaCode}</strong>
              <span>{document.title}</span>
              <span>{document.entityName}</span>
              <span>{document.derivedStatus}</span>
              <span>
                {document.daysRemaining === null
                  ? "No expiry"
                  : `${document.daysRemaining} days`}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <div className="card-header">
          <div>
            <p className="eyebrow">Notification Queue</p>
            <h3>Durable governance tasks</h3>
          </div>
        </div>

        <div className="workspace-table">
          {(notificationsQuery.data?.notifications ?? []).map((notification) => (
            <div className="workspace-row workspace-row-notification" key={notification.id}>
              <strong>{notification.title}</strong>
              <span>{notification.entityName}</span>
              <span>{notification.severity}</span>
              <span>{notification.status}</span>
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
          ))}
        </div>
      </section>
    </div>
  );
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
