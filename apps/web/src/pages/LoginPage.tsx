// apps/web/src/pages/LoginPage.tsx
// Login page for tenant users

import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import type { PlatformBootstrap } from "../types/auth";

export default function LoginPage() {
  const { login, checkPlatformState, isLoading } = useAuth();
  const [state, setState] = useState<PlatformBootstrap | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  const [tenantSlug, setTenantSlug] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [showMfa, setShowMfa] = useState(false);

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    loadPlatformState();

    // Check URL for tenant slug
    const params = new URLSearchParams(window.location.search);
    const tenantFromUrl = params.get("tenant");
    if (tenantFromUrl) {
      setTenantSlug(tenantFromUrl);
    }
  }, []);

  const loadPlatformState = async () => {
    try {
      const data = await checkPlatformState();
      setState(data);

      // If no tenants exist, redirect to bootstrap
      if (!data.platformState.hasTenants) {
        window.location.href = "/bootstrap";
        return;
      }
    } catch (error) {
      console.error("Failed to load platform state:", error);
    } finally {
      setIsChecking(false);
    }
  };

  const validate = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!tenantSlug.trim()) {
      newErrors.tenantSlug = "Tenant slug is required";
    }

    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Please enter a valid email";
    }

    if (!password) {
      newErrors.password = "Password is required";
    }

    if (showMfa && !mfaCode.trim()) {
      newErrors.mfaCode = "MFA code is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setSubmitError(null);
    try {
      const loginInput: {
        tenantSlug: string;
        email: string;
        password: string;
        mfaCode?: string;
      } = {
        tenantSlug: tenantSlug.toLowerCase().trim(),
        email: email.trim(),
        password,
      };
      if (showMfa && mfaCode) {
        loginInput.mfaCode = mfaCode;
      }
      await login(loginInput as any);

      // Login successful - redirect to workspace
      window.location.href = "/workspace";
    } catch (error: any) {
      const message = error.message || "Login failed";

      // Check if MFA is required
      if (error.code === "MFA_REQUIRED") {
        setShowMfa(true);
        setSubmitError("Please enter your MFA code");
      } else {
        setSubmitError(message);
      }
    }
  };

  if (isChecking) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-md mx-auto px-6 py-4 flex items-center justify-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white font-black text-xl">
              V
            </div>
            <div>
              <h1 className="font-black text-slate-900 leading-tight">
                V-AXIS
              </h1>
              <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">
                Secure Login
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Platform Info */}
          {state && (
            <div className="text-center mb-8">
              <h2 className="text-lg font-bold text-slate-900">
                {state.platform.name}
              </h2>
              <p className="text-sm text-slate-500">{state.platform.tagline}</p>
            </div>
          )}

          {/* Login Card */}
          <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="p-8">
              <h3 className="text-xl font-bold text-slate-900 mb-2">
                {showMfa ? "Two-Factor Authentication" : "Welcome Back"}
              </h3>
              <p className="text-sm text-slate-500 mb-6">
                {showMfa
                  ? "Enter the code from your authenticator app"
                  : "Sign in to your workspace"}
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                {!showMfa ? (
                  <>
                    {/* Tenant Slug */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                        Tenant Slug
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={tenantSlug}
                          onChange={(e) => setTenantSlug(e.target.value)}
                          placeholder="your-tenant"
                          className={`w-full px-4 py-3 rounded-xl border bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-mono text-sm ${
                            errors.tenantSlug
                              ? "border-red-500"
                              : "border-slate-200"
                          }`}
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                          .vaxis
                        </span>
                      </div>
                      {errors.tenantSlug && (
                        <p className="mt-1 text-xs text-red-500">
                          {errors.tenantSlug}
                        </p>
                      )}
                    </div>

                    {/* Email */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@company.com"
                        className={`w-full px-4 py-3 rounded-xl border bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all ${
                          errors.email ? "border-red-500" : "border-slate-200"
                        }`}
                      />
                      {errors.email && (
                        <p className="mt-1 text-xs text-red-500">
                          {errors.email}
                        </p>
                      )}
                    </div>

                    {/* Password */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                        Password
                      </label>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className={`w-full px-4 py-3 rounded-xl border bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all ${
                          errors.password
                            ? "border-red-500"
                            : "border-slate-200"
                        }`}
                      />
                      {errors.password && (
                        <p className="mt-1 text-xs text-red-500">
                          {errors.password}
                        </p>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    {/* MFA Code */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                        MFA Code
                      </label>
                      <input
                        type="text"
                        value={mfaCode}
                        onChange={(e) => setMfaCode(e.target.value)}
                        placeholder="000000"
                        maxLength={6}
                        className={`w-full px-4 py-3 rounded-xl border bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-center text-2xl tracking-widest font-mono ${
                          errors.mfaCode ? "border-red-500" : "border-slate-200"
                        }`}
                      />
                      {errors.mfaCode && (
                        <p className="mt-1 text-xs text-red-500">
                          {errors.mfaCode}
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowMfa(false)}
                      className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                    >
                      ← Back to login
                    </button>
                  </>
                )}

                {submitError && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                    <p className="text-sm text-red-600">{submitError}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-4 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Signing in...
                    </>
                  ) : showMfa ? (
                    "Verify"
                  ) : (
                    "Sign In"
                  )}
                </button>
              </form>

              {/* Links */}
              <div className="mt-6 flex items-center justify-between text-sm">
                <a
                  href="/forgot-password"
                  className="text-emerald-600 hover:text-emerald-700 font-medium"
                >
                  Forgot password?
                </a>
                <span className="text-slate-400">
                  Need help?{" "}
                  <a
                    href="mailto:support@vaxis.local"
                    className="text-emerald-600 hover:text-emerald-700 font-medium"
                  >
                    Contact support
                  </a>
                </span>
              </div>
            </div>
          </div>

          {/* Security Info */}
          {state && (
            <div className="mt-6 flex items-center justify-center gap-4 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <svg
                  className="w-3 h-3"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                    clipRule="evenodd"
                  />
                </svg>
                {state.security.encryption}
              </span>
              <span>•</span>
              <span>{state.security.residency}</span>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4">
        <p className="text-center text-xs text-slate-400 font-medium">
          V-AXIS Platform v0.1.0 • Virtual Asset eXchange & Intelligence System
        </p>
      </footer>
    </div>
  );
}
