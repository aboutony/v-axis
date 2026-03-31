import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";

import {
  acceptInvite,
  ApiError,
  confirmPasswordReset,
  fetchAuthActionStatus,
} from "../lib/api";

export function AccessPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const actionQuery = useQuery({
    queryKey: ["access-action", token],
    queryFn: () => fetchAuthActionStatus(token),
    enabled: token.length > 0,
    retry: false,
  });

  const inviteMutation = useMutation({
    mutationFn: (input: { token: string; fullName?: string; password: string }) =>
      acceptInvite(input),
  });

  const passwordResetMutation = useMutation({
    mutationFn: (input: { token: string; password: string }) =>
      confirmPasswordReset(input),
  });

  const activeMutation =
    actionQuery.data?.purpose === "INVITE"
      ? inviteMutation
      : passwordResetMutation;

  const validationError =
    password && confirmPassword && password !== confirmPassword
      ? "Password confirmation does not match."
      : null;

  if (!token) {
    return (
      <div className="page-grid access-grid">
        <section className="card auth-card">
          <div className="card-header">
            <div>
              <p className="eyebrow">Access Link</p>
              <h3>Missing token</h3>
            </div>
          </div>
          <p className="hero-body">
            This page needs a valid invite or password-reset link.
          </p>
          <Link className="secondary-button link-button" to="/workspace">
            Return to workspace
          </Link>
        </section>
      </div>
    );
  }

  return (
    <div className="page-grid access-grid">
      <section className="card auth-card">
        <div className="card-header">
          <div>
            <p className="eyebrow">Secure Access</p>
            <h3>
              {actionQuery.data?.purpose === "PASSWORD_RESET"
                ? "Reset your password"
                : "Activate your workspace access"}
            </h3>
          </div>
        </div>

        {actionQuery.isLoading ? (
          <p className="hero-body">Validating access link...</p>
        ) : actionQuery.error ? (
          <div className="success-panel helper-panel">
            <h4>Link unavailable</h4>
            <p>
              {actionQuery.error instanceof Error
                ? actionQuery.error.message
                : "This access link is no longer valid."}
            </p>
          </div>
        ) : actionQuery.data ? (
          <form
            className="launch-form"
            onSubmit={(event) => {
              event.preventDefault();

              if (validationError) {
                return;
              }

              if (actionQuery.data.purpose === "INVITE") {
                inviteMutation.mutate({
                  token,
                  fullName: fullName.trim() || actionQuery.data.user.fullName,
                  password,
                });
                return;
              }

              passwordResetMutation.mutate({
                token,
                password,
              });
            }}
          >
            <div className="success-panel helper-panel">
              <h4>{actionQuery.data.tenant.clientName}</h4>
              <p>
                {actionQuery.data.user.email} for tenant slug{" "}
                <strong>{actionQuery.data.tenant.slug}</strong>.
              </p>
              <p>Link expires {formatDateTime(actionQuery.data.expiresAt)}.</p>
            </div>

            {actionQuery.data.purpose === "INVITE" ? (
              <label>
                Full name
                <input
                  onChange={(event) => setFullName(event.target.value)}
                  placeholder={actionQuery.data.user.fullName}
                  value={fullName}
                />
              </label>
            ) : null}

            <label>
              New password
              <input
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                value={password}
              />
            </label>

            <label>
              Confirm password
              <input
                onChange={(event) => setConfirmPassword(event.target.value)}
                type="password"
                value={confirmPassword}
              />
            </label>

            <button
              className="primary-button"
              disabled={activeMutation.isPending || Boolean(validationError)}
              type="submit"
            >
              {activeMutation.isPending
                ? "Submitting..."
                : actionQuery.data.purpose === "INVITE"
                  ? "Activate account"
                  : "Save new password"}
            </button>

            {validationError ? (
              <p className="form-feedback error">{validationError}</p>
            ) : null}

            {activeMutation.error ? (
              <p className="form-feedback error">
                {activeMutation.error instanceof ApiError ||
                activeMutation.error instanceof Error
                  ? activeMutation.error.message
                  : "Unable to complete this access request."}
              </p>
            ) : null}

            {activeMutation.data ? (
              <div className="success-panel">
                <h4>{activeMutation.data.message}</h4>
                <p>
                  Continue to the workspace and sign in as{" "}
                  <strong>{activeMutation.data.user.email}</strong>.
                </p>
                <Link className="secondary-button link-button" to="/workspace">
                  Go to workspace sign-in
                </Link>
              </div>
            ) : null}
          </form>
        ) : null}
      </section>
    </div>
  );
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
