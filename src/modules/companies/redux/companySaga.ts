import { call, put, takeLatest } from "redux-saga/effects";
import CompanyService from ".";
import {
  ASYNC_GET_COMPANIES,
  ASYNC_GET_COMPANIES_SUCCESS,
  ASYNC_GET_COMPANIES_FAILED,
  ASYNC_CREATE_COMPANY,
  ASYNC_CREATE_COMPANY_SUCCESS,
  ASYNC_CREATE_COMPANY_FAILED,
  ASYNC_UPDATE_COMPANY,
  ASYNC_UPDATE_COMPANY_SUCCESS,
  ASYNC_UPDATE_COMPANY_FAILED,
  ASYNC_DELETE_COMPANY,
  ASYNC_DELETE_COMPANY_FAILED,
  ASYNC_GET_COMPANY_DETAILS,
  ASYNC_GET_COMPANY_DETAILS_SUCCESS,
  ASYNC_GET_COMPANY_DETAILS_FAILED,
} from "./companyActions";
import { notification } from "antd";
import { StorageService } from "@/storage";
const storageService = new StorageService();

const companyService = new CompanyService();

function* getCompaniesSaga(action: any): any {
  try {
    const response = yield call(companyService.getCompanies, action?.payload);
    if (response.data.success) {
      yield put({ type: ASYNC_GET_COMPANIES_SUCCESS, data: response.data.data });
    } else {
      yield put({ type: ASYNC_GET_COMPANIES_FAILED, error: response.data.message });
    }
  } catch (error: any) {
    yield put({ type: ASYNC_GET_COMPANIES_FAILED, error: error?.message });
  }
}

function* createCompanySaga(action: any): any {
  try {
    const response = yield call(companyService.createCompany, action?.payload);
    if (response.data.success) {
      notification["success"]({
        message: "Company Created",
        description: response.data.message,
      });
      yield put({ type: ASYNC_CREATE_COMPANY_SUCCESS, data: response.data.data });
      yield put({ type: ASYNC_GET_COMPANIES, payload: action?.meta });
    } else {
      notification["error"]({
        message: "Create Failed",
        description: response.data.message,
      });
      yield put({ type: ASYNC_CREATE_COMPANY_FAILED, error: response.data.message });
    }
  } catch (error: any) {
    notification["error"]({
      message: "Create Failed",
      description: error?.message,
    });
    yield put({ type: ASYNC_CREATE_COMPANY_FAILED, error: error?.message });
  }
}

function* updateCompanySaga(action: any): any {
  try {
    const response = yield call(companyService.updateCompany, action?.payload);
    if (response.data.success) {
      notification["success"]({
        message: "Company Updated",
        description: response.data.message,
      });
      yield put({ type: ASYNC_UPDATE_COMPANY_SUCCESS, data: response.data.data });
      yield put({ type: ASYNC_GET_COMPANIES, payload: action?.meta });
    } else {
      notification["error"]({
        message: "Update Failed",
        description: response.data.message,
      });
      yield put({ type: ASYNC_UPDATE_COMPANY_FAILED, error: response.data.message });
    }
  } catch (error: any) {
    notification["error"]({
      message: "Update Failed",
      description: error?.message,
    });
    yield put({ type: ASYNC_UPDATE_COMPANY_FAILED, error: error?.message });
  }
}

function* deleteCompanySaga(action: any): any {
  try {
    const response = yield call(companyService.deleteCompany, action?.payload);
    if (response.data.success) {
      notification["success"]({
        message: "Company Deleted",
        description: response.data.message,
      });
      yield put({ type: ASYNC_GET_COMPANIES, payload: action?.meta });
    } else {
      yield put({ type: ASYNC_DELETE_COMPANY_FAILED, error: response.data.message });
    }
  } catch (error: any) {
    yield put({ type: ASYNC_DELETE_COMPANY_FAILED, error: error?.message });
  }
}

export function* listenGetCompanies() {
  yield takeLatest(ASYNC_GET_COMPANIES, getCompaniesSaga);
}

export function* listenCreateCompany() {
  yield takeLatest(ASYNC_CREATE_COMPANY, createCompanySaga);
}

export function* listenUpdateCompany() {
  yield takeLatest(ASYNC_UPDATE_COMPANY, updateCompanySaga);
}

export function* listenDeleteCompany() {
  yield takeLatest(ASYNC_DELETE_COMPANY, deleteCompanySaga);
}

function* getCompanyDetailsSaga(action: any): any {
  try {
    const response = yield call(companyService.getCompanyDetails, action?.payload);
    if (response.data.success) {
      // persist in storage for consistent behavior with auth flow
      try {
        storageService.setItem(StorageService.STORAGE_KEYS.COMPANY_DETAILS, JSON.stringify(response.data.data));
      } catch (e) {}
      yield put({ type: ASYNC_GET_COMPANY_DETAILS_SUCCESS, data: response.data.data });
    } else {
      yield put({ type: ASYNC_GET_COMPANY_DETAILS_FAILED, error: response.data.message });
    }
  } catch (error: any) {
    yield put({ type: ASYNC_GET_COMPANY_DETAILS_FAILED, error: error?.message });
  }
}

export function* listenGetCompanyDetails() {
  yield takeLatest(ASYNC_GET_COMPANY_DETAILS, getCompanyDetailsSaga);
}
