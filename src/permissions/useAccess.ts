import { useCallback, useMemo } from "react";
import { StorageService } from "@/storage";

export const useAccess = () => {
  // Read fresh every render (cheap — a synchronous sessionStorage read) so
  // this still picks up a real permissions change, but only produces a new
  // array *reference* when the underlying string actually differs. That's
  // what lets `can` below stay referentially stable across renders when
  // nothing changed — this hook is called at the top of most list pages, so
  // an unstable `can` reference used to silently defeat any
  // useMemo/useCallback keyed on it elsewhere (e.g. table column defs).
  const storageService: any = new StorageService();
  const permissionsRaw: string = storageService.getItem(StorageService.STORAGE_KEYS.PERMISSIONS) || "";
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
