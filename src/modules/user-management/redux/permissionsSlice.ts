import { createSlice } from '@reduxjs/toolkit';

import {
  getPermissions,
} from './permissionsActions';

const initialState = {
  list: [],
  loading: false,
  error: null,

  pagination: {
    total: 0,
    page: 1,
    limit: 10,
    pages: 0,
  },
};

const permissionsSlice =
  createSlice({
    name: 'permissions',

    initialState,

    reducers: {},

    extraReducers: (
      builder,
    ) => {
      builder.addCase(
        getPermissions.pending,
        (state) => {
          state.loading = true;
        },
      );

      builder.addCase(
        getPermissions.fulfilled,
        (state, action) => {
          state.loading = false;
          state.list =
            action.payload.permissions;

          state.pagination =
            action.payload.pagination;
        },
      );

      builder.addCase(
        getPermissions.rejected,
        (state, action) => {
          state.loading = false;
          state.error =
            action.payload as any;
        },
      );
    },
  });

export default permissionsSlice.reducer;