import React, { createContext, useContext, useEffect, useState } from "react";
import { ConfigProvider } from "antd";
import { getAntdTheme } from "../style/AntDesignThemeConfig";

type Theme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const THEME_KEY = "app_theme";

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const getInitial = (): Theme => {
    try {
      const stored = localStorage.getItem(THEME_KEY) as Theme | null;
      if (stored === "light" || stored === "dark") return stored;
    } catch (e) {}
    if (typeof window !== "undefined" && window.matchMedia) {
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    return "light";
  };

  const [theme, setThemeState] = useState<Theme>(getInitial);

  useEffect(() => {
    const htmlCls = document.documentElement.classList;
    const bodyCls = document.body.classList;
    if (theme === "dark") {
      htmlCls.add("dark");
      bodyCls.add("dark");
    } else {
      htmlCls.remove("dark");
      bodyCls.remove("dark");
    }
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch (e) {}
  }, [theme]);

  const toggleTheme = () => setThemeState((t) => (t === "dark" ? "light" : "dark"));
  const setTheme = (t: Theme) => setThemeState(t);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      <ConfigProvider theme={getAntdTheme(theme)}>
        {children}
      </ConfigProvider>
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
};

export default ThemeProvider;
