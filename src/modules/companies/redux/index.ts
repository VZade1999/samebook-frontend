import instance from "./instance";
import { invalidateCache } from "@/modules/delivery-challan/cache";

class CompanyService {
  updateCompany(payload: any) {
    const { id, ...rest } = payload;
    return instance.post(`/companies/update-company/${id}`, rest).then((res) => {
      // Delivery challan pages/PDFs cache the consignor profile.
      invalidateCache("company-details");
      return res;
    });
  }

  getCompanyDetails(companyId: any) {
    return instance.get(`/companies/details/${companyId}`);
  }
}

export default CompanyService;
