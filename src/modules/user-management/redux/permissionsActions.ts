import { createAsyncThunk } from '@reduxjs/toolkit';
import { permissionsService } from '../services/permissionsService';

export const getPermissions =
  createAsyncThunk(
    'permissions/getPermissions',
    async (
      params: {
        page: number;
        limit: number;
        search?: string;
      },
      { rejectWithValue },
    ) => {
      try {
        const response =
          await permissionsService.listPermissions(
            params.page,
            params.limit,
            params.search,
          );

        return response.data;
      } catch (error: any) {
        return rejectWithValue(
          error.response?.data,
        );
      }
    },
  );

export const createPermission =
  createAsyncThunk(
    'permissions/createPermission',
    async (
      payload: any,
      { rejectWithValue },
    ) => {
      try {
        const response =
          await permissionsService.createPermission(
            payload,
          );

        return response.data;
      } catch (error: any) {
        return rejectWithValue(
          error.response?.data,
        );
      }
    },
  );

export const updatePermission =
  createAsyncThunk(
    'permissions/updatePermission',
    async (
      params: {
        id: number;
        payload: any;
      },
      { rejectWithValue },
    ) => {
      try {
        const response =
          await permissionsService.updatePermission(
            params.id,
            params.payload,
          );

        return response.data;
      } catch (error: any) {
        return rejectWithValue(
          error.response?.data,
        );
      }
    },
  );

export const deletePermission =
  createAsyncThunk(
    'permissions/deletePermission',
    async (
      id: number,
      { rejectWithValue },
    ) => {
      try {
        const response =
          await permissionsService.deletePermission(
            id,
          );

        return response.data;
      } catch (error: any) {
        return rejectWithValue(
          error.response?.data,
        );
      }
    },
  );