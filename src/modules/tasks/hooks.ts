import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { tasksService } from "./services/tasksService";
import { TASKS_CHANGED_EVENT, UserRef } from "./constants";

export interface TasksMeta {
  assignees: (UserRef & { email?: string })[];
  can: { create: boolean; manage: boolean; create_epic: boolean };
  link_types: string[];
}

// Meta (assignable people, capabilities) changes rarely — share one request
// between components and refresh at most once a minute.
let metaCache: { at: number; promise: Promise<TasksMeta> } | null = null;
const loadMeta = (force = false) => {
  if (!force && metaCache && Date.now() - metaCache.at < 60_000) return metaCache.promise;
  const promise = tasksService
    .meta()
    .then((r) => r.data.data as TasksMeta)
    .catch((e) => {
      metaCache = null;
      throw e;
    });
  metaCache = { at: Date.now(), promise };
  return promise;
};

export const useTasksMeta = () => {
  const [meta, setMeta] = useState<TasksMeta | null>(null);
  useEffect(() => {
    let alive = true;
    loadMeta()
      .then((m) => alive && setMeta(m))
      .catch(() => alive && setMeta({ assignees: [], can: { create: false, manage: false, create_epic: false }, link_types: [] }));
    return () => {
      alive = false;
    };
  }, []);
  return meta;
};

export interface TaskSummary {
  open: number;
  overdue: number;
  due_today: number;
  waiting_on_others: number;
}

// The sidebar badge, the login reminder and the page all want the summary at
// the same moment — share one request made within a 2-second window.
let summaryInFlight: { at: number; promise: Promise<TaskSummary> } | null = null;
const fetchSummary = () => {
  if (summaryInFlight && Date.now() - summaryInFlight.at < 2000) return summaryInFlight.promise;
  const promise = tasksService.summary().then((r) => r.data.data as TaskSummary);
  summaryInFlight = { at: Date.now(), promise };
  return promise;
};

/** My counts for badges/reminders; refreshes on focus and after task changes. */
export const useTaskSummary = (enabled = true) => {
  const [summary, setSummary] = useState<TaskSummary | null>(null);
  const load = useCallback(() => {
    if (!enabled) return;
    fetchSummary()
      .then((s) => setSummary(s))
      .catch(() => undefined);
  }, [enabled]);
  useEffect(() => {
    load();
    const t = setInterval(load, 5 * 60_000);
    window.addEventListener("focus", load);
    window.addEventListener(TASKS_CHANGED_EVENT, load);
    return () => {
      clearInterval(t);
      window.removeEventListener("focus", load);
      window.removeEventListener(TASKS_CHANGED_EVENT, load);
    };
  }, [load]);
  return { summary, reload: load };
};

/** The side panel is driven by ?task=<id> so notification links can open it. */
export const useTaskPanel = () => {
  const [params, setParams] = useSearchParams();
  const raw = params.get("task");
  const taskId = raw && /^\d+$/.test(raw) ? Number(raw) : null;
  const open = useCallback(
    (id: number) => {
      const next = new URLSearchParams(params);
      next.set("task", String(id));
      setParams(next);
    },
    [params, setParams],
  );
  const close = useCallback(() => {
    const next = new URLSearchParams(params);
    next.delete("task");
    setParams(next, { replace: true });
  }, [params, setParams]);
  return { taskId, open, close };
};
