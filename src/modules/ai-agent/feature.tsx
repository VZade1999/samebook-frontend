import React, { lazy } from "react";
import { RobotOutlined } from "@ant-design/icons";
import type { FeatureManifest } from "@/features/types";

const AiAssistantPage = lazy(() => import("./AiAssistantPage"));

/** The AI Assistant add-on: one page, shown when the company has switched it on. */
const aiFeature: FeatureManifest = {
  key: "ai_agent",
  module: "ai_agent",
  name: "AI Assistant",
  routes: [{ path: "/ai-agent", element: <AiAssistantPage />, permission: "ai_agent.view" }],
  sidebar: [{ key: "/app/ai-agent", label: "AI Assistant", icon: <RobotOutlined />, permission: "ai_agent.view" }],
};

export default aiFeature;
