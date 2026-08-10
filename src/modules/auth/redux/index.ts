import logMessage from "../../../utils/logger";
import apiClient from "@/api/axios";

class AuthnService {
  login = async (payload:any) => {
    try {
      return await apiClient.post(`/auth/login`, payload);
    } catch (error) {
      logMessage("[auth error]", error);
      throw error;
    }
  };

  refresh = async () => {
    try {
      return await apiClient.post(`/auth/refresh`);
    } catch (error) {
      logMessage("[refresh error]", error);
      throw error;
    }
  };

  forgotPassword = async (payload:any) => {
    try {
      return await apiClient.post(`/auth/forgot-password`, payload);
    } catch (error) {
      logMessage("[forgot password error]", error);
      throw error;
    }
  };

  confirmForgotPassword = async (payload:any) => {
    try {
      return await apiClient.post(`/auth/confirm-forgot-password`, payload);
    } catch (error) {
      logMessage("[confirm forgot password error]", error);
      throw error;
    }
  };

  logout = async () => {
    try {
      return await apiClient.post(`/auth/logout`);
    } catch (error) {
      logMessage("[Logout error]", error);
      throw error;
    }
  };
}

export default AuthnService;
