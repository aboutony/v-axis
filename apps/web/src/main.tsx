// apps/web/src/main.tsx
import React from 'react';
import { createRoot } from "react-dom/client";
import App from "./App"; // Points to src/App.tsx directly
import "./styles/index.css"; // Points to the styles folder you uploaded

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Failed to find the root element");

createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);