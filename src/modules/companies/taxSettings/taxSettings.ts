// "GST on transport" — a company setting, on for every company (the GST rule:
// transport you charge on your own bill is taxed like the goods). The
// quotation and invoice editors read it to show the totals the server will
// save; the Company page changes it.
//
// One shared copy for every screen, refreshed every few minutes and right
// after it is changed.

import { useEffect, useState } from "react";
import api from "@/api/axios";
import { StorageService } from "@/storage";

type State = { companyId: number | null; transportGst: boolean; known: boolean; at: number };
const TTL_MS = 5 * 60_000;
let state: State = { companyId: null, transportGst: true, known: false, at: 0 };
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

export function loadTaxSettings(force = false): Promise<void> {
  const cid = currentCompanyId();
  if (!force && state.known && state.companyId === cid && Date.now() - state.at < TTL_MS) return Promise.resolve();
  if (inflight && !force) return inflight;
  const p = api
    .get("/companies/tax-settings")
    .then((res) => {
      const v = res?.data?.data?.transport_gst;
      state = { companyId: cid, transportGst: v !== false, known: true, at: Date.now() };
    })
    .catch(() => {
      // Unknown: assume the GST rule (what the server does too), keep a value we already had.
      state = { companyId: cid, transportGst: state.companyId === cid ? state.transportGst : true, known: false, at: Date.now() };
    })
    .finally(() => {
      if (inflight === p) inflight = null;
      emit();
    });
  inflight = p;
  return p;
}

/** Turns GST on transport on or off for the whole company; returns the server's message. */
export async function saveTransportGst(on: boolean): Promise<string> {
  const res = await api.put("/companies/tax-settings", { transport_gst: on });
  if (res?.data?.success === false) throw new Error(res.data.message || "Couldn't save");
  state = { companyId: currentCompanyId(), transportGst: res?.data?.data?.transport_gst ?? on, known: true, at: Date.now() };
  emit();
  return res?.data?.message || "Saved";
}

export function useTaxSettings() {
  const [, rerender] = useState(0);
  useEffect(() => {
    const listener = () => rerender((n) => n + 1);
    listeners.add(listener);
    loadTaxSettings();
    return () => {
      listeners.delete(listener);
    };
  }, []);
  const mine = state.companyId === currentCompanyId();
  return {
    /** Transport carries GST at the goods' rate (true unless an Admin turned it off). */
    transportGst: mine ? state.transportGst : true,
    /** True once the saved setting is known. */
    known: mine && state.known,
  };
}
