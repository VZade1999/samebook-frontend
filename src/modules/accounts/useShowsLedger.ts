import { useAccess } from "@/permissions/useAccess";
import { useModules } from "@/session/useModules";

/** Can this person open ledgers? (The Accounts add-on is on, and they have some Accounts permission.) */
export const useShowsLedger = () => {
  const { hasModule } = useModules();
  const { can } = useAccess();
  return hasModule("accounts") && (can("accounts.view") || can("accounts.record") || can("accounts.reports"));
};

/** The ledger page with this customer's or supplier's statement open. */
export const ledgerPath = (type: "customer" | "supplier", id: number) => `/app/ledger?party=${type}:${id}`;
