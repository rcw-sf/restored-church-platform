import App from "@/App.tsx";
import Finance from "@/pages/Finance.tsx";
// import Home from "@/pages/Home.tsx";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter } from "react-router";
import { RouterProvider } from "react-router/dom";

const router = createBrowserRouter([
  {
    path: "/",
    Component: App,
    children: [
      {
        index: true,
        path: "/finance",
        Component: Finance,
      },
    ],
  },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <div className="min-h-screen w-full">
      <RouterProvider router={router} />
    </div>
  </StrictMode>,
);
