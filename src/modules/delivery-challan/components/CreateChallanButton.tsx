import React from "react";
import { CarOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useAccess } from "@/permissions/useAccess";

interface Props {
  quotation: any;
  className?: string;
}

/**
 * Self-contained entry point used on the quotation page: only rendered for
 * APPROVED quotations and users with challans.create. Opens the challan list
 * with the form pre-filled from the quotation's pending quantities.
 */
const CreateChallanButton: React.FC<Props> = ({ quotation, className }) => {
  const navigate = useNavigate();
  const { can } = useAccess();

  if (!quotation?.id || quotation.status !== "APPROVED" || !can("challans.create")) return null;

  return (
    <button
      type="button"
      className={className}
      onClick={() => navigate(`/app/delivery-challans?fromQuotation=${quotation.id}`)}
    >
      <CarOutlined />
      Create Delivery Challan
    </button>
  );
};

export default CreateChallanButton;
