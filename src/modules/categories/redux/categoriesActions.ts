import { createAsyncThunk } from "@reduxjs/toolkit";
import { categoriesService } from "../services/categoriesService";

export const getCategories = createAsyncThunk(
  "categories/getCategories",
  async (_: void, { rejectWithValue }) => {
    try {
      const response = await categoriesService.listCategories();
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data);
    }
  },
);

export const createCategory = createAsyncThunk(
  "categories/createCategory",
  async (payload: any, { rejectWithValue }) => {
    try {
      const response = await categoriesService.createCategory(payload);
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data);
    }
  },
);

export const updateCategory = createAsyncThunk(
  "categories/updateCategory",
  async (
    params: { id: number; payload: any },
    { rejectWithValue },
  ) => {
    try {
      const response = await categoriesService.updateCategory(
        params.id,
        params.payload,
      );
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data);
    }
  },
);

export const deleteCategory = createAsyncThunk(
  "categories/deleteCategory",
  async (id: number, { rejectWithValue }) => {
    try {
      const response = await categoriesService.deleteCategory(id);
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data);
    }
  },
);
