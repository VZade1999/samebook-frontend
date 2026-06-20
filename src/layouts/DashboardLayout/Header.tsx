import { Dropdown, Avatar } from "antd";
import React from "react";
import {
  UserOutlined,
  LogoutOutlined,
  BellOutlined,
  SunOutlined,
  MoonOutlined,
  MenuOutlined,
  CrownOutlined,
} from "@ant-design/icons";
import ThemeToggle from "@/components/ThemeToggle";
import { useDispatch, useSelector } from "react-redux";
import { logout } from "../../modules/auth/redux/authActions";
import { StorageService } from "@/storage";
import { RootState } from "@/app/store";
import { useNavigate } from "react-router-dom";

interface HeaderBarProps {
  onMenuClick?: () => void;
}

const HeaderBar = ({ onMenuClick }: HeaderBarProps) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const storageService = new StorageService();

  const handleLogout = () => {
    dispatch(logout());
  };

  const items = [
    {
      key: "profile",
      icon: <UserOutlined />,
      label: "My Profile",
      onClick: () => {
        // Navigate to profile page
        navigate("/app/profile");
      }
    },
    { type: "divider" as const },
    {
      key: "logout",
      icon: <LogoutOutlined />,
      label: "Logout",
      onClick: handleLogout,
      danger: true,
    },
  ];

  const companyName = JSON.parse(
    storageService.getItem(StorageService.STORAGE_KEYS.COMPANY_DETAILS) ?? "{}"
  );

  const userDetails = JSON.parse(
    storageService.getItem(StorageService.STORAGE_KEYS.USER_DETAILS) ?? "{}"
  );  

  return (
    <header className="dashboard-header">
      {/* Hamburger — visible on mobile only */}
      <button
        className="hamburger-btn"
        onClick={onMenuClick}
        aria-label="Toggle sidebar"
      >
        <MenuOutlined />
      </button>

      <span className="header-company">{companyName?.name}</span>

      <div className="header-right">
        {/* Theme toggle */}
        <div className="header-icon-btn">
          <ThemeToggle />
        </div>

        {/* Notifications */}
        <button className="header-icon-btn notif-btn" aria-label="Notifications">
          <BellOutlined />
          <span className="notif-dot" />
        </button>

        {/* Profile dropdown */}
        <Dropdown menu={{ items }} placement="bottomRight" trigger={["click"]}>
          <button className="profile-btn">
            <Avatar
              icon={<UserOutlined />}
              size={30}
              style={{ background: "#e69138", flexShrink: 0 }}
            />
            <span className="profile-label">
              <span className="profile-name">{userDetails.firstName} {userDetails.lastName}</span>
              <span className="profile-role">{userDetails.role?.[0]}</span>
            </span>
            <CrownOutlined className="profile-chevron" />
          </button>
        </Dropdown>
      </div>
    </header>
  );
};

export default HeaderBar;