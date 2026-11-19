import api from "@/api/axios";
import type { DocType, SearchResult, Trail } from "./types";

/** Where each document opens (its page with the side panel open). */
export const docPath = (type: DocType, id: number) =>
  type === "quotation" ? `/app/quotation?open=${id}` : type === "challan" ? `/app/delivery-challans?open=${id}` : `/app/invoice?open=${id}`;

export const DOC_LABEL: Record<DocType, string> = { quotation: "Quotation", challan: "Delivery challan", invoice: "Invoice" };

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
