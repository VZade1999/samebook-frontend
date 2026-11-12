import attendanceReducers from "@/modules/attendance/feature.reducers";

// Reducers of pluggable features, merged into the root reducer. Kept separate
// from the manifests in ./registry so the store never imports feature pages.
// Reducers are always registered (cheap) even when the add-on is off, so the
// state shape never changes at runtime.
export const featureReducers = {
  ...attendanceReducers,
};
