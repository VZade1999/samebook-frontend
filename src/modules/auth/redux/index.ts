import logMessage from "../../../utils/logger";
import instance from "./instance";

class AuthnService {
  login = async (payload:any) => {
    try {
      return await instance.post(`/auth/login`, payload);
    } catch (error) {
      logMessage("[auth error]", error);
      throw error;
    }
  };

  forgotPassword = async (payload:any) => {
    try {
      return await instance.post(`/auth/forgot-password`, payload);
    } catch (error) {
      logMessage("[forgot password error]", error);
      throw error;
    }
  };

  confirmForgotPassword = async (payload:any) => {
    try {
      return await instance.post(`/auth/confirm-forgot-password`, payload);
    } catch (error) {
      logMessage("[confirm forgot password error]", error);
      throw error;
    }
  };

  logout = async () => {
    try {
      return await instance.post(`/auth/logout`);
    } catch (error) {
      logMessage("[Logout error]", error);
      throw error;
    }
  };
}

export default AuthnService;
