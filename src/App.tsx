import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import type { ReactElement } from "react";
import { useEffect } from "react";
import { LedScreenPage } from "./pages/led/LedScreenPage";
import { ContestantPage } from "./pages/contestant/ContestantPage";
import { AdminPage } from "./pages/admin/AdminPage";
import { LoginPage } from "./pages/auth/LoginPage";
import { useRealtime } from "./hooks/useRealtime";
import { clearAllSessions } from "./auth/session";

const AppRoutes = (): ReactElement => {
  const navigate = useNavigate();
  const { disconnectSocket } = useRealtime();

  useEffect(() => {
    const onUnauthorized = () => {
      disconnectSocket();
      clearAllSessions();
      navigate("/login", { replace: true });
    };
    window.addEventListener("app:unauthorized", onUnauthorized as EventListener);
    return () => window.removeEventListener("app:unauthorized", onUnauthorized as EventListener);
  }, [disconnectSocket, navigate]);

  return (
    <Routes>
      <Route path="/admin/*" element={<AdminPage />} />
      <Route path="/contestant/*" element={<ContestantPage />} />
      <Route path="/led" element={<LedScreenPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

function App(): ReactElement {
  return <AppRoutes />;
}

export default App;
