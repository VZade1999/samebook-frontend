/**
 * Browser-side stale-while-revalidate cache shared by Quotations, Invoices and
 * Delivery Challans.
 *
 * - Lists (per filter/page) and details (per id) are remembered in Redux, so
 *   revisiting them renders instantly; a fresh request ALWAYS runs as well and
 *   replaces the copy.
 * - The three modules are linked (quotation -> challan -> invoice, payments),
 *   so ANY successful billing change in any of them clears all three caches.
 * - Each cache has a generation number. A response is stored only if its
 *   request started in the current generation, so a slow request that began
 *   before a change (or a logout) can never write old data back.
 * - Helpers are immutable, for the plain (non-Immer) saga reducers.
 */
import * as Q from "@/modules/quotation/redux/quotationActions";
import * as I from "@/modules/invoice/redux/invoiceActions";
import {
  cancelChallan,
  convertChallanToInvoice,
  createChallan,
  deleteChallan,
  deliverChallan,
  dispatchChallan,
  updateChallan,
} from "@/modules/delivery-challan/redux/challanActions";

export const BILLING_MUTATION_TYPES = new Set<string>([
  Q.ASYNC_CREATE_QUOTATION_SUCCESS,
  Q.ASYNC_UPDATE_QUOTATION_SUCCESS,
  Q.ASYNC_DELETE_QUOTATION_SUCCESS,
  Q.ASYNC_SEND_QUOTATION_SUCCESS,
  Q.ASYNC_APPROVE_QUOTATION_SUCCESS,
  Q.QUOTATION_CLOSED,
  Q.QUOTATION_REOPENED,
  I.ASYNC_GENERATE_INVOICE_SUCCESS,
  I.ASYNC_SEND_INVOICE_SUCCESS,
  I.ASYNC_ADD_PAYMENT_SUCCESS,
  createChallan.fulfilled.type,
  updateChallan.fulfilled.type,
  dispatchChallan.fulfilled.type,
  deliverChallan.fulfilled.type,
  cancelChallan.fulfilled.type,
  convertChallanToInvoice.fulfilled.type,
  deleteChallan.fulfilled.type,
]);

export const isBillingMutation = (action: any) => BILLING_MUTATION_TYPES.has(action?.type);

/** Stable key for a params object (key order and empty values don't matter). */
export const stableKey = (params: any): string => {
  if (params === null || params === undefined || typeof params !== "object") return JSON.stringify(params ?? null);
  return JSON.stringify(
    Object.keys(params)
      .sort()
      .filter((k) => params[k] !== undefined && params[k] !== null && params[k] !== "")
      .map((k) => [k, params[k]]),
  );
};

export interface Bucket<T = any> {
  map: Record<string, T>;
  order: string[];
}

export const emptyBucket = <T = any>(): Bucket<T> => ({ map: {}, order: [] });

export const bucketPut = <T>(b: Bucket<T>, key: string, value: T, max: number): Bucket<T> => {
  const order = b.order.filter((k) => k !== key).concat(key);
  const map = { ...b.map, [key]: value };
  while (order.length > max) delete map[order.shift() as string];
  return { map, order };
};

export const bucketDrop = <T>(b: Bucket<T>, key: string): Bucket<T> => {
  if (!(key in b.map)) return b;
  const map = { ...b.map };
  delete map[key];
  return { map, order: b.order.filter((k) => k !== key) };
};
