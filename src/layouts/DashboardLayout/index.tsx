import React, { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import HeaderBar from "./Header";
import "./styles.scss";

interface Props {
  children: React.ReactNode;
}

const DashboardLayout = ({ children }: Props) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

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

  return (
    <div className="dashboard-layout">
      {/* Mobile overlay */}
      {isMobile && sidebarOpen && (
        <div className="sidebar-overlay" onClick={closeSidebar} />
      )}

      {/* Sidebar */}
      <div className={`sidebar-wrapper${isMobile ? (sidebarOpen ? " sidebar-wrapper--open" : " sidebar-wrapper--hidden") : ""}`}>
        <Sidebar onClose={closeSidebar} />
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