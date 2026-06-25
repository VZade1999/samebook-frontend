import axios from "axios";

const instance = axios.create({
  baseURL: "https://samebook-authn-backend.vercel.app",
  
  withCredentials: true,
});

export default instance;
