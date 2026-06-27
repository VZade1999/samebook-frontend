import axios from "axios";

const instance = axios.create({
  baseURL:  process.env.REACT_APP_AUTHN_API_URL || "https://samebook-customer-backend-dev.vercel.app",
  
  withCredentials: true,
});

export default instance;
