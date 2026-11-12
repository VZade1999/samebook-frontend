import api from "@/api/axios";
import type { Overview, RangeQuery } from "../types";

export const dashboardService = {
  overview: (q: RangeQuery, signal?: AbortSignal) =>
    api
      .get("/dashboard/overview", { params: q, signal })
      .then((r) => r.data?.data as Overview),
};

/** Stable cache key for a range query. */
export const overviewKey = (q: RangeQuery) => `${q.from}|${q.to}|${q.cmp_from || ""}|${q.today}|${q.tz}`;
