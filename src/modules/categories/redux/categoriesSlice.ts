import { createSlice } from "@reduxjs/toolkit";
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from "./categoriesActions";

const initialState = {
  list: [] as any[],
  loading: false,
  error: null as any,
};

const categoriesSlice = createSlice({
  name: "categories",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(getCategories.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(getCategories.fulfilled, (state, action) => {
      state.loading = false;
      state.list = action.payload;
    });
    builder.addCase(getCategories.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as any;
    });

    builder.addCase(createCategory.fulfilled, (state, action) => {
      state.list.push(action.payload);
    });

    builder.addCase(updateCategory.fulfilled, (state, action) => {
      const index = state.list.findIndex((c) => c.id === action.payload.id);
      if (index !== -1) state.list[index] = action.payload;
    });

    builder.addCase(deleteCategory.fulfilled, (state, action) => {
      state.list = state.list.filter((c) => c.id !== action.payload.id);
    });
  },
});

export default categoriesSlice.reducer;
