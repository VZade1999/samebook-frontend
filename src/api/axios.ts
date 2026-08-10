import axios from "axios";

const baseURL =
  process.env.REACT_APP_CUSTOMERS_API_URL ||
  "https://samebook-customer-backend-dev.vercel.app";

const apiClient = axios.create({
  baseURL,
  withCredentials: true,
});

export default apiClient;
