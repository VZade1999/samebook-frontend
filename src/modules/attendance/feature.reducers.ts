import attendanceReducer from "./redux/attendanceSlice";
import leaveReducer from "@/modules/leave/redux/leaveSlice";

// State keys are part of the feature's contract — its pages read
// state.attendance and state.leave.
const attendanceReducers = {
  attendance: attendanceReducer,
  leave: leaveReducer,
};

export default attendanceReducers;
