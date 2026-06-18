import { all } from "redux-saga/effects";

import { listenLogin, listenLogout } from "../modules/auth/redux/authSaga";
import {
  listenCreateCustomer,
  listenDeleteCustomer,
  listenGetCustomers,
  listenUpdateCustomer,
} from "@/modules/customers/redux/customerSaga";
import {
  listenCreateProduct,
  listenDeleteProduct,
  listenGetProducts,
  listenUpdateProduct,
} from "@/modules/products/redux/productSaga";
import {
  listenCreateQuotation,
  listenDeleteQuotation,
  listenGetQuotationDetails,
  listenGetQuotationHistory,
  listenGetQuotationTimeline,
  listenSendQuotation,
  listenGetQuotations,
  listenUpdateQuotation,
} from "@/modules/quotation/redux/quotationSaga";
import {
  listenCreateCompany,
  listenDeleteCompany,
  listenGetCompanies,
  listenGetCompanyDetails,
  listenUpdateCompany,
} from "@/modules/companies/redux/companySaga";
import { listenAiChat } from "@/modules/ai-agent/redux/aiAgentSaga";
import { listenAddPayment, listenGenerateInvoice, listenGetInvoiceDetails, listenGetInvoices, listenGetInvoiceTimeline, listenSendInvoice } from "@/modules/invoice/redux/invoiceSaga";

export default function* rootSaga() {
  yield all([
    listenLogin(),
    listenLogout(),
    listenGetCustomers(),
    listenCreateCustomer(),
    listenDeleteCustomer(),
    listenUpdateCustomer(),
    listenGetProducts(),
    listenCreateProduct(),
    listenDeleteProduct(),
    listenUpdateProduct(),
    listenGetCompanies(),
    listenCreateCompany(),
    listenDeleteCompany(),
    listenUpdateCompany(),
    listenGetCompanyDetails(),
    listenGetQuotations(),
    listenCreateQuotation(),
    listenDeleteQuotation(),
    listenUpdateQuotation(),
    listenGetQuotationDetails(),
    listenGetQuotationHistory(),
    listenGetQuotationTimeline(),
    listenSendQuotation(),
    listenAiChat(),
    listenGetInvoices(),
    listenGetInvoiceDetails(),
    listenGenerateInvoice(),
    listenSendInvoice(),
    listenAddPayment(),
    listenGetInvoiceTimeline(), 
  ]);
}
