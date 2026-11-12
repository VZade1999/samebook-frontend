import type { FeatureManifest } from "./types";
import attendanceFeature from "@/modules/attendance/feature";
import tasksFeature from "@/modules/tasks/feature";

// Every pluggable feature, in sidebar order. To add one: create its manifest
// (routes + sidebar) and list it here, and add its reducers to ./reducers.ts.
export const FEATURES: FeatureManifest[] = [tasksFeature, attendanceFeature];
