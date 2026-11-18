import { Navigate, useParams } from "react-router-dom";

/**
 * Old links (dashboard, challans, tasks) point at /app/invoice-details/:id.
 * Invoice details now open in a side panel on the invoice page.
 */
const InvoiceDetailsRedirect = () => {
  const { id } = useParams();
  const n = Number(id);
  return <Navigate to={Number.isInteger(n) && n > 0 ? `/app/invoice?open=${n}` : "/app/invoice"} replace />;
};

export default InvoiceDetailsRedirect;
