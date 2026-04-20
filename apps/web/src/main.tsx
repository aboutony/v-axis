import React from "react";
import ReactDOM from "react-dom/client";
import {
  TaxonomyPage,
  DocumentRegistryPage,
  AuditExplorerPage,
  AuthContextPage,
  AccessPage,
  ClientAdminPage,
} from "./App";
import "./styles.css";

// Use the first available page as default
const App = TaxonomyPage;

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
