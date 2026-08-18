import { createAsyncThunk } from "@reduxjs/toolkit";
import { profileService } from "./profileService";

export const getProfile = createAsyncThunk(
  "profile/getProfile",
  async (_: void, { rejectWithValue }) => {
    try {
      const response = await profileService.getProfile();
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data);
    }
  },
);

export const updateProfile = createAsyncThunk(
  "profile/updateProfile",
  async (payload: any, { rejectWithValue }) => {
    try {
      const response = await profileService.updateProfile(payload);
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data);
    }
  },
);
