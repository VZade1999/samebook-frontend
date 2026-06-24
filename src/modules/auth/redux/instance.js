import axios from "axios";

const instance = axios.create({
  baseURL: process.env.REACT_APP_AUTHN_API_URL || "http://localhost:3020",
  withCredentials: true,
});

export default instance;
