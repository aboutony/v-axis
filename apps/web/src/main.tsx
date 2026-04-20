// apps/web/src/main.tsx
import React from 'react';
import { createRoot } from "react-dom/client";
import App from "./App"; // Points to src/App.tsx
import "./styles.css"; // Points to src/styles.css verified by your 'ls' command

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Failed to find the root element");

createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);