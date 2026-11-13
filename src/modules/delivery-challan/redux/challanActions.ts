import { createAsyncThunk } from "@reduxjs/toolkit";
import { challanService } from "../services/challanService";
import { errorMessage } from "../constants";

// Every thunk resolves to the response's `data` and rejects with the
// server's message string, so callers can `.unwrap()` and show it directly.
const run = async (fn: () => Promise<any>, rejectWithValue: (v: any) => any) => {
  try {
    const response = await fn();
    if (response?.data?.success === false) {
      return rejectWithValue(response.data.message || "Request failed");
    }
    return response?.data?.data;
  } catch (error: any) {
    return rejectWithValue(errorMessage(error));
  }
};

export const getChallans = createAsyncThunk(
  "challans/getChallans",
  async (params: any, { rejectWithValue }) =>
    run(() => challanService.listChallans(params), rejectWithValue),
);

export const getChallanDetails = createAsyncThunk(
  "challans/getChallanDetails",
  async (id: number | string, { rejectWithValue }) =>
    run(() => challanService.getChallan(id), rejectWithValue),
);

export const createChallan = createAsyncThunk(
  "challans/createChallan",
  async (payload: any, { rejectWithValue }) =>
    run(() => challanService.createChallan(payload), rejectWithValue),
);

export const updateChallan = createAsyncThunk(
  "challans/updateChallan",
  async (params: { id: number | string; payload: any }, { rejectWithValue }) =>
    run(() => challanService.updateChallan(params.id, params.payload), rejectWithValue),
);

export const dispatchChallan = createAsyncThunk(
  "challans/dispatchChallan",
  async (id: number | string, { rejectWithValue }) =>
    run(() => challanService.dispatchChallan(id), rejectWithValue),
);

export const deliverChallan = createAsyncThunk(
  "challans/deliverChallan",
  async (id: number | string, { rejectWithValue }) =>
    run(() => challanService.deliverChallan(id), rejectWithValue),
);

export const cancelChallan = createAsyncThunk(
  "challans/cancelChallan",
  async (params: { id: number | string; reason?: string }, { rejectWithValue }) =>
    run(() => challanService.cancelChallan(params.id, params.reason), rejectWithValue),
);

export const convertChallanToInvoice = createAsyncThunk(
  "challans/convertChallanToInvoice",
  async (
    params: { id: number | string; payment_due_date: string; series_id?: number },
    { rejectWithValue },
  ) =>
    run(
      () => challanService.convertToInvoice(params.id, params.payment_due_date, params.series_id),
      rejectWithValue,
    ),
);

export const deleteChallan = createAsyncThunk(
  "challans/deleteChallan",
  async (id: number | string, { rejectWithValue }) =>
    run(() => challanService.deleteChallan(id), rejectWithValue),
);

export const getChallanActivity = createAsyncThunk(
  "challans/getChallanActivity",
  async (id: number | string, { rejectWithValue }) =>
    run(() => challanService.getActivity(id), rejectWithValue),
);
