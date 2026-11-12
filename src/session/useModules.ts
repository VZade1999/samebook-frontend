import { useCallback, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { readStoredModules, syncSession } from "./session";

/** Core modules are always on, even before the session has loaded. */
const CORE_MODULES = ["billing"];

export const useModules = () => {
  const dispatch = useDispatch();
  const live: string[] | null = useSelector((s: any) => s.session?.modules ?? null);
  const loaded: boolean = useSelector((s: any) => !!s.session?.loaded);

  const raw = (live ?? readStoredModules() ?? []).join(",");
  const modules = useMemo(
    () => [...new Set([...CORE_MODULES, ...raw.split(",").filter(Boolean)])],
    [raw],
  );

  const hasModule = useCallback((key: string) => modules.includes(key), [modules]);
  const refresh = useCallback(() => syncSession(dispatch), [dispatch]);

  return { modules, hasModule, loaded, refresh };
};
