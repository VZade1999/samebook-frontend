import { call, put, takeLatest } from "redux-saga/effects";

import axios from "axios";
import {
  ASYNC_LOGIN,
  ASYNC_LOGOUT,
  ASYNC_LOGOUT_FAILED,
  ASYNC_LOGOUT_SUCCESS,
} from "./authActions";
import AuthnService from ".";
import { ASYNC_LOGIN_SUCCESS, ASYNC_LOGIN_FAILED } from "./authActions";
import { StorageService } from "@/storage";

const authService = new AuthnService();
const storageService = new StorageService();

function* loginSaga(action) {
  try {
    const response = yield call(authService.login, action?.payload);
    if (response.data.success) {
      yield put({
        type: ASYNC_LOGIN_SUCCESS,
        data: response.data,
      });
      const token = response.data.data.accessToken;
      const permissions = response.data.data.user.permissions;
      const companyDetails = response.data.data.user.company;
      const userDetails = {
        id: response.data.data.user.id,
        firstName: response.data.data.user.first_name,
        lastName: response.data.data.user.last_name,
        email: response.data.data.user.email,
        role: response.data.data.user.roles,
        phone: response.data.data.user.phone,
      }
      storageService.setItem(StorageService.STORAGE_KEYS.TOKEN, token);
      storageService.setItem(
        StorageService.STORAGE_KEYS.PERMISSIONS,
        permissions
      );
      storageService.setItem(
        StorageService.STORAGE_KEYS.COMPANY_DETAILS,
        JSON.stringify(companyDetails)
      );
      storageService.setItem(
        StorageService.STORAGE_KEYS.USER_DETAILS,
        JSON.stringify(userDetails)
      );
    } else {
      yield put({ type: ASYNC_LOGIN_FAILED });
    }
  } catch (error: any) {
    yield put({ type: ASYNC_LOGIN_FAILED });
  }
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
