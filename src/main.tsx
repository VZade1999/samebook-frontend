import React from "react";
import ReactDOM from "react-dom/client";
import App from "./app/App";
import { Provider } from "react-redux";
import store from "./app/store";
// Side-effect only: attaches the 401-refresh interceptor to the shared
// apiClient singleton once, at app startup. Deliberately not imported from
// api/axios.ts consumers (module instance.ts files) — this module itself
// depends on the redux store, and the store's sagas transitively import
// those instance.ts files, so importing interceptors.ts from them would be
// a circular import
import "./api/interceptors";
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
