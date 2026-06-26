import axios from "axios";
import store from "@/app/store";
import { StorageService } from "@/storage";
import { UNAUTHORIZED } from "@/modules/auth/redux/authActions";

const storageService = new StorageService();

const instance = axios.create({
  baseURL: process.env.REACT_APP_CUSTOMERS_API_URL || "https://samebook-customer-backend-dev.vercel.app",
  withCredentials: true,
});

// ─── Request Interceptor: Attach stored cookies to every request ───────────
instance.interceptors.request.use(
  (config) => {
    const cookies = storageService.getItem("auth_cookies"); // retrieve saved cookies

    if (cookies) {
      config.headers["Cookie"] = cookies; // attach as Cookie header
    }

    return config;
  },
  (error) => Promise.reject(error),
);

// ─── Response Interceptor: Save cookies from login response ────────────────
instance.interceptors.response.use(
  (response) => {
    const setCookieHeader = response.headers["set-cookie"] as string | string[] | undefined;

    if (setCookieHeader) {
      const cookieString = Array.isArray(setCookieHeader)
        ? setCookieHeader.map((c: string) => c.split(";")[0]).join("; ")
        : (setCookieHeader as string).split(";")[0];

      storageService.setItem("auth_cookies", cookieString);
    }

    return response;
  })

export default instance;