import React from "react";
import { Switch, Tooltip } from "antd";
import { SunOutlined, MoonOutlined } from "@ant-design/icons";
import { useTheme } from "@/theme/ThemeProvider";

const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <Tooltip title={theme === "dark" ? "Switch to light" : "Switch to dark"}>
      <Switch
        checkedChildren={<MoonOutlined />}
        unCheckedChildren={<SunOutlined />}
        checked={theme === "dark"}
        onChange={toggleTheme}
      />
    </Tooltip>
  );
};

export default ThemeToggle;
