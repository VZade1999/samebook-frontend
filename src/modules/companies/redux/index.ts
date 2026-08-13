import instance from "./instance";

class CompanyService {
  updateCompany(payload: any) {
    const { id, ...rest } = payload;
    return instance.post(`/companies/update-company/${id}`, rest);
  }

  getCompanyDetails(companyId: any) {
    return instance.get(`/companies/details/${companyId}`);
  }
}

export default CompanyService;
