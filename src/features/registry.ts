import type { FeatureManifest } from "./types";
import attendanceFeature from "@/modules/attendance/feature";
import tasksFeature from "@/modules/tasks/feature";
import driveFeature from "@/modules/drive/feature";
import crmFeature from "@/modules/crm/feature";
import aiFeature from "@/modules/ai-agent/feature";
import purchasesFeature from "@/modules/purchases/feature";
import accountsFeature from "@/modules/accounts/feature";

// Every pluggable feature, in sidebar order. To add one: create its manifest
// (routes + sidebar) and list it here, and add its reducers to ./reducers.ts.
// A feature with placement "sales" shows after Invoice instead of at the top.
export const FEATURES: FeatureManifest[] = [aiFeature, crmFeature, tasksFeature, driveFeature, attendanceFeature, purchasesFeature, accountsFeature];
