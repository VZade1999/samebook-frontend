import { createAsyncThunk } from "@reduxjs/toolkit";
import { leaveService } from "../services/leaveService";

export const requestLeave = createAsyncThunk(
  "leave/requestLeave",
  async (
    payload: { from_date: string; to_date: string; reason: string },
    { rejectWithValue },
  ) => {
    try {
      const response = await leaveService.requestLeave(payload);
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data);
    }
  },
);

export const getMyLeaves = createAsyncThunk(
  "leave/getMyLeaves",
  async (_: void, { rejectWithValue }) => {
    try {
      const response = await leaveService.getMyLeaves();
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data);
    }
  },
);

export const getTeamLeaves = createAsyncThunk(
  "leave/getTeamLeaves",
  async (status: string | undefined, { rejectWithValue }) => {
    try {
      const response = await leaveService.getTeamLeaves(status);
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data);
    }
  },
);

export const approveLeave = createAsyncThunk(
  "leave/approveLeave",
  async (id: number, { rejectWithValue }) => {
    try {
      const response = await leaveService.approveLeave(id);
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data);
    }
  },
);

export const rejectLeave = createAsyncThunk(
  "leave/rejectLeave",
  async (
    params: { id: number; review_note?: string },
    { rejectWithValue },
  ) => {
    try {
      const response = await leaveService.rejectLeave(params.id, params.review_note);
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data);
    }
  },
);
