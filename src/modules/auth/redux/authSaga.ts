import { call, put, takeLatest } from "redux-saga/effects";

import {
  ASYNC_LOGIN,
  ASYNC_LOGOUT,
  ASYNC_LOGOUT_FAILED,
  ASYNC_LOGOUT_SUCCESS,
} from "./authActions";
import AuthnService from ".";
import { ASYNC_LOGIN_SUCCESS, ASYNC_LOGIN_FAILED } from "./authActions";
import { StorageService } from "@/storage";
import { MODULES_STORAGE_KEY } from "@/session/session";

const authService = new AuthnService();
const storageService = new StorageService();

function* loginSaga(action: any) {
  try {
    const response = yield call(authService.login, action?.payload);
    if (response.data.success && response.data.data) {
      yield put({
        type: ASYNC_LOGIN_SUCCESS,
        data: response.data,
      });
      const permissions = response.data.data.user.permissions;
      const companyDetails = response.data.data.user.company;
      const userDetails = {
        id: response.data.data.user.id,
        firstName: response.data.data.user.first_name,
        lastName: response.data.data.user.last_name,
        email: response.data.data.user.email,
        role: response.data.data.user.roles,
        phone: response.data.data.user.phone,
      };
      // Auth is enforced via an httpOnly cookie, not this value — it's only a
      // non-sensitive client-side "am I logged in" presence flag for route
      // guarding (see PrivateRoutes/PublicRoutes), so store the user id rather
      // than the actual JWT.
      storageService.setItem(StorageService.STORAGE_KEYS.TOKEN, String(userDetails.id));
      storageService.setItem(
        StorageService.STORAGE_KEYS.PERMISSIONS,
        permissions,
      );
      const modules = response.data.data.user.modules;
      storageService.setItem(
        MODULES_STORAGE_KEY,
        (Array.isArray(modules) ? modules : ["billing"]).join(","),
      );
      storageService.setItem(
        StorageService.STORAGE_KEYS.COMPANY_DETAILS,
        JSON.stringify(companyDetails),
      );
      storageService.setItem(
        StorageService.STORAGE_KEYS.USER_DETAILS,
        JSON.stringify(userDetails),
      );
    } else {
      yield put({ type: ASYNC_LOGIN_FAILED, error: response.data?.message });
    }
  } catch (error: any) {
    yield put({ type: ASYNC_LOGIN_FAILED, error: loginErrorMessage(error) });
  }
}

// Turn transport-level failures into something a person can act on; keep the
// server's own message for everything else (e.g. "Invalid email or password").
function loginErrorMessage(error: any): string {
  const status: number | undefined = error?.response?.status;
  if (!error?.response) {
    return "Can't reach SameBook right now. Check your internet connection and try again.";
  }
  if (status === 429) return "Too many sign-in attempts. Wait a minute, then try again.";
  if (status && status >= 500) return "Something went wrong on our side. Please try again in a moment.";
  return error?.response?.data?.message || error?.message || "Login failed";
}

function* logoutSaga() {
  try {
    const response = yield call(authService.logout);
    if (response.data.success) {
      yield put({
        type: ASYNC_LOGOUT_SUCCESS,
      });
      storageService.removeAllItems();
    } else {
      yield put({ type: ASYNC_LOGOUT_FAILED });
    }
  } catch (error: any) {
    yield put({ type: ASYNC_LOGOUT_FAILED });
  }
}

export function* listenLogin() {
  yield takeLatest(ASYNC_LOGIN, loginSaga);
}

export function* listenLogout() {
  yield takeLatest(ASYNC_LOGOUT, logoutSaga);
}
