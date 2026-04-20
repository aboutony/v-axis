import { lazy } from "react";

export const TaxonomyPage = lazy(() => import("./pages/TaxonomyPageContent"));
export const DocumentRegistryPage = lazy(
  () => import("./pages/DocumentRegistryPageContent"),
);
export const AuditExplorerPage = lazy(
  () => import("./pages/AuditExplorerPageContent"),
);
export const AuthContextPage = lazy(
  () => import("./pages/AuthContextPageContent"),
);
export const AccessPage = lazy(() => import("./pages/AccessPageContent"));
export const ClientAdminPage = lazy(
  () => import("./pages/ClientAdminPageContent"),
);
