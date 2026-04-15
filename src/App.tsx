import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import type { ReactElement } from "react";
import { useEffect, useState } from "react";
import { Alert, Snackbar } from "@mui/material";
import type { AppToastSeverity } from "./api";
import { LedScreenPage } from "./pages/led/LedScreenPage";
import { ContestantPage } from "./pages/contestant/ContestantPage";
import { AdminPage } from "./pages/admin/AdminPage";
import { useRealtime } from "./hooks/useRealtime";
import { clearAllSessions } from "./auth/session";

const AppRoutes = (): ReactElement => {
  const navigate = useNavigate();
  const { disconnectSocket } = useRealtime();

  useEffect(() => {
    const onUnauthorized = () => {
      disconnectSocket();
      clearAllSessions();
      navigate("/contestant", { replace: true });
    };
    window.addEventListener("app:unauthorized", onUnauthorized as EventListener);
    return () => window.removeEventListener("app:unauthorized", onUnauthorized as EventListener);
  }, [disconnectSocket, navigate]);

  return (
    <Routes>
      <Route path="/admin/*" element={<AdminPage />} />
      <Route path="/contestant/*" element={<ContestantPage />} />
      <Route path="/led" element={<LedScreenPage />} />
      <Route path="*" element={<Navigate to="/contestant" replace />} />
    </Routes>
  );
};

function App(): ReactElement {
  const [toast, setToast] = useState<{ open: boolean; message: string; severity: AppToastSeverity }>({
    open: false,
    message: "",
    severity: "info"
  });

  useEffect(() => {
    const onToast = (e: Event): void => {
      const detail = (e as CustomEvent<{ message?: string; severity?: AppToastSeverity }>).detail;
      if (!detail?.message) return;
      setToast({
        open: true,
        message: detail.message,
        severity: detail.severity ?? "info"
      });
    };
    window.addEventListener("app:toast", onToast as EventListener);
    return () => window.removeEventListener("app:toast", onToast as EventListener);
  }, []);

  return (
    <>
      <AppRoutes />
      <Snackbar
        open={toast.open}
        autoHideDuration={4200}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setToast((t) => ({ ...t, open: false }))}
          severity={toast.severity === "success" ? "success" : toast.severity === "error" ? "error" : "info"}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </>
  );
}

export default App;
