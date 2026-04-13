import axios from "axios";
import { clearAllSessions } from "../auth/session";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api",
  timeout: 10000
});

export const getBackendBaseUrl = (): string => {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";
  return apiBaseUrl.replace(/\/api\/?$/, "");
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
      clearAllSessions();
      window.dispatchEvent(new CustomEvent("app:unauthorized"));
    }
    return Promise.reject(error);
  }
);
