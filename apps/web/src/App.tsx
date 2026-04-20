import { lazy } from "react";

export const TaxonomyPage = lazy(() => import("./pages/TaxonomyPage"));
export const DocumentRegistryPage = lazy(
  () => import("./pages/DocumentRegistryPage"),
);
export const AuditExplorerPage = lazy(
  () => import("./pages/AuditExplorerPage"),
);
export const AuthContextPage = lazy(() => import("./pages/AuthContextPage"));
export const AccessPage = lazy(() => import("./pages/AccessPage"));
export const ClientAdminPage = lazy(() => import("./pages/ClientAdminPage"));
