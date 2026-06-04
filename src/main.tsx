import React from "react";
import ReactDOM from "react-dom/client";
import App from "./app/App";
import { Provider } from "react-redux";
import store from "./app/store";
import { ConfigProvider } from "antd";
import DebtorThemeConfig from "./style/AntDesignThemeConfig";
import "./index.css";
ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ConfigProvider theme={{ ...DebtorThemeConfig }}>
      <Provider store={store}>
        <App />
      </Provider>
    </ConfigProvider>{" "}
  </React.StrictMode>
);
