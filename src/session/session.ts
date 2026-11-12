import api from "@/api/axios";
import { StorageService } from "@/storage";
import { sessionChecked, setSession } from "./sessionSlice";

export const MODULES_STORAGE_KEY = "modules";
/** Fired by the axios layer when the server says an add-on is not enabled. */
export const SESSION_STALE_EVENT = "samebook:session-stale";

const storage = new StorageService();

/** Persist access the same way login does, so a page reload keeps it. */
export const storeAccess = (permissions: string[], modules: string[]) => {
  storage.setItem(StorageService.STORAGE_KEYS.PERMISSIONS, permissions.join(","));
  storage.setItem(MODULES_STORAGE_KEY, modules.join(","));
};

export const readStoredModules = (): string[] | null => {
  const raw = storage.getItem(MODULES_STORAGE_KEY);
  return raw === null ? null : raw.split(",").filter(Boolean);
};

/**
 * Pulls fresh roles / effective permissions / enabled modules from the server
 * and pushes them into sessionStorage + Redux. Safe to call any time while
 * logged in; failures are swallowed (the stored copy stays in use).
 */
export const syncSession = async (dispatch: (a: any) => any): Promise<boolean> => {
  if (!storage.getItem(StorageService.STORAGE_KEYS.TOKEN)) return false;
  try {
    const res = await api.get("/auth/session");
    const d = res?.data?.data;
    if (!d) {
      dispatch(sessionChecked());
      return false;
    }
    const permissions: string[] = Array.isArray(d.permissions) ? d.permissions : [];
    const modules: string[] = Array.isArray(d.modules) ? d.modules : [];
    // Access changed since this token was issued (e.g. an admin connected an
    // add-on): get a fresh JWT now so API calls match what the UI shows,
    // instead of failing until the token's natural 15-minute refresh.
    const before = storage.getItem(StorageService.STORAGE_KEYS.PERMISSIONS) || "";
    if (before && before !== permissions.join(",")) {
      try {
        await api.post("/auth/refresh");
      } catch {
        // dead session is handled by the interceptor
      }
    }
    storeAccess(permissions, modules);
    dispatch(setSession({ permissions, modules, roles: d.roles }));
    return true;
  } catch {
    dispatch(sessionChecked());
    return false;
  }
};

/**
 * After an add-on is connected/disconnected: re-issue the JWT (the server
 * recomputes effective permissions on refresh) and then re-sync the UI.
 */
export const refreshAccess = async (dispatch: (a: any) => any) => {
  try {
    await api.post("/auth/refresh");
  } catch {
    // The interceptor handles a dead session; a transient failure just means
    // the token catches up on its next natural refresh.
  }
  return syncSession(dispatch);
};
