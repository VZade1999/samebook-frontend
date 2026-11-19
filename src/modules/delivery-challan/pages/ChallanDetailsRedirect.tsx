import { Navigate, useParams } from "react-router-dom";

/**
 * Old links (dashboard "recent", bookmarks) point at /app/delivery-challans/:id.
 * Challan details now open in a side panel on the challan page.
 */
const ChallanDetailsRedirect = () => {
  const { id } = useParams();
  const n = Number(id);
  return <Navigate to={Number.isInteger(n) && n > 0 ? `/app/delivery-challans?open=${n}` : "/app/delivery-challans"} replace />;
};

export default ChallanDetailsRedirect;
