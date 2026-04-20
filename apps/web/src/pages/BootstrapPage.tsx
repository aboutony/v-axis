// apps/web/src/pages/BootstrapPage.tsx
// Bootstrap/Launchpad page for first tenant setup

import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import type { PlatformBootstrap } from "../types/auth";

interface FormData {
  clientName: string;
  slug: string;
  adminFullName: string;
  adminEmail: string;
  adminPassword: string;
  confirmPassword: string;
}

interface FormErrors {
  clientName?: string;
  slug?: string;
  adminFullName?: string;
  adminEmail?: string;
  adminPassword?: string;
  confirmPassword?: string;
}

export default function BootstrapPage() {
  const { checkPlatformState, bootstrap, isLoading } = useAuth();
  const [state, setState] = useState<PlatformBootstrap | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [formData, setFormData] = useState<FormData>({
    clientName: "",
    slug: "",
    adminFullName: "",
    adminEmail: "",
    adminPassword: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [createdTenant, setCreatedTenant] = useState<{
    tenant: any;
    admin: any;
  } | null>(null);

  useEffect(() => {
    loadPlatformState();
  }, []);

  const loadPlatformState = async () => {
    try {
      const data = await checkPlatformState();
      setState(data);

      // If tenants already exist, redirect to login (handled by router)
      if (data.platformState.hasTenants) {
        window.location.href = "/login";
        return;
      }
    } catch (error) {
      console.error("Failed to load platform state:", error);
    } finally {
      setIsChecking(false);
    }
  };

  const validateStep1 = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.clientName.trim()) {
      newErrors.clientName = "Client name is required";
    } else if (formData.clientName.length < 2) {
      newErrors.clientName = "Client name must be at least 2 characters";
    }

    if (!formData.slug.trim()) {
      newErrors.slug = "Slug is required";
    } else if (!/^[a-z0-9-]+$/.test(formData.slug)) {
      newErrors.slug =
        "Slug can only contain lowercase letters, numbers, and hyphens";
    } else if (formData.slug.length < 3) {
      newErrors.slug = "Slug must be at least 3 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.adminFullName.trim()) {
      newErrors.adminFullName = "Full name is required";
    } else if (formData.adminFullName.length < 2) {
      newErrors.adminFullName = "Full name must be at least 2 characters";
    }

    if (!formData.adminEmail.trim()) {
      newErrors.adminEmail = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.adminEmail)) {
      newErrors.adminEmail = "Please enter a valid email address";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep3 = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.adminPassword) {
      newErrors.adminPassword = "Password is required";
    } else if (formData.adminPassword.length < 12) {
      newErrors.adminPassword = "Password must be at least 12 characters";
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.adminPassword)) {
      newErrors.adminPassword =
        "Password must contain uppercase, lowercase, and number";
    }

    if (formData.adminPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    } else if (step === 2 && validateStep2()) {
      setStep(3);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep((prev) => (prev - 1) as 1 | 2 | 3);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep3()) return;

    setSubmitError(null);
    try {
      const result = await bootstrap({
        clientName: formData.clientName,
        slug: formData.slug,
        adminFullName: formData.adminFullName,
        adminEmail: formData.adminEmail,
        adminPassword: formData.adminPassword,
      });

      setCreatedTenant(result);
      setSuccess(true);
    } catch (error: any) {
      setSubmitError(
        error.message || "Failed to create tenant. Please try again.",
      );
    }
  };

  const handleChange =
    (field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData((prev) => ({ ...prev, [field]: e.target.value }));
      // Clear error when user types
      if (errors[field]) {
        setErrors((prev) => ({ ...prev, [field]: undefined }));
      }
    };

  // Auto-generate slug from client name
  const handleClientNameBlur = () => {
    if (!formData.slug && formData.clientName) {
      const slug = formData.clientName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      setFormData((prev) => ({ ...prev, slug }));
    }
  };

  if (isChecking) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium">Initializing V-AXIS...</p>
        </div>
      </div>
    );
  }

  if (success && createdTenant) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-lg w-full bg-white rounded-3xl shadow-xl p-10">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-10 h-10 text-emerald-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-black text-slate-900 mb-2">
              Tenant Created!
            </h1>
            <p className="text-slate-600">Your V-AXIS platform is now ready.</p>
          </div>

          <div className="space-y-4 mb-8">
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                Tenant
              </p>
              <p className="font-semibold text-slate-900">
                {createdTenant.tenant.clientName}
              </p>
              <p className="text-sm text-slate-500">
                Slug: {createdTenant.tenant.slug}
              </p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                Admin User
              </p>
              <p className="font-semibold text-slate-900">
                {createdTenant.admin.fullName}
              </p>
              <p className="text-sm text-slate-500">
                {createdTenant.admin.email}
              </p>
            </div>
          </div>

          <a
            href={`/login?tenant=${createdTenant.tenant.slug}`}
            className="block w-full py-4 bg-emerald-500 text-white text-center font-bold rounded-xl hover:bg-emerald-600 transition-colors"
          >
            Proceed to Login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white font-black text-xl">
              V
            </div>
            <div>
              <h1 className="font-black text-slate-900 leading-tight">
                V-AXIS
              </h1>
              <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">
                Platform Bootstrap
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  s === step
                    ? "bg-emerald-500 text-white"
                    : s < step
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-100 text-slate-400"
                }`}
              >
                {s < step ? "✓" : s}
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-lg w-full">
          {/* Platform Info Card */}
          {state && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center text-white">
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                </div>
                <div>
                  <h2 className="font-bold text-slate-900">
                    {state.platform.name}
                  </h2>
                  <p className="text-sm text-slate-500">
                    {state.platform.tagline}
                  </p>
                  <div className="flex gap-4 mt-3 text-xs">
                    <span className="flex items-center gap-1 text-emerald-600 font-medium">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                      {state.security.auth}
                    </span>
                    <span className="flex items-center gap-1 text-emerald-600 font-medium">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                      {state.security.encryption}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Form Card */}
          <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
            {/* Step 1: Organization */}
            {step === 1 && (
              <div className="p-8">
                <h3 className="text-xl font-bold text-slate-900 mb-2">
                  Organization Setup
                </h3>
                <p className="text-sm text-slate-500 mb-6">
                  Configure your tenant details
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      Client / Organization Name
                    </label>
                    <input
                      type="text"
                      value={formData.clientName}
                      onChange={handleChange("clientName")}
                      onBlur={handleClientNameBlur}
                      placeholder="e.g., PAC Technologies"
                      className={`w-full px-4 py-3 rounded-xl border bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all ${
                        errors.clientName
                          ? "border-red-500"
                          : "border-slate-200"
                      }`}
                    />
                    {errors.clientName && (
                      <p className="mt-1 text-xs text-red-500">
                        {errors.clientName}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      Tenant Slug
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={formData.slug}
                        onChange={handleChange("slug")}
                        placeholder="e.g., pac-tech"
                        className={`w-full px-4 py-3 rounded-xl border bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-mono text-sm ${
                          errors.slug ? "border-red-500" : "border-slate-200"
                        }`}
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                        .vaxis.local
                      </span>
                    </div>
                    {errors.slug ? (
                      <p className="mt-1 text-xs text-red-500">{errors.slug}</p>
                    ) : (
                      <p className="mt-1 text-xs text-slate-400">
                        Used in URLs and API endpoints
                      </p>
                    )}
                  </div>
                </div>

                <button
                  onClick={handleNext}
                  className="w-full mt-6 py-4 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 transition-colors"
                >
                  Continue
                </button>
              </div>
            )}

            {/* Step 2: Admin User */}
            {step === 2 && (
              <div className="p-8">
                <h3 className="text-xl font-bold text-slate-900 mb-2">
                  Administrator Account
                </h3>
                <p className="text-sm text-slate-500 mb-6">
                  Create the primary admin user
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={formData.adminFullName}
                      onChange={handleChange("adminFullName")}
                      placeholder="e.g., John Smith"
                      className={`w-full px-4 py-3 rounded-xl border bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all ${
                        errors.adminFullName
                          ? "border-red-500"
                          : "border-slate-200"
                      }`}
                    />
                    {errors.adminFullName && (
                      <p className="mt-1 text-xs text-red-500">
                        {errors.adminFullName}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={formData.adminEmail}
                      onChange={handleChange("adminEmail")}
                      placeholder="admin@company.com"
                      className={`w-full px-4 py-3 rounded-xl border bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all ${
                        errors.adminEmail
                          ? "border-red-500"
                          : "border-slate-200"
                      }`}
                    />
                    {errors.adminEmail && (
                      <p className="mt-1 text-xs text-red-500">
                        {errors.adminEmail}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={handleBack}
                    className="flex-1 py-4 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleNext}
                    className="flex-1 py-4 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 transition-colors"
                  >
                    Continue
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Security */}
            {step === 3 && (
              <div className="p-8">
                <h3 className="text-xl font-bold text-slate-900 mb-2">
                  Security Setup
                </h3>
                <p className="text-sm text-slate-500 mb-6">
                  Set a strong admin password
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      Password
                    </label>
                    <input
                      type="password"
                      value={formData.adminPassword}
                      onChange={handleChange("adminPassword")}
                      placeholder="••••••••••••"
                      className={`w-full px-4 py-3 rounded-xl border bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all ${
                        errors.adminPassword
                          ? "border-red-500"
                          : "border-slate-200"
                      }`}
                    />
                    {errors.adminPassword ? (
                      <p className="mt-1 text-xs text-red-500">
                        {errors.adminPassword}
                      </p>
                    ) : (
                      <p className="mt-1 text-xs text-slate-400">
                        Min 12 chars, include uppercase, lowercase, and number
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      Confirm Password
                    </label>
                    <input
                      type="password"
                      value={formData.confirmPassword}
                      onChange={handleChange("confirmPassword")}
                      placeholder="••••••••••••"
                      className={`w-full px-4 py-3 rounded-xl border bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all ${
                        errors.confirmPassword
                          ? "border-red-500"
                          : "border-slate-200"
                      }`}
                    />
                    {errors.confirmPassword && (
                      <p className="mt-1 text-xs text-red-500">
                        {errors.confirmPassword}
                      </p>
                    )}
                  </div>
                </div>

                {submitError && (
                  <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl">
                    <p className="text-sm text-red-600">{submitError}</p>
                  </div>
                )}

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={handleBack}
                    className="flex-1 py-4 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={isLoading}
                    className="flex-1 py-4 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Creating...
                      </>
                    ) : (
                      "Create Tenant"
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Features List */}
          {state && (
            <div className="mt-8 grid grid-cols-3 gap-4 text-center">
              <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
                <p className="text-2xl font-black text-emerald-500">
                  {state.platform.categorySlots}
                </p>
                <p className="text-xs font-bold text-slate-500 uppercase">
                  Category Slots
                </p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
                <p className="text-2xl font-black text-emerald-500">
                  {state.seededDocumentTypes.length}
                </p>
                <p className="text-xs font-bold text-slate-500 uppercase">
                  Doc Types
                </p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
                <p className="text-2xl font-black text-emerald-500">
                  {state.roles.length}
                </p>
                <p className="text-xs font-bold text-slate-500 uppercase">
                  Role Types
                </p>
              </div>
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
