import { combineReducers } from "@reduxjs/toolkit";

import { authReducer } from "../modules/auth/redux/authReducer";
import { customerReducer } from "@/modules/customers/redux/customerReducer";
import { productReducer } from "@/modules/products/redux/productReducer";
import { quotationReducer } from "@/modules/quotation/redux/quotationReducer";
import { companyReducer } from "@/modules/companies/redux/companyReducer";
import aiAgentReducer from "@/modules/ai-agent/redux/aiAgentReducer";
import usersReducer from "@/modules/users/redux/usersSlice";

const rootReducer = combineReducers({
  authn: authReducer,
  customers: customerReducer,
  products: productReducer,
  quotations: quotationReducer,
  companies: companyReducer,
  aiAgent: aiAgentReducer,
  users: usersReducer,
});

export default rootReducer;
