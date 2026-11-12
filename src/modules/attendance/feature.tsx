import React, { lazy } from "react";
import { FieldTimeOutlined, TeamOutlined } from "@ant-design/icons";
import type { FeatureManifest } from "@/features/types";

// Pages are lazy-loaded: companies without the add-on never download them,
// and the store (which imports only ./feature.reducers) never pulls in pages.
const AttendancePage = lazy(() => import("./pages/AttendancePage"));
const TeamAttendancePage = lazy(() => import("./pages/TeamAttendancePage"));

const attendanceFeature: FeatureManifest = {
  key: "attendance",
  module: "attendance",
  name: "Attendance & Leave",
  routes: [
    { path: "/attendance", element: <AttendancePage />, permission: "attendance.view" },
    { path: "/attendance/team", element: <TeamAttendancePage />, permission: "attendance.manage" },
  ],
  sidebar: [
    {
      key: "attendance-management",
      label: "Attendance",
      icon: <FieldTimeOutlined />,
      anyPermission: ["attendance.view", "attendance.manage"],
      children: [
        { key: "/app/attendance", label: "My Attendance", icon: <FieldTimeOutlined />, permission: "attendance.view" },
        { key: "/app/attendance/team", label: "Team Attendance", icon: <TeamOutlined />, permission: "attendance.manage" },
      ],
    },
  ],
};

export default attendanceFeature;
