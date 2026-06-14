import { createAsyncThunk } from '@reduxjs/toolkit';
import { usersService } from '../services';

export const getUsers = createAsyncThunk(
  'users/getUsers',
  async (
    params: { page: number; limit: number; search?: string },
    { rejectWithValue },
  ) => {
    try {
      const response = await usersService.listUsers(
        params.page,
        params.limit,
        params.search,
      );
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data);
    }
  },
);

export const createUser = createAsyncThunk(
  'users/createUser',
  async (payload: any, { rejectWithValue }) => {
    try {
      const response = await usersService.createUser(payload);
      return response.data;
    } catch (error: any) {
      const message =
        error.response?.data?.message ||
        error.response?.data ||
        error.message ||
        'Failed to create user';
      return rejectWithValue({ message });
    }
  },
);

export const updateUser = createAsyncThunk(
  'users/updateUser',
  async (params: { id: number; payload: any }, { rejectWithValue }) => {
    try {
      const response = await usersService.updateUser(params.id, params.payload);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data);
    }
  },
);

export const deleteUser = createAsyncThunk(
  'users/deleteUser',
  async (id: number, { rejectWithValue }) => {
    try {
      const response = await usersService.deleteUser(id);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data);
    }
  },
);

export const getRoles = createAsyncThunk(
  'users/getRoles',
  async (_, { rejectWithValue }) => {
    try {
      const response = await usersService.getRoles();
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data);
    }
  },
);
