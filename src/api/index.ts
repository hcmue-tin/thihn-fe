import axios from "axios";
import { clearAllSessions } from "../auth/session";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5126/api",
  timeout: 10000
});

export const getBackendBaseUrl = (): string => {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:5126/api";
  return apiBaseUrl.replace(/\/api\/?$/, "");
};

export type AppToastSeverity = "success" | "error" | "info";

export const toastApp = (message: string, severity: AppToastSeverity = "info"): void => {
  window.dispatchEvent(new CustomEvent("app:toast", { detail: { message, severity } }));
};

export const resolveMediaUrl = (url?: string | null): string => {
  if (!url) return "";
  const normalizedInput = url.trim().replace(/\\/g, "/");
  if (/^https?:\/\//i.test(normalizedInput)) {
    return normalizedInput;
  }
  const normalizedPath = normalizedInput.startsWith("/") ? normalizedInput : `/${normalizedInput}`;
  return new URL(normalizedPath, `${getBackendBaseUrl()}/`).toString();
};

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      const reqUrl = String(error?.config?.url ?? "");
      const isLoginAttempt = reqUrl.includes("/auth/contestant/login") || reqUrl.includes("/auth/admin/login");
      if (!isLoginAttempt) {
        clearAllSessions();
        window.dispatchEvent(new CustomEvent("app:unauthorized"));
      }
      const data = error?.response?.data as { message?: string } | undefined;
      const msg =
        (typeof data?.message === "string" && data.message) ||
        (error instanceof Error ? error.message : null) ||
        "Không được phép truy cập";
      toastApp(String(msg), "error");
      return Promise.reject(error);
    }
    const data = error?.response?.data as { message?: string } | undefined;
    const msg =
      (typeof data?.message === "string" && data.message) ||
      (error instanceof Error ? error.message : null) ||
      "Lỗi kết nối máy chủ";
    toastApp(String(msg), "error");
    return Promise.reject(error);
  }
);
