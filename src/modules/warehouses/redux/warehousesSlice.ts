import { createSlice } from "@reduxjs/toolkit";
import {
  getWarehouses,
  createWarehouse,
  updateWarehouse,
  deleteWarehouse,
} from "./warehousesActions";

const initialState = {
  list: [] as any[],
  loading: false,
  error: null as any,
};

const warehousesSlice = createSlice({
  name: "warehouses",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(getWarehouses.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(getWarehouses.fulfilled, (state, action) => {
      state.loading = false;
      state.list = action.payload;
    });
    builder.addCase(getWarehouses.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as any;
    });

    builder.addCase(createWarehouse.fulfilled, (state, action) => {
      state.list.push(action.payload);
    });

    builder.addCase(updateWarehouse.fulfilled, (state, action) => {
      const index = state.list.findIndex((w) => w.id === action.payload.id);
      if (index !== -1) state.list[index] = action.payload;
    });

    builder.addCase(deleteWarehouse.fulfilled, (state, action) => {
      state.list = state.list.filter((w) => w.id !== action.payload.id);
    });
  },
});

export default warehousesSlice.reducer;
