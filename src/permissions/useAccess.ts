import { useCallback, useMemo } from "react";
import { useSelector } from "react-redux";
import { StorageService } from "@/storage";

export const useAccess = () => {
  // Prefer the live copy synced from GET /auth/session (Redux, so components
  // re-render when an add-on is connected/disconnected); fall back to what
  // login stored in sessionStorage. The raw string is the memo key, so `can`
  // keeps a stable reference unless the permissions actually change — many
  // list pages key useMemo/useCallback on it (e.g. table column defs).
  const live: string[] | null = useSelector((s: any) => s.session?.permissions ?? null);
  const storageService: any = new StorageService();
  const permissionsRaw: string = live
    ? live.join(",")
    : storageService.getItem(StorageService.STORAGE_KEYS.PERMISSIONS) || "";
  const permissions: string[] = useMemo(() => permissionsRaw.split(","), [permissionsRaw]);

  const can = useCallback(
    (permission: string) => permissions?.includes(permission),
    [permissions],
  );

  const canAny = useCallback(
    (permissionList: string[]) => permissionList.some((permission) => permissions.includes(permission)),
    [permissions],
  );

  const canAll = useCallback(
    (permissionList: string[]) => permissionList.every((permission) => permissions.includes(permission)),
    [permissions],
  );

  return {
    can,
    canAny,
    canAll,
  };
};
