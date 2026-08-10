import axios from "axios";

// Relative by default — same-origin, routed through the /api proxy (Vercel
// rewrite in prod, Vite dev-server proxy locally). Do not fall back to the
// backend's absolute cross-origin URL: that makes every request cross-site,
// which breaks the auth cookies on mobile browsers' stricter third-party
// cookie policies even though it appears to work fine on desktop.
const baseURL = process.env.REACT_APP_CUSTOMERS_API_URL || "/api";

const apiClient = axios.create({
  baseURL,
  withCredentials: true,
});

export default apiClient;
