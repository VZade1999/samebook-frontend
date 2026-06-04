export const ASYNC_GET_COMPANIES = "ASYNC_GET_COMPANIES";
export const ASYNC_GET_COMPANIES_SUCCESS = "ASYNC_GET_COMPANIES_SUCCESS";
export const ASYNC_GET_COMPANIES_FAILED = "ASYNC_GET_COMPANIES_FAILED";

export const ASYNC_CREATE_COMPANY = "ASYNC_CREATE_COMPANY";
export const ASYNC_CREATE_COMPANY_SUCCESS = "ASYNC_CREATE_COMPANY_SUCCESS";
export const ASYNC_CREATE_COMPANY_FAILED = "ASYNC_CREATE_COMPANY_FAILED";

export const ASYNC_UPDATE_COMPANY = "ASYNC_UPDATE_COMPANY";
export const ASYNC_UPDATE_COMPANY_SUCCESS = "ASYNC_UPDATE_COMPANY_SUCCESS";
export const ASYNC_UPDATE_COMPANY_FAILED = "ASYNC_UPDATE_COMPANY_FAILED";

export const ASYNC_DELETE_COMPANY = "ASYNC_DELETE_COMPANY";
export const ASYNC_DELETE_COMPANY_SUCCESS = "ASYNC_DELETE_COMPANY_SUCCESS";
export const ASYNC_DELETE_COMPANY_FAILED = "ASYNC_DELETE_COMPANY_FAILED";

export const ASYNC_GET_COMPANY_DETAILS = "ASYNC_GET_COMPANY_DETAILS";
export const ASYNC_GET_COMPANY_DETAILS_SUCCESS = "ASYNC_GET_COMPANY_DETAILS_SUCCESS";
export const ASYNC_GET_COMPANY_DETAILS_FAILED = "ASYNC_GET_COMPANY_DETAILS_FAILED";

export const getCompanies = (payload?: any) => ({
  type: ASYNC_GET_COMPANIES,
  payload,
});

export const createCompany = (payload: any) => ({
  type: ASYNC_CREATE_COMPANY,
  payload,
});

export const updateCompany = (payload: any) => ({
  type: ASYNC_UPDATE_COMPANY,
  payload,
});

export const deleteCompany = (payload: any) => ({
  type: ASYNC_DELETE_COMPANY,
  payload,
});

export const getCompanyDetails = (companyId: any) => ({
  type: ASYNC_GET_COMPANY_DETAILS,
  payload: companyId,
});
