import { Layout, Dropdown, Avatar, Space } from "antd";
import React from "react";
import { UserOutlined, LogoutOutlined } from "@ant-design/icons";

import { useDispatch } from "react-redux";

import { logout } from "../../modules/auth/redux/authActions";

import { StorageService } from "@/storage";

const { Header } = Layout;

const HeaderBar = () => {
  const dispatch = useDispatch();
  const storageService = new StorageService();

  const handleLogout = () => {
    dispatch(logout());
  };

  const items = [
    {
      key: "logout",
      icon: <LogoutOutlined />,
      label: "Logout",
      onClick: handleLogout,
    },
  ];

  const companyName = JSON.parse(
    storageService.getItem(StorageService.STORAGE_KEYS.COMPANY_DETAILS)
  );

  return (
    <Header className="dashboard-header">
      <span>{companyName?.name}</span>
      <div />
      <Dropdown menu={{ items }} placement="bottomRight">
        <Space className="profile-section">
          <Avatar icon={<UserOutlined />} />
          Admin
        </Space>
      </Dropdown>
    </Header>
  );
};

export default HeaderBar;
