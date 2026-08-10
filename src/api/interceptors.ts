import apiClient from "./axios";
import store from "@/app/store";
import { StorageService } from "@/storage";
import { UNAUTHORIZED } from "@/modules/auth/redux/authActions";

const storageService = new StorageService();

let isRefreshing = false;
let pendingQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

function flushQueue(error: unknown) {
  pendingQueue.forEach(({ resolve, reject }) => (error ? reject(error) : resolve()));
  pendingQueue = [];
}

function redirectToLogin() {
  storageService.removeAllItems();
  store.dispatch({ type: UNAUTHORIZED });
  if (typeof window !== "undefined") {
    window.location.href = "/login";
  }
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { response, config: originalRequest } = error;
    const status = response?.status;
    const url: string = originalRequest?.url ?? "";

    // Never attempt a refresh for the refresh call itself or the login call —
    // that would be an infinite loop (refresh fails 401 -> tries to refresh -> ...).
    const isAuthEndpoint = url.includes("/auth/refresh") || url.includes("/auth/login");

    if (status !== 401 || isAuthEndpoint || !originalRequest || originalRequest._retry) {
      if (status === 401 && isAuthEndpoint) {
        redirectToLogin();
      }
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    if (isRefreshing) {
      // A refresh is already in flight — queue this request until it resolves,
      // then retry it, instead of firing a second concurrent refresh call.
      return new Promise((resolve, reject) => {
        pendingQueue.push({
          resolve: () => resolve(apiClient(originalRequest)),
          reject,
        });
      });
    }

    isRefreshing = true;
    try {
      await apiClient.post("/auth/refresh");
      isRefreshing = false;
      flushQueue(null);
      return apiClient(originalRequest);
    } catch (refreshError) {
      isRefreshing = false;
      flushQueue(refreshError);
      redirectToLogin();
      return Promise.reject(refreshError);
    }
  },
);

export default apiClient;
