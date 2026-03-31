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

export async function fetchPlatformBootstrap() {
  const response = await fetch(`${API_BASE_URL}/api/v1/platform/bootstrap`, {
    credentials: "include",
  });

  return parseJson<PlatformBootstrapResponse>(response);
}

export async function bootstrapClient(input: BootstrapClientInput) {
  const response = await fetch(`${API_BASE_URL}/api/v1/auth/bootstrap-client`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(input),
  });

  return parseJson<BootstrapClientResponse>(response);
}
