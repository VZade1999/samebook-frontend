import { createAsyncThunk } from "@reduxjs/toolkit";
import { warehousesService } from "../services/warehousesService";

export const getWarehouses = createAsyncThunk(
  "warehouses/getWarehouses",
  async (_: void, { rejectWithValue }) => {
    try {
      const response = await warehousesService.listWarehouses();
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data);
    }
  },
);

export const createWarehouse = createAsyncThunk(
  "warehouses/createWarehouse",
  async (payload: any, { rejectWithValue }) => {
    try {
      const response = await warehousesService.createWarehouse(payload);
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data);
    }
  },
);

export const updateWarehouse = createAsyncThunk(
  "warehouses/updateWarehouse",
  async (
    params: { id: number; payload: any },
    { rejectWithValue },
  ) => {
    try {
      const response = await warehousesService.updateWarehouse(
        params.id,
        params.payload,
      );
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data);
    }
  },
);

export const deleteWarehouse = createAsyncThunk(
  "warehouses/deleteWarehouse",
  async (id: number, { rejectWithValue }) => {
    try {
      const response = await warehousesService.deleteWarehouse(id);
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data);
    }
  },
);
