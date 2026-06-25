import axios from "axios";

const instance = axios.create({
  baseURL: "https://samebook-authn-backend-git-main-vzade1999s-projects.vercel.app",
  
  withCredentials: true,
});

export default instance;
