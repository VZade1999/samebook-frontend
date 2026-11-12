import { lazy } from "react";
import { CloudOutlined } from "@ant-design/icons";
import type { FeatureManifest } from "@/features/types";

const DrivePage = lazy(() => import("./pages/DrivePage"));

const driveFeature: FeatureManifest = {
  key: "drive",
  module: "drive",
  name: "Drive",
  routes: [{ path: "/drive", element: <DrivePage />, permission: "drive.view" }],
  sidebar: [{ key: "/app/drive", label: "Drive", icon: <CloudOutlined />, permission: "drive.view" }],
};

export default driveFeature;
