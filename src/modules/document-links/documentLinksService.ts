import api from "@/api/axios";
import type { DocType, SearchResult, SearchType, Trail } from "./types";

/** Where each document opens (its page with the side panel open). */
// A goods received note opens its purchase order (its id is the PO's).
export const docPath = (type: SearchType, id: number) =>
  type === "quotation"
    ? `/app/quotation?open=${id}`
    : type === "challan"
      ? `/app/delivery-challans?open=${id}`
      : type === "purchase_order" || type === "grn"
        ? `/app/purchase-orders?open=${id}`
        : type === "supplier_bill"
          ? `/app/purchase-bills?open=${id}`
          : type === "receipt" || type === "refund"
            ? `/app/cash-bank?tab=daybook&open=${type}:${id}`
            : type === "expense"
              ? `/app/expenses?open=expense:${id}`
              : type === "credit_note" || type === "debit_note"
                ? `/app/notes?open=${type === "credit_note" ? "credit" : "debit"}:${id}`
                : `/app/invoice?open=${id}`;

export const DOC_LABEL: Record<SearchType, string> = {
  quotation: "Quotation",
  challan: "Delivery challan",
  invoice: "Invoice",
  purchase_order: "Purchase order",
  grn: "Goods received",
  supplier_bill: "Supplier bill",
  receipt: "Receipt",
  expense: "Expense",
  refund: "Refund",
  credit_note: "Credit note",
  debit_note: "Debit note",
};

const dataOf = <T,>(res: any): T => {
  const body = res?.data;
  if (!body?.success) throw new Error(body?.message || "Request failed");
  return body.data as T;
};

/**
 * Linked documents of one quotation, challan or invoice. Billing data is
 * never cached: every call asks the server.
 */
export const getTrail = async (type: DocType, id: number): Promise<Trail> => dataOf<Trail>(await api.get("/document-links/trail", { params: { type, id } }));

export const searchDocuments = async (q: string, signal?: AbortSignal): Promise<{ query: string; results: SearchResult[] }> =>
  dataOf(await api.get("/document-links/search", { params: { q }, signal }));
