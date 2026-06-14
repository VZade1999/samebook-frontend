import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  getRoles,
} from './usersActions';

interface User {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  roles: any[];
  created_at: string;
  updated_at: string;
}

interface UsersState {
  list: User[];
  loading: boolean;
  error: string | null;
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
  roles: any[];
  rolesLoading: boolean;
}

const initialState: UsersState = {
  list: [],
  loading: false,
  error: null,
  pagination: {
    total: 0,
    page: 1,
    limit: 10,
    pages: 0,
  },
  roles: [],
  rolesLoading: false,
};

const usersSlice = createSlice({
  name: 'users',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    // Get Users
    builder.addCase(getUsers.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(getUsers.fulfilled, (state, action: PayloadAction<any>) => {
      state.loading = false;
      state.list = action.payload.users;
      state.pagination = action.payload.pagination;
    });
    builder.addCase(getUsers.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Create User
    builder.addCase(createUser.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(createUser.fulfilled, (state) => {
      state.loading = false;
    });
    builder.addCase(createUser.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Update User
    builder.addCase(updateUser.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(updateUser.fulfilled, (state) => {
      state.loading = false;
    });
    builder.addCase(updateUser.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Delete User
    builder.addCase(deleteUser.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(deleteUser.fulfilled, (state) => {
      state.loading = false;
    });
    builder.addCase(deleteUser.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Get Roles
    builder.addCase(getRoles.pending, (state) => {
      state.rolesLoading = true;
    });
    builder.addCase(getRoles.fulfilled, (state, action: PayloadAction<any>) => {
      state.rolesLoading = false;
      state.roles = action.payload;
    });
    builder.addCase(getRoles.rejected, (state, action) => {
      state.rolesLoading = false;
      state.error = action.payload as string;
    });
  },
});

export default usersSlice.reducer;
