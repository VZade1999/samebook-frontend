import { combineReducers } from "@reduxjs/toolkit";

import { authReducer } from "../modules/auth/redux/authReducer";
import { customerReducer } from "@/modules/customers/redux/customerReducer";
import { productReducer } from "@/modules/products/redux/productReducer";
import { quotationReducer } from "@/modules/quotation/redux/quotationReducer";
import { companyReducer } from "@/modules/companies/redux/companyReducer";
import aiAgentReducer from "@/modules/ai-agent/redux/aiAgentReducer";
import usersReducer from "@/modules/users/redux/usersSlice";
import rolesReducer from "@/modules/user-management/redux/rolesSlice";
import permissionsReducer from "@/modules/user-management/redux/permissionsSlice";
import { invoiceReducer } from "@/modules/invoice/redux/invoiceReducer";
import categoriesReducer from "@/modules/categories/redux/categoriesSlice";
import warehousesReducer from "@/modules/warehouses/redux/warehousesSlice";
const rootReducer = combineReducers({
  authn: authReducer,
  customers: customerReducer,
  products: productReducer,
  quotations: quotationReducer,
  companies: companyReducer,
  aiAgent: aiAgentReducer,
  users: usersReducer,
  roles: rolesReducer,
  permissions: permissionsReducer,
  invoice: invoiceReducer,
  categories: categoriesReducer,
  warehouses: warehousesReducer,
});

export default rootReducer;
