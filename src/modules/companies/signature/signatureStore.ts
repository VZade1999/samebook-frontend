// The company's signature / stamp, printed above "Authorised Signatory" on
// quotations, delivery challans and tax invoices. One shared copy: the Company
// page shows and changes it, and every PDF reads it (refreshed every couple of
// minutes, and right after it is changed here).

import { useEffect, useState } from "react";
import api from "@/api/axios";
import { StorageService } from "@/storage";

export type SignatureStatus = "loading" | "ready" | "error";
type State = { companyId: number | null; value: string | null; status: SignatureStatus; at: number };
const TTL_MS = 2 * 60_000;
let state: State = { companyId: null, value: null, status: "loading", at: 0 };
let inflight: Promise<string | null> | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

const currentCompanyId = (): number | null => {
  try {
    return Number(JSON.parse(new StorageService().getItem(StorageService.STORAGE_KEYS.COMPANY_DETAILS) || "{}")?.id) || null;
  } catch {
    return null;
  }
};

const asImage = (v: unknown): string | null => (typeof v === "string" && v.startsWith("data:image/") ? v : null);

/**
 * The signature as a PNG data URL, or null when there is none. Never throws:
 * if it can't be read, documents simply leave the space blank.
 */
export function loadCompanySignature(force = false): Promise<string | null> {
  const cid = currentCompanyId();
  const fresh = state.status === "ready" && state.companyId === cid && Date.now() - state.at < TTL_MS;
  if (!force && fresh) return Promise.resolve(state.value);
  if (inflight && !force) return inflight;
  const p: Promise<string | null> = api
    .get("/companies/signature")
    .then((res) => {
      state = { companyId: cid, value: asImage(res?.data?.data?.signature), status: "ready", at: Date.now() };
      return state.value;
    })
    .catch(() => {
      // Keep one we already had for this company; otherwise none.
      const keep = state.companyId === cid ? state.value : null;
      state = { companyId: cid, value: keep, status: keep ? "ready" : "error", at: 0 };
      return keep;
    })
    .finally(() => {
      if (inflight === p) inflight = null;
      emit();
    });
  inflight = p;
  return p;
}

/** Saves (a PNG data URL) or removes (null) it for the whole company; returns the server's message. */
export async function saveCompanySignature(value: string | null): Promise<string> {
  let res: any;
  try {
    res = await api.put("/companies/signature", { signature: value });
  } catch (e: any) {
    throw new Error(e?.response?.data?.message || "Couldn't save — check your connection and try again");
  }
  if (!res?.data?.success) throw new Error(res?.data?.message || "Couldn't save the signature");
  state = { companyId: currentCompanyId(), value, status: "ready", at: Date.now() };
  emit();
  return res.data.message || "Saved";
}

export function useCompanySignature() {
  const [, rerender] = useState(0);
  useEffect(() => {
    const listener = () => rerender((n) => n + 1);
    listeners.add(listener);
    loadCompanySignature();
    return () => {
      listeners.delete(listener);
    };
  }, []);
  const mine = state.companyId === currentCompanyId();
  return {
    /** A PNG data URL, or null (none yet, still loading, or not readable). */
    signature: mine ? state.value : null,
    status: (mine ? state.status : "loading") as SignatureStatus,
    save: saveCompanySignature,
    reload: () => loadCompanySignature(true),
  };
}
