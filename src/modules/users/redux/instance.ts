import axios from "axios";
import store from "@/app/store";
import { StorageService } from "@/storage";
import { UNAUTHORIZED } from "@/modules/auth/redux/authActions";

const storageService = new StorageService();

const instance = axios.create({
  baseURL: process.env.REACT_APP_CUSTOMERS_API_URL || "https://samebook-customer-backend-dev.vercel.app",
  withCredentials: true,
});

instance.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;

    if (status === 401) {
      storageService.removeAllItems();
      store.dispatch({ type: UNAUTHORIZED });
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  },
);

export default instance;
