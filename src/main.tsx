import React from "react";
import ReactDOM from "react-dom/client";
import App from "./app/App";
import { Provider } from "react-redux";
import store from "./app/store";
import "./index.css";
import ThemeProvider from "./theme/ThemeProvider";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider>
      <Provider store={store}>
        <App />
      </Provider>
    </ThemeProvider>
  </React.StrictMode>
);
