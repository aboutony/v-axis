// apps/web/src/main.tsx
import { createRoot } from "react-dom/client";
import App from "./app/App"; // Removed .tsx extension for Vite compatibility
import "./styles/index.css";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Failed to find the root element");

createRoot(rootElement).render(<App />);