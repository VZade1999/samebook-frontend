import React, { Suspense } from "react";
import { Spin } from "antd";
import { AppstoreAddOutlined, LockOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useModules } from "@/session/useModules";
import { useAccess } from "@/permissions/useAccess";
import ProtectedRoute from "@/permissions/ProtectedRoute";
import "./features.scss";

const FeatureNotEnabled: React.FC<{ name: string }> = ({ name }) => {
  const navigate = useNavigate();
  const { can } = useAccess();
  const canManage = can("company.modules.manage");
  return (
    <div className="ft-locked">
      <div className="ft-locked-card">
        <div className="ft-locked-icon"><LockOutlined /></div>
        <h2>{name} isn't enabled</h2>
        <p>
          {canManage
            ? `Connect ${name} from Apps & Add-ons to start using it. It's free.`
            : `Your company hasn't turned on ${name}. Ask your company admin to connect it.`}
        </p>
        {canManage && (
          <button className="ft-btn" onClick={() => navigate("/app/settings/apps")}>
            <AppstoreAddOutlined /> Go to Apps &amp; Add-ons
          </button>
        )}
      </div>
    </div>
  );
};

/**
 * Route gate for features: add-on first (shows a "not enabled" screen instead
 * of silently redirecting), then the usual permission check, then a Suspense
 * boundary for the lazily-loaded page.
 */
const ModuleRoute: React.FC<{
  module?: string;
  name: string;
  permission?: string;
  children: React.ReactNode;
}> = ({ module, name, permission, children }) => {
  const { hasModule, loaded } = useModules();

  if (module && !hasModule(module)) {
    // Before the first session sync, stored modules may be stale — wait.
    if (!loaded) {
      return (
        <div className="ft-loading"><Spin /></div>
      );
    }
    return <FeatureNotEnabled name={name} />;
  }

  const page = (
    <Suspense fallback={<div className="ft-loading"><Spin /></div>}>{children}</Suspense>
  );
  return permission ? <ProtectedRoute permission={permission}>{page}</ProtectedRoute> : page;
};

export default ModuleRoute;
