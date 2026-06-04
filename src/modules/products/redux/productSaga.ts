import { call, put, takeLatest } from "redux-saga/effects";
import { notification } from "antd";

import ProductService from "./index";
import {
  ASYNC_GET_PRODUCTS,
  ASYNC_GET_PRODUCTS_SUCCESS,
  ASYNC_GET_PRODUCTS_FAILED,
  ASYNC_CREATE_PRODUCT,
  ASYNC_CREATE_PRODUCT_SUCCESS,
  ASYNC_CREATE_PRODUCT_FAILED,
  ASYNC_UPDATE_PRODUCT,
  ASYNC_UPDATE_PRODUCT_SUCCESS,
  ASYNC_UPDATE_PRODUCT_FAILED,
  ASYNC_DELETE_PRODUCT,
  ASYNC_DELETE_PRODUCT_SUCCESS,
  ASYNC_DELETE_PRODUCT_FAILED,
} from "./productActions";

function getProductService() {
  return new ProductService();
}

function* getProductsSaga(action: any): any {
  try {
    const productService = getProductService();
    const response = yield call([productService, productService.getProducts], action?.payload);
    if (response.data.success) {
      yield put({
        type: ASYNC_GET_PRODUCTS_SUCCESS,
        data: response.data.data,
      });
    } else {
      yield put({ type: ASYNC_GET_PRODUCTS_FAILED });
    }
  } catch (error: any) {
    yield put({ type: ASYNC_GET_PRODUCTS_FAILED, error });
  }
}

function* createProductSaga(action: any): any {
  const productService = getProductService();
  let response;
  try {
    response = yield call([productService, productService.createProduct], action?.payload);
    if (response.data?.success && response.data?.data) {
      notification["success"]({
        message: "Product Created",
        description: response.data.message,
      });
      yield put({
        type: ASYNC_CREATE_PRODUCT_SUCCESS,
        data: response.data.data,
      });
      yield put({ type: ASYNC_GET_PRODUCTS });
    } else {
      notification["error"]({
        message: "Product creation failed",
        description: response.data.message,
      });
      yield put({ type: ASYNC_CREATE_PRODUCT_FAILED });
    }
  } catch (error: any) {
    notification["error"]({
      message: "Failed while creating product",
      description: error?.response?.data?.message || response?.data?.message || "",
    });
    yield put({ type: ASYNC_CREATE_PRODUCT_FAILED, error });
  }
}

function* deleteProductSaga(action: any): any {
  const productService = getProductService();
  try {
    const response = yield call([productService, productService.deleteProduct], action?.payload);
    if (response.data.success) {
      yield put({
        type: ASYNC_GET_PRODUCTS,
        payload: action?.meta,
      });
    } else {
      yield put({ type: ASYNC_DELETE_PRODUCT_FAILED });
    }
  } catch (error: any) {
    const normalizedError =
      error?.response?.data?.message || error?.message || String(error);
    yield put({ type: ASYNC_DELETE_PRODUCT_FAILED, error: normalizedError });
  }
}

function* updateProductSaga(action: any): any {
  const productService = getProductService();
  let response;
  try {
    response = yield call([productService, productService.updateProduct], action?.payload);
    if (response.data?.success && response.data?.data) {
      notification["success"]({
        message: "Product Updated",
        description: response.data.message,
      });
      yield put({
        type: ASYNC_UPDATE_PRODUCT_SUCCESS,
        data: response.data.data,
      });
      yield put({
        type: ASYNC_GET_PRODUCTS,
        payload: action?.meta,
      });
    } else {
      notification["error"]({
        message: "Update Failed",
        description: response.data.message,
      });
      yield put({ type: ASYNC_UPDATE_PRODUCT_FAILED });
    }
  } catch (error: any) {
    notification["error"]({
      message: "Failed while updating product",
      description: error?.response?.data?.message || response?.data?.message || "",
    });
    yield put({ type: ASYNC_UPDATE_PRODUCT_FAILED, error });
  }
}

export function* listenGetProducts() {
  yield takeLatest(ASYNC_GET_PRODUCTS, getProductsSaga);
}

export function* listenCreateProduct() {
  yield takeLatest(ASYNC_CREATE_PRODUCT, createProductSaga);
}

export function* listenDeleteProduct() {
  yield takeLatest(ASYNC_DELETE_PRODUCT, deleteProductSaga);
}

export function* listenUpdateProduct() {
  yield takeLatest(ASYNC_UPDATE_PRODUCT, updateProductSaga);
}
