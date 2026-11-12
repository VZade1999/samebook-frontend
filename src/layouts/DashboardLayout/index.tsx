import React, { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import HeaderBar from "./Header";
import "./styles.scss";
import { useDispatch } from "react-redux";
import { SESSION_STALE_EVENT, syncSession } from "@/session/session";

interface Props {
  children: React.ReactNode;
}

const SIDEBAR_COLLAPSED_KEY = "sidebar_collapsed";

const DashboardLayout = ({ children }: Props) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(
    () => localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1",
  );

  // Keep access (permissions + enabled add-ons) in sync with the server: on
  // load, when the tab regains focus, and when an API reports a disabled
  // add-on. This is what lets a connected/disconnected add-on show up or
  // disappear without logging out and in again.
  const dispatch = useDispatch();
  useEffect(() => {
    let last = 0;
    const sync = (force = false) => {
      const now = Date.now();
      if (!force && now - last < 30_000) return;
      last = now;
      syncSession(dispatch);
    };
    sync(true);
    const onFocus = () => sync();
    const onStale = () => sync(true);
    window.addEventListener("focus", onFocus);
    window.addEventListener(SESSION_STALE_EVENT, onStale);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener(SESSION_STALE_EVENT, onStale);
    };
  }, [dispatch]);

  useEffect(() => {
    const check = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (!mobile) setSidebarOpen(false);
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const closeSidebar = () => setSidebarOpen(false);
  const toggleSidebar = () => setSidebarOpen((v) => !v);
  const toggleDesktopCollapse = () =>
    setDesktopCollapsed((v) => {
      const next = !v;
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? "1" : "0");
      return next;
    });

  return (
    <div className="dashboard-layout">
      {/* Mobile overlay */}
      {isMobile && sidebarOpen && (
        <div className="sidebar-overlay" onClick={closeSidebar} />
      )}

      {/* Sidebar */}
      <div
        className={`sidebar-wrapper${isMobile ? (sidebarOpen ? " sidebar-wrapper--open" : " sidebar-wrapper--hidden") : ""}${!isMobile && desktopCollapsed ? " sidebar-wrapper--collapsed" : ""}`}
      >
        <Sidebar
          collapsed={!isMobile && desktopCollapsed}
          onClose={closeSidebar}
          onToggleCollapse={!isMobile ? toggleDesktopCollapse : undefined}
        />
      </div>

      {/* Main */}
      <div className="dashboard-main">
        <HeaderBar onMenuClick={toggleSidebar} />
        <main className="dashboard-content">
          <div className="dashboard-container">{children}</div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;