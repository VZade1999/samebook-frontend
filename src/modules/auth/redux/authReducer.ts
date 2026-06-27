import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  ASYNC_LOGIN_SUCCESS,
  RESET_AUTH_STATE,
  ASYNC_LOGOUT_SUCCESS,
  UNAUTHORIZED,
  ASYNC_LOGIN,
  ASYNC_FORGOT_PASSWORD_FAILED,
  ASYNC_LOGIN_FAILED,
  ASYNC_LOGOUT_FAILED,
} from "./authActions";

interface AuthState {
  loading: boolean;
  token: string | null;
  permissions: string[];
  user: any;
  error: string | null;
}

const initialState: AuthState = {
  loading: false,
  token: null,
  permissions: [],
  user: null,
  error: null,
};

export const authReducer = (state = initialState, action:any) => {
  switch (action.type) {
     case ASYNC_LOGIN:
          return {
            ...state,
            loading: true,
          };
    case ASYNC_LOGIN_SUCCESS: {
      return {
        ...state,
        login: true,
        isLoggedIn: true,
        loading: false,
        user: action.data.data.user,
        error: null,
      };
    }

        case ASYNC_LOGIN_FAILED:
        case ASYNC_LOGOUT_FAILED:
        case ASYNC_FORGOT_PASSWORD_FAILED:

          return {
            ...state,
            loading: false,
            error: action.error,
          };

    // case actions.ASYNC_FORGOT_PASSWORD_SUCCESS: {
    //   return {
    //     ...state,
    //     login: true,
    //     forgotPasswordSent: true,
    //   };
    // }

    // case actions.ASYNC_FORGOT_PASSWORD_FAILED: {
    //   return {
    //     ...state,
    //   };
    // }

    // case actions.ASYNC_CONFIRM_FORGOT_PASSWORD_SUCCESS: {
    //   return {
    //     ...state,
    //     login: true,
    //     passwordResetSuccess: true,
    //   };
    // }

    // case actions.ASYNC_CONFIRM_FORGOT_PASSWORD_FAILED: {
    //   return {
    //     ...state,
    //   };
    // }

    case ASYNC_LOGOUT_SUCCESS: {
      return { ...state, login: false, isLoggedIn: false };
    }

    case RESET_AUTH_STATE: {
      return initialState;
    }

    case UNAUTHORIZED: {
      return {
        ...state,
        isLoggedIn: false,
        token: false,
      };
    }

    default: {
      return state;
    }
  }
};
