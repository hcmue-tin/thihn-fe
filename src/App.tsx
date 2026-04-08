import { Navigate, Route, Routes } from "react-router-dom";
import type { ReactElement } from "react";
import { LedScreenPage } from "./pages/led/LedScreenPage";
import { ContestantPage } from "./pages/contestant/ContestantPage";
import { AdminPage } from "./pages/admin/AdminPage";

function App(): ReactElement {
  return (
    <Routes>
      <Route path="/admin/*" element={<AdminPage />} />
      <Route path="/contestant/*" element={<ContestantPage />} />
      <Route path="/led" element={<LedScreenPage />} />
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
}

export default App;
