// "How do you sell?" — a company setting that only changes defaults: which
// button comes first on an approved quotation, and (for services) whether
// delivery challans show at all. It never blocks anything.
//
// One shared copy for every screen (sidebar, quotation page, dashboard…),
// refreshed every few minutes and right after it is changed.

import { useEffect, useState } from "react";
import api from "@/api/axios";
import { StorageService } from "@/storage";

export const SALES_FLOWS = ["WITH_GOODS", "SEND_FIRST", "BILL_FIRST", "SERVICES", "ALL"] as const;
export type SalesFlow = (typeof SALES_FLOWS)[number];

export const parseSalesFlow = (v: unknown): SalesFlow | null => {
  const s = String(v ?? "").trim().toUpperCase();
  return (SALES_FLOWS as readonly string[]).includes(s) ? (s as SalesFlow) : null;
};

export const SALES_FLOW_INFO: Record<SalesFlow, { title: string; text: string; who: string; effect: string }> = {
  WITH_GOODS: {
    title: "Bill with the goods",
    text: "The tax invoice travels with the goods.",
    who: "Shops, traders, distributors",
    effect: "Create invoice comes first",
  },
  SEND_FIRST: {
    title: "Send first, bill later",
    text: "Goods go on delivery challans; one invoice later for what was delivered.",
    who: "Wholesale, building material, regular supply",
    effect: "Create challan comes first",
  },
  BILL_FIRST: {
    title: "Bill first, send in lots",
    text: "One invoice up front; the goods follow in lots, each on a challan against it.",
    who: "Machinery, project supply, big orders",
    effect: "Create invoice comes first",
  },
  SERVICES: {
    title: "Services only",
    text: "Nothing is delivered — just invoices.",
    who: "Consultants, agencies, repairs, software",
    effect: "Delivery challans are hidden",
  },
  ALL: {
    title: "Show everything",
    text: "Every option, nothing hidden.",
    who: "A mix of the above",
    effect: "Nothing changes",
  },
};

type State = { companyId: number | null; flow: SalesFlow | null; known: boolean; at: number };
const TTL_MS = 5 * 60_000;
let state: State = { companyId: null, flow: null, known: false, at: 0 };
let inflight: Promise<void> | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

const currentCompanyId = (): number | null => {
  try {
    return Number(JSON.parse(new StorageService().getItem(StorageService.STORAGE_KEYS.COMPANY_DETAILS) || "{}")?.id) || null;
  } catch {
    return null;
  }
};

export function loadSalesFlow(force = false): Promise<void> {
  const cid = currentCompanyId();
  if (!force && state.known && state.companyId === cid && Date.now() - state.at < TTL_MS) return Promise.resolve();
  if (inflight && !force) return inflight;
  const p = api
    .get("/companies/sales-flow")
    .then((res) => {
      state = { companyId: cid, flow: parseSalesFlow(res?.data?.data?.sales_flow), known: true, at: Date.now() };
    })
    .catch(() => {
      // Unknown: show everything and never ask (keep a value we already had).
      state = { companyId: cid, flow: state.companyId === cid ? state.flow : null, known: false, at: Date.now() };
    })
    .finally(() => {
      if (inflight === p) inflight = null;
      emit();
    });
  inflight = p;
  return p;
}

/** Saves the choice for the whole company; returns the server's message. */
export async function saveSalesFlow(flow: SalesFlow): Promise<string> {
  const res = await api.put("/companies/sales-flow", { sales_flow: flow });
  state = { companyId: currentCompanyId(), flow: parseSalesFlow(res?.data?.data?.sales_flow) ?? flow, known: true, at: Date.now() };
  emit();
  return res?.data?.message || "Saved";
}

export function useSalesFlow() {
  const [, rerender] = useState(0);
  useEffect(() => {
    const listener = () => rerender((n) => n + 1);
    listeners.add(listener);
    loadSalesFlow();
    return () => {
      listeners.delete(listener);
    };
  }, []);
  const mine = state.companyId === currentCompanyId();
  const flow = mine ? state.flow : null;
  return {
    /** The saved choice; null while not chosen yet (behaves like "Show everything"). */
    flow,
    /** True once the saved choice is known (false while loading or if it couldn't be read). */
    known: mine && state.known,
    hideChallans: flow === "SERVICES",
    challanFirst: flow === "SEND_FIRST",
    save: saveSalesFlow,
  };
}
