export const ASYNC_LOGIN = "ASYNC_LOGIN";
export const ASYNC_LOGIN_SUCCESS = "ASYNC_LOGIN_SUCCESS";
export const ASYNC_LOGIN_FAILED = "ASYNC_LOGIN_FAILED";


export const ASYNC_LOGOUT = "ASYNC_LOGOUT";
export const ASYNC_LOGOUT_SUCCESS = "ASYNC_LOGOUT_SUCCESS";
export const ASYNC_LOGOUT_FAILED = "ASYNC_LOGOUT_FAILED";

export const ASYNC_FORGOT_PASSWORD = "ASYNC_FORGOT_PASSWORD";
export const ASYNC_FORGOT_PASSWORD_SUCCESS = "ASYNC_FORGOT_PASSWORD_SUCCESS";
export const ASYNC_FORGOT_PASSWORD_FAILED = "ASYNC_FORGOT_PASSWORD_FAILED";

export const RESET_AUTH_STATE = "RESET_AUTH_STATE";
export const UNAUTHORIZED = "UNAUTHORIZED";

export const login = (payload) => {
  return {
    type: ASYNC_LOGIN,
    payload,
  };
};

export const logout = () => {
  return {
    type: ASYNC_LOGOUT,
  };
};

export const doForgotPassword = (payload) => {
  return {
    type: ASYNC_FORGOT_PASSWORD,
    payload,
  };
};
