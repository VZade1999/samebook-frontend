import axios from "axios";

// build-marker: force a new commit SHA so Vercel's "Ignored Build Step"
// (Automatic mode skips rebuilding a previously-deployed SHA) can't skip this
// build and keep re-aliasing to the stale pre-fix bundle.
// Relative by default — same-origin, routed through the /api proxy (Vercel
// rewrite in prod, Vite dev-server proxy locally). Do not fall back to the
// backend's absolute cross-origin URL: that makes every request cross-site,
// which breaks the auth cookies on mobile browsers' stricter third-party
// cookie policies even though it appears to work fine on desktop.
const baseURL = process.env.REACT_APP_CUSTOMERS_API_URL || "/api";

const apiClient = axios.create({
  baseURL,
  withCredentials: true,
  // Without this, a request on a flaky mobile connection can hang
  // indefinitely — the saga's `yield call(...)` never resolves/rejects, so
  // loading/createLoading stay true forever with no way to recover short of
  // a page reload. 30s gives slow connections room without leaving the UI
  // stuck forever.
  timeout: 30000,
});

export default apiClient;
