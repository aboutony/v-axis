import { Navigate, Route, Routes } from "react-router-dom";

import DemoExperience from "./DemoExperience";
import { ProductEntry } from "./ProductEntry";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/demo" replace />} />
      <Route path="/demo" element={<DemoExperience />} />
      <Route path="/app/*" element={<ProductEntry />} />
      <Route path="*" element={<Navigate to="/demo" replace />} />
    </Routes>
  );
}
