import { createAsyncThunk } from '@reduxjs/toolkit';
import { rolesService } from '../services/rolesService';

export const getRoles = createAsyncThunk(
  'roles/getRoles',
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
        await rolesService.listRoles(
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

export const createRole =
  createAsyncThunk(
    'roles/createRole',
    async (
      payload: any,
      { rejectWithValue },
    ) => {
      try {
        const response =
          await rolesService.createRole(
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

export const updateRole =
  createAsyncThunk(
    'roles/updateRole',
    async (
      params: {
        id: number;
        payload: any;
      },
      { rejectWithValue },
    ) => {
      try {
        const response =
          await rolesService.updateRole(
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

export const deleteRole =
  createAsyncThunk(
    'roles/deleteRole',
    async (
      id: number,
      { rejectWithValue },
    ) => {
      try {
        const response =
          await rolesService.deleteRole(
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

export const getRolePermissions =
  createAsyncThunk(
    'roles/getRolePermissions',
    async (
      id: number,
      { rejectWithValue },
    ) => {
      try {
        const response =
          await rolesService.getRolePermissions(
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

export const assignRolePermissions =
  createAsyncThunk(
    'roles/assignRolePermissions',
    async (
      params: {
        id: number;
        permission_ids: number[];
      },
      { rejectWithValue },
    ) => {
      try {
        const response =
          await rolesService.assignRolePermissions(
            params.id,
            params.permission_ids,
          );

        return response.data;
      } catch (error: any) {
        return rejectWithValue(
          error.response?.data,
        );
      }
    },
  );