import axios from "axios";

const baseURL =
  process.env.REACT_APP_CUSTOMERS_API_URL ||
  "http://localhost:3010";

const apiClient = axios.create({
  baseURL,
  withCredentials: true,
});

export default apiClient;
