// import AppRouter from "../router/AppRouter";
import React from "react";
import { BrowserRouter } from "react-router-dom";
import AppRouter from "../router/AppRouter";
const App = () => {
  return (
    <>
      <BrowserRouter>
        <AppRouter />
      </BrowserRouter>
    </>
  );
};

export default App;
