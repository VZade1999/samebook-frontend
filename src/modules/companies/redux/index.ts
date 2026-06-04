import instance from "./instance";

class CompanyService {
  getCompanies(payload?: any) {
    return instance.get("/companies/list", {
      params: payload,
    });
  }

  createCompany(payload: any) {
    return instance.post("/companies/create", payload);
  }

  updateCompany(payload: any) {
    const { id, ...rest } = payload;
    return instance.post(`/companies/update-company/${id}`, rest);
  }

  deleteCompany(companyId: any) {
    return instance.post(`/companies/delete/${companyId}`);
  }

  getCompanyDetails(companyId: any) {
    return instance.get(`/companies/details/${companyId}`);
  }
}

export default CompanyService;
