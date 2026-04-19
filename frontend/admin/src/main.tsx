import App from "@/App";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Finance from "@/pages/Finance";
import Home from "@/pages/Home";
import { AuthProvider } from "@/providers/AuthProvider";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter } from "react-router";
import { RouterProvider } from "react-router/dom";

const router = createBrowserRouter([
  {
    path: "/",
    Component: App,
    children: [
      // Protected Routes
      {
        element: <ProtectedRoute />,
        children: [
          {
            index: true,
            path: "/home", // CHANGE LATER
            Component: Home,
          },
        ],
      },
      // Public Routes
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
    <AuthProvider>
      <div className="min-h-screen w-full">
        <RouterProvider router={router} />
      </div>
    </AuthProvider>
  </StrictMode>,
);
