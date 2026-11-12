import type { ReactNode } from "react";

/**
 * A pluggable feature. The app shell (sidebar, router) renders features from
 * the registry instead of importing them directly, so adding or removing a
 * feature is one line in features/registry.ts (+ features/reducers.ts).
 *
 * `module` ties the feature to a company add-on (see the backend module
 * catalog). Leave it undefined for features that are always on.
 */
export interface FeatureRoute {
  /** Path relative to /app, e.g. "/attendance". */
  path: string;
  element: ReactNode;
  /** Permission required to open the route. */
  permission?: string;
}

export interface FeatureSidebarItem {
  key: string;
  label: string;
  icon?: ReactNode;
  /** Shown if the user has this permission… */
  permission?: string;
  /** …or any of these. */
  anyPermission?: string[];
  children?: FeatureSidebarItem[];
}

export interface FeatureManifest {
  key: string;
  module?: string;
  /** Human name, used on the "feature not enabled" screen. */
  name: string;
  routes: FeatureRoute[];
  sidebar: FeatureSidebarItem[];
}
