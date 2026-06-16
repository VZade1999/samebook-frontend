import { createSlice } from '@reduxjs/toolkit';

import {
  getRoles,
  createRole,
  updateRole,
  deleteRole,
  getRolePermissions,
} from './rolesActions';

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

  selectedRolePermissions: [],
};

const rolesSlice = createSlice({
  name: 'roles',
  initialState,
  reducers: {},

  extraReducers: (builder) => {
    builder.addCase(
      getRoles.pending,
      (state) => {
        state.loading = true;
      },
    );

    builder.addCase(
      getRoles.fulfilled,
      (state, action) => {
        state.loading = false;
        state.list =
          action.payload.roles;
        state.pagination =
          action.payload.pagination;
      },
    );

    builder.addCase(
      getRoles.rejected,
      (state, action) => {
        state.loading = false;
        state.error =
          action.payload as any;
      },
    );

    builder.addCase(
      getRolePermissions.fulfilled,
      (state, action) => {
        state.selectedRolePermissions =
          action.payload.permissions;
      },
    );
  },
});

export default rolesSlice.reducer;